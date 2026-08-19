import type { Battle, BattlePage, BattleType } from './agentduel-api.js'

export interface HistoryQuery {
  battleTypes: BattleType[]
  challengeRoles: Array<'challenger' | 'target'>
  results: Array<'win' | 'loss'>
  cursor?: string | null
  limit?: number
}

interface HistoryStream {
  publicId: string
  buffer: Battle[]
  nextCursor: string | null
}

interface HistorySession {
  ownedPublicIds: ReadonlySet<string>
  query: Omit<HistoryQuery, 'cursor' | 'limit'>
  seenBattleIds: Set<string>
  streams: HistoryStream[]
}

export type HistoryLoader = (
  publicId: string,
  cursor: string | null,
  battleType: BattleType | undefined
) => Promise<BattlePage>

export class MergedBattleHistory {
  private readonly sessions = new Map<string, HistorySession>()
  private tokenSequence = 0

  constructor(
    private readonly ownedPublicIds: readonly string[],
    private readonly loadHistory: HistoryLoader
  ) {}

  async load(query: HistoryQuery): Promise<BattlePage> {
    const limit = Math.max(1, query.limit ?? 20)
    let session: HistorySession

    if (query.cursor) {
      const existing = this.sessions.get(query.cursor)
      if (!existing) return { battles: [], next_cursor: null }
      this.sessions.delete(query.cursor)
      session = existing
    } else {
      this.sessions.clear()
      const battleType = query.battleTypes.length === 1 ? query.battleTypes[0] : undefined
      const pages = await Promise.all(this.ownedPublicIds.map(async (publicId): Promise<HistoryStream> => {
        const page = await this.loadHistory(publicId, null, battleType)
        return {
          publicId,
          buffer: sortBattles(page.battles),
          nextCursor: page.next_cursor
        }
      }))
      session = {
        ownedPublicIds: new Set(this.ownedPublicIds),
        query: {
          battleTypes: [...query.battleTypes],
          challengeRoles: [...query.challengeRoles],
          results: [...query.results]
        },
        seenBattleIds: new Set(),
        streams: pages
      }
    }

    const battles: Battle[] = []
    while (battles.length < limit) {
      await this.refillEmptyStreams(session)
      const stream = newestStream(session.streams)
      const battle = stream?.buffer.shift()
      if (!battle) break
      if (session.seenBattleIds.has(battle.public_id)) continue
      session.seenBattleIds.add(battle.public_id)
      if (matchesFilters(battle, session)) battles.push(battle)
    }

    const hasMore = session.streams.some((stream) => stream.buffer.length > 0 || stream.nextCursor !== null)
    if (!hasMore) return { battles, next_cursor: null }

    const token = this.createToken()
    this.sessions.set(token, session)
    return { battles, next_cursor: token }
  }

  clear(): void {
    this.sessions.clear()
  }

  private async refillEmptyStreams(session: HistorySession): Promise<void> {
    const battleType = session.query.battleTypes.length === 1 ? session.query.battleTypes[0] : undefined
    await Promise.all(session.streams.map(async (stream) => {
      if (stream.buffer.length > 0 || stream.nextCursor === null) return
      const page = await this.loadHistory(stream.publicId, stream.nextCursor, battleType)
      stream.buffer = sortBattles(page.battles)
      stream.nextCursor = page.next_cursor
    }))
  }

  private createToken(): string {
    this.tokenSequence += 1
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${this.tokenSequence}`
    return `agentduel-history-${randomPart}`
  }
}

function newestStream(streams: HistoryStream[]): HistoryStream | undefined {
  return streams
    .filter((stream) => stream.buffer.length > 0)
    .sort((left, right) => compareBattles(left.buffer[0], right.buffer[0]))[0]
}

function sortBattles(battles: Battle[]): Battle[] {
  return [...battles].sort(compareBattles)
}

function compareBattles(left: Battle | undefined, right: Battle | undefined): number {
  if (!left) return 1
  if (!right) return -1
  const dateOrder = Date.parse(right.created_at) - Date.parse(left.created_at)
  return dateOrder !== 0 ? dateOrder : left.public_id.localeCompare(right.public_id)
}

function matchesFilters(battle: Battle, session: HistorySession): boolean {
  if (session.query.battleTypes.length > 0 && !session.query.battleTypes.includes(battle.battle_type)) return false
  if (
    session.query.challengeRoles.length > 0
    && (!battle.challenge_role || !session.query.challengeRoles.includes(battle.challenge_role))
  ) return false

  if (session.query.results.length === 0) return true
  const own = battle.participants.find((participant) => session.ownedPublicIds.has(participant.public_id))
  if (!own || battle.winner_side === null || battle.winner_side === 'draw') return false
  const result = battle.winner_side === own.side ? 'win' : 'loss'
  return session.query.results.includes(result)
}
