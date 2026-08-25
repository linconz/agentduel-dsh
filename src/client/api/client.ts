import type { NormalizedReplayResult } from '@agentduel/replay-player'
import { normalizeReplayResult } from '@agentduel/replay-player'

export const API_BASE_URL = 'https://api.agentduel.app'
export const WEBSITE_BASE_URL = 'https://www.agentduel.app'
export const CONFIGURATION_SLOT_LIMIT = 10
export const AGENTDUEL_TYPE = 'dsh'
export const AGENTDUEL_PLUGIN_VERSION = '0.1.4'

export type CharacterClassId = 'warrior' | 'mage' | 'hunter'
export type ContentStatus = 'active' | 'name_violation' | 'description_violation' | 'all_violation' | 'suspended'
export type GameModeId = 'deathmatch' | 'captureTheFlag'
export type BattleType = 'practice' | 'ranked'
export type IntegrationLocale = 'zh-CN' | 'en-US'
export type BattleStatus = 'pending' | 'running' | 'done' | 'error' | 'canceled'
export type BattleResult = 'win' | 'loss'
export type BattleChallengeRole = 'challenger' | 'target'

export interface ContentRemediationSummary {
  violation_type: 'name_violation' | 'description_violation' | 'all_violation'
  marked_at: string
  submitted_at: string | null
}

export interface PublicBadge {
  key: string
  category: string
  name: string
  description: string
  icon_svg: string | null
  icon_url: string | null
  awarded_at: string
}

export interface OwnedPublicBadge extends PublicBadge {
  is_hidden: boolean
}

export interface BadgeDisplaySettings {
  equipped_badge_keys: string[]
  hidden_badge_keys: string[]
}

export interface Character {
  public_id: string
  slot_no: number
  name: string
  description: string | null
  status: ContentStatus
  remediation: ContentRemediationSummary | null
  class_id: CharacterClassId
  api_key: string
  code_source: 'default' | 'custom'
  ranked_rating: number
  ranked_matches: number
  ranked_wins: number
  ranked_losses: number
  ranked_draws: number
  created_at: string
  updated_at: string
}

export interface OwnedCharacter extends Character {
  badges: OwnedPublicBadge[]
}

export interface PublicCharacterProfile {
  name: string
  description: string | null
  class_id: CharacterClassId
  ranked_rating: number
  ranked_wins: number
  ranked_draws: number
  ranked_losses: number
  badges: PublicBadge[]
  character_version: VersionSummary | null
}

export interface TeamUnit {
  slot_no: number
  class_id: CharacterClassId
}

export type DashboardSubmissionStatus = 'pending_compile' | 'compiling' | 'compiled' | 'compile_failed' | 'rejected'

export interface DashboardActiveCodeSummary {
  version_no: number
  ai_model: string | null
  agent_contract_version: string
}

export interface DashboardLatestSubmissionSummary {
  version_no: number
  status: DashboardSubmissionStatus
}

export interface DashboardRankedResults {
  wins: number
  draws: number
  losses: number
}

export interface DashboardBattleCounts {
  practice: number
  ranked: number
}

export interface DashboardBattleReadiness {
  practice: {
    can_request: boolean
    blocking_reason: 'active_battle' | 'team_code_required' | 'compiling' | 'content_restricted' | null
  }
  ranked: {
    can_request: boolean
    blocking_reason: 'active_battle' | 'team_code_required' | 'compiling' | 'content_restricted' | null
  }
}

export interface DashboardCharacterSummary {
  public_id: string
  slot_no: number
  name: string
  status?: ContentStatus
  class_id: CharacterClassId
  code_source: 'default' | 'custom'
  created_at: string
  active_code: DashboardActiveCodeSummary | null
  ranked_rating: number
  battle_counts: DashboardBattleCounts
  ranked_results: DashboardRankedResults
  latest_submission: DashboardLatestSubmissionSummary | null
  battle_readiness: DashboardBattleReadiness
}

export interface DashboardTeamSummary {
  public_id: string
  slot_no: number
  name: string
  status?: ContentStatus
  units: TeamUnit[]
  code_source: 'none' | 'custom'
  created_at: string
  active_code: DashboardActiveCodeSummary | null
  ranked_rating: number
  battle_counts: DashboardBattleCounts
  ranked_results: DashboardRankedResults
  latest_submission: DashboardLatestSubmissionSummary | null
  battle_readiness: DashboardBattleReadiness
}

export interface DashboardSummary {
  user: {
    public_id: string
  }
  characters: DashboardCharacterSummary[]
  teams: DashboardTeamSummary[]
}

export interface Team {
  public_id: string
  slot_no: number
  name: string
  description: string | null
  status: ContentStatus
  remediation: ContentRemediationSummary | null
  logo_url: string | null
  units: TeamUnit[]
  api_key: string
  code_source: 'none' | 'custom'
  ranked_rating: number
  ranked_matches: number
  ranked_wins: number
  ranked_losses: number
  ranked_draws: number
  created_at: string
  updated_at: string
}

export interface OwnedTeam extends Team {
  badges: OwnedPublicBadge[]
}

export interface PublicTeamProfile {
  name: string
  description: string | null
  ranked_rating: number
  ranked_wins: number
  ranked_draws: number
  ranked_losses: number
  badges: PublicBadge[]
  units: TeamUnit[]
  team_version: VersionSummary | null
}

export interface VersionSummary {
  version_no: number
  ai_model: string | null
  change_summary: string | null
}

export interface BattleMap {
  map_id: string
  name_key: string
  width: number
  height: number
  asset_path: string
  min_agent_contract_version: string
  participant_agent_contract_version: string | null
  is_enabled: boolean
  is_compatible: boolean | null
  is_random_eligible: boolean
}

export interface CharacterBattleParticipant {
  side: 'red' | 'blue'
  kind: 'character'
  public_id: string
  name: string
  description: string | null
  name_redacted?: boolean
  description_redacted?: boolean
  class_id: CharacterClassId
  code_source: 'default' | 'custom'
  ai_model: string | null
  rating_before: number | null
  rating_after: number | null
  rating_delta: number | null
  k_factor: 16 | 24 | 40 | null
  agent_contract_version?: string
}

export interface TeamBattleParticipant {
  side: 'red' | 'blue'
  kind: 'team'
  public_id: string
  name: string
  description: string | null
  name_redacted?: boolean
  description_redacted?: boolean
  units: TeamUnit[]
  code_source: 'default' | 'custom'
  ai_model: string | null
  rating_before: number | null
  rating_after: number | null
  rating_delta: number | null
  k_factor: 16 | 24 | 40 | null
  agent_contract_version?: string
}

export type BattleParticipant = CharacterBattleParticipant | TeamBattleParticipant

export interface Battle {
  public_id: string
  share_path: string | null
  purpose: 'pvp'
  battle_type: BattleType
  match_source?: 'practice_random' | 'direct_challenge' | 'ranked_matchmaking'
  viewer_match_role?: 'initiator' | 'matched' | null
  challenge_role?: 'challenger' | 'target' | null
  can_revenge?: boolean
  can_start_again?: boolean
  revenge_target?: { public_id: string; name: string } | null
  game_mode_id: GameModeId
  map_id: string
  map_asset_path?: string
  status: BattleStatus
  seed: string
  participants: BattleParticipant[]
  winner_side: 'red' | 'blue' | 'draw' | null
  finish_reason: string | null
  red_duration_ms: number | null
  blue_duration_ms: number | null
  engine_version: string | null
  replay_available: boolean
  replay_url?: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface BattlePage {
  battles: Battle[]
  next_cursor: string | null
}

export interface RecentRankedReplayBattle {
  battle_public_id: string
  game_mode_id: GameModeId
}

export interface PublicBattleReviewContext {
  share_path: string
  replay_url: string | null
  map_snapshot: {
    terrain_rows: string[]
  }
}

export interface BattleTarget {
  public_id: string
  name: string
}

export class AgentDuelIntegrationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
    public readonly retryAfterSeconds: number | null = null
  ) {
    super(message)
    this.name = 'AgentDuelIntegrationError'
  }
}

interface RequestOptions extends Omit<RequestInit, 'credentials' | 'headers'> {
  headers?: HeadersInit
  locale?: IntegrationLocale
  turnstileToken?: string
  retryGet?: boolean
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

const GET_RETRY_DELAYS_MS = [250, 750] as const

export async function agentDuelRequest<T>(
  appKey: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { locale = 'zh-CN', retryGet = true, turnstileToken, ...requestInit } = options
  const method = requestInit.method ?? 'GET'
  const mayRetry = method === 'GET' && retryGet

  for (let attempt = 0; ; attempt += 1) {
    try {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      headers.set('Accept-Language', locale)
      if (path.startsWith('/api/integrations')) {
        headers.set('AgentDuel-Type', AGENTDUEL_TYPE)
        headers.set('AgentDuel-Plugin-Version', AGENTDUEL_PLUGIN_VERSION)
      } else {
        headers.delete('AgentDuel-Type')
        headers.delete('AgentDuel-Plugin-Version')
      }
      headers.set('Authorization', `Bearer ${appKey}`)
      if (requestInit.body !== undefined) headers.set('Content-Type', 'application/json')
      if (turnstileToken !== undefined) headers.set('X-Turnstile-Token', turnstileToken)

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestInit,
        method,
        credentials: 'omit',
        headers
      })
      const body = await readJson(response)

      if (!response.ok) {
        if (mayRetry && response.status >= 500 && attempt < GET_RETRY_DELAYS_MS.length) {
          await abortableDelay(GET_RETRY_DELAYS_MS[attempt] ?? 750, requestInit.signal ?? undefined)
          continue
        }
        const error = body as ApiErrorBody
        throw new AgentDuelIntegrationError(
          response.status,
          error.error?.code ?? null,
          error.error?.message ?? `AgentDuel 请求失败（${response.status}）`,
          parseRetryAfter(response.headers.get('Retry-After'))
        )
      }

      return body as T
    } catch (error) {
      if (requestInit.signal?.aborted) throw error
      if (
        mayRetry
        && !(error instanceof AgentDuelIntegrationError)
        && attempt < GET_RETRY_DELAYS_MS.length
      ) {
        await abortableDelay(GET_RETRY_DELAYS_MS[attempt] ?? 750, requestInit.signal ?? undefined)
        continue
      }
      throw error
    }
  }
}

export async function fetchCharacters(appKey: string, signal?: AbortSignal): Promise<Character[]> {
  const data = await agentDuelRequest<{ characters: Character[] }>(
    appKey,
    '/api/integrations/characters',
    { signal }
  )
  return [...data.characters].sort((left, right) => left.slot_no - right.slot_no)
}

export async function fetchDashboardSummary(
  appKey: string,
  locale: IntegrationLocale,
  signal?: AbortSignal
): Promise<DashboardSummary> {
  return await agentDuelRequest<DashboardSummary>(
    appKey,
    '/api/integrations/dashboard/summary',
    { locale, signal }
  )
}

export async function fetchTeams(appKey: string, signal?: AbortSignal): Promise<Team[]> {
  const data = await agentDuelRequest<{ teams: Team[] }>(appKey, '/api/integrations/teams', { signal })
  return [...data.teams].sort((left, right) => left.slot_no - right.slot_no)
}

export async function fetchClasses(appKey: string, signal?: AbortSignal): Promise<Array<{ class_id: CharacterClassId; sort_order: number }>> {
  const data = await agentDuelRequest<{ classes: Array<{ class_id: CharacterClassId; sort_order: number }> }>(
    appKey,
    '/api/integrations/classes',
    { signal }
  )
  return [...data.classes].sort((left, right) => left.sort_order - right.sort_order)
}

export async function fetchPublicCharacterVersion(
  appKey: string,
  publicId: string,
  signal?: AbortSignal
): Promise<VersionSummary | null> {
  const data = await agentDuelRequest<{ character: { character_version: VersionSummary | null } }>(
    appKey,
    `/api/integrations/characters/public/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.character.character_version
}

export async function fetchPublicCharacter(
  appKey: string,
  publicId: string,
  signal?: AbortSignal
): Promise<PublicCharacterProfile> {
  const data = await agentDuelRequest<{ character: PublicCharacterProfile }>(
    appKey,
    `/api/integrations/characters/public/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.character
}

export async function fetchPublicTeamVersion(
  appKey: string,
  publicId: string,
  signal?: AbortSignal
): Promise<VersionSummary | null> {
  const data = await agentDuelRequest<{ team: { team_version: VersionSummary | null } }>(
    appKey,
    `/api/integrations/teams/public/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.team.team_version
}

export async function fetchPublicTeam(
  appKey: string,
  publicId: string,
  signal?: AbortSignal
): Promise<PublicTeamProfile> {
  const data = await agentDuelRequest<{ team: PublicTeamProfile }>(
    appKey,
    `/api/integrations/teams/public/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.team
}

export async function fetchOwnedCharacter(appKey: string, publicId: string, signal?: AbortSignal): Promise<OwnedCharacter> {
  const data = await agentDuelRequest<{ character: OwnedCharacter }>(
    appKey,
    `/api/integrations/characters/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.character
}

export async function fetchOwnedTeam(appKey: string, publicId: string, signal?: AbortSignal): Promise<OwnedTeam> {
  const data = await agentDuelRequest<{ team: OwnedTeam }>(
    appKey,
    `/api/integrations/teams/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.team
}

export async function createCharacter(
  appKey: string,
  input: { name: string; class_id: CharacterClassId },
  turnstileToken: string,
  signal?: AbortSignal
): Promise<Character> {
  const data = await agentDuelRequest<{ character: Character }>(appKey, '/api/integrations/characters', {
    method: 'POST',
    body: JSON.stringify(input),
    turnstileToken,
    signal,
    retryGet: false
  })
  return data.character
}

export async function updateCharacter(
  appKey: string,
  publicId: string,
  input: { name?: string; description?: string },
  turnstileToken: string,
  signal?: AbortSignal
): Promise<Character> {
  const data = await agentDuelRequest<{ character: Character }>(
    appKey,
    `/api/integrations/characters/${encodeURIComponent(publicId)}`,
    { method: 'PATCH', body: JSON.stringify(input), turnstileToken, signal, retryGet: false }
  )
  return data.character
}

export async function updateCharacterBadgeDisplay(
  appKey: string,
  publicId: string,
  input: BadgeDisplaySettings,
  turnstileToken: string,
  signal?: AbortSignal
): Promise<BadgeDisplaySettings> {
  return await agentDuelRequest<BadgeDisplaySettings>(
    appKey,
    `/api/integrations/characters/badge-display/${encodeURIComponent(publicId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
      turnstileToken,
      signal,
      retryGet: false
    }
  )
}

export async function createTeam(
  appKey: string,
  input: { name: string; units: Array<{ class_id: CharacterClassId }> },
  turnstileToken: string,
  signal?: AbortSignal
): Promise<Team> {
  const data = await agentDuelRequest<{ team: Team }>(appKey, '/api/integrations/teams', {
    method: 'POST',
    body: JSON.stringify(input),
    turnstileToken,
    signal,
    retryGet: false
  })
  return data.team
}

export async function updateTeam(
  appKey: string,
  publicId: string,
  input: { name?: string; description?: string },
  turnstileToken: string,
  signal?: AbortSignal
): Promise<Team> {
  const data = await agentDuelRequest<{ team: Team }>(
    appKey,
    `/api/integrations/teams/${encodeURIComponent(publicId)}`,
    { method: 'PATCH', body: JSON.stringify(input), turnstileToken, signal, retryGet: false }
  )
  return data.team
}

export async function updateTeamBadgeDisplay(
  appKey: string,
  publicId: string,
  input: BadgeDisplaySettings,
  turnstileToken: string,
  signal?: AbortSignal
): Promise<BadgeDisplaySettings> {
  return await agentDuelRequest<BadgeDisplaySettings>(
    appKey,
    `/api/integrations/teams/badge-display/${encodeURIComponent(publicId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
      turnstileToken,
      signal,
      retryGet: false
    }
  )
}

export async function fetchMaps(
  appKey: string,
  mode: GameModeId,
  locale: IntegrationLocale,
  signal?: AbortSignal
): Promise<BattleMap[]> {
  const data = await agentDuelRequest<{ maps: BattleMap[] }>(
    appKey,
    `/api/integrations/game-modes/${mode}/maps`,
    { locale, signal }
  )
  return data.maps
}

export async function searchBattleTargets(
  appKey: string,
  mode: GameModeId,
  query: string,
  locale: IntegrationLocale,
  signal?: AbortSignal
): Promise<BattleTarget[]> {
  const params = new URLSearchParams({ q: query.trim() })
  const resource = mode === 'deathmatch' ? 'characters' : 'teams'
  const data = await agentDuelRequest<{ characters?: BattleTarget[]; teams?: BattleTarget[] }>(
    appKey,
    `/api/integrations/${resource}/search?${params.toString()}`,
    { locale, signal }
  )
  return mode === 'deathmatch' ? data.characters ?? [] : data.teams ?? []
}

export function createBattleRequestBody(input: {
  mode: GameModeId
  battleType: BattleType
  challengerPublicId: string
  targetPublicId?: string | null
  revengeOfBattlePublicId?: string | null
  mapId?: string | null
}): Record<string, string> {
  const body: Record<string, string> = {
    battle_type: input.battleType,
    game_mode_id: input.mode
  }
  body[input.mode === 'deathmatch' ? 'challenger_character_public_id' : 'challenger_team_public_id'] = input.challengerPublicId
  if (input.battleType === 'practice') {
    if (input.targetPublicId) {
      body[input.mode === 'deathmatch' ? 'target_character_public_id' : 'target_team_public_id'] = input.targetPublicId
      if (input.revengeOfBattlePublicId) body.revenge_of_battle_public_id = input.revengeOfBattlePublicId
    }
    if (input.mapId) body.map_id = input.mapId
  }
  return body
}

export async function startBattle(
  appKey: string,
  input: Parameters<typeof createBattleRequestBody>[0],
  turnstileToken: string,
  locale: IntegrationLocale,
  signal?: AbortSignal
): Promise<Battle> {
  const data = await agentDuelRequest<{ battle: Battle }>(appKey, '/api/integrations/battles', {
    method: 'POST',
    body: JSON.stringify(createBattleRequestBody(input)),
    turnstileToken,
    locale,
    signal,
    retryGet: false
  })
  return data.battle
}

export async function fetchBattleHistory(
  appKey: string,
  resource: 'characters' | 'teams',
  publicId: string,
  query: { cursor?: string | null; battleType?: BattleType },
  signal?: AbortSignal
): Promise<BattlePage> {
  const params = new URLSearchParams()
  if (query.cursor) params.set('cursor', query.cursor)
  if (query.battleType) params.set('battle_type', query.battleType)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return await agentDuelRequest<BattlePage>(
    appKey,
    `/api/integrations/battles/${resource}/${encodeURIComponent(publicId)}${suffix}`,
    { signal }
  )
}

export async function fetchAccountBattleHistory(
  appKey: string,
  query: {
    cursor?: string | null
    limit?: number
    battleTypes?: readonly BattleType[]
    gameModeIds?: readonly GameModeId[]
    statuses?: readonly BattleStatus[]
    results?: readonly BattleResult[]
    challengeRoles?: readonly BattleChallengeRole[]
  },
  signal?: AbortSignal
): Promise<BattlePage> {
  const params = new URLSearchParams()
  if (query.cursor) params.set('cursor', query.cursor)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  setCsvParam(params, 'battle_type', query.battleTypes)
  setCsvParam(params, 'game_mode_id', query.gameModeIds)
  setCsvParam(params, 'status', query.statuses)
  setCsvParam(params, 'result', query.results)
  setCsvParam(params, 'challenge_role', query.challengeRoles)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return await agentDuelRequest<BattlePage>(
    appKey,
    `/api/integrations/battles${suffix}`,
    { signal }
  )
}

export async function fetchPublicBattleHistory(
  appKey: string,
  resource: 'characters' | 'teams',
  publicId: string,
  query: { cursor?: string | null; battleType?: BattleType },
  signal?: AbortSignal
): Promise<BattlePage> {
  const params = new URLSearchParams()
  if (query.cursor) params.set('cursor', query.cursor)
  if (query.battleType) params.set('battle_type', query.battleType)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return await agentDuelRequest<BattlePage>(
    appKey,
    `/api/integrations/battles/${resource}/public/${encodeURIComponent(publicId)}${suffix}`,
    { signal }
  )
}

export async function fetchRecentRankedReplays(signal?: AbortSignal): Promise<RecentRankedReplayBattle[]> {
  const data = await publicAgentDuelRequest<{ battles: RecentRankedReplayBattle[] }>(
    '/api/battles/recent',
    signal
  )
  return data.battles
}

export async function fetchPublicBattleDetails(publicId: string, signal?: AbortSignal): Promise<Battle> {
  const data = await publicAgentDuelRequest<{ battle: Battle }>(
    `/api/battles/${encodeURIComponent(publicId)}`,
    signal
  )
  return data.battle
}

export async function fetchPublicBattleReviewContext(
  sharePath: string,
  signal?: AbortSignal
): Promise<PublicBattleReviewContext> {
  const normalizedSharePath = new URL(sharePath, WEBSITE_BASE_URL).pathname
  const params = new URLSearchParams({ share_path: normalizedSharePath })
  return await publicAgentDuelRequest<PublicBattleReviewContext>(
    `/api/battles/review-context?${params.toString()}`,
    signal
  )
}

function setCsvParam(
  params: URLSearchParams,
  name: string,
  values: readonly string[] | undefined
): void {
  if (values && values.length > 0) params.set(name, values.join(','))
}

export async function fetchBattleDetails(appKey: string, publicId: string, signal?: AbortSignal): Promise<Battle> {
  const data = await agentDuelRequest<{ battle: Battle }>(
    appKey,
    `/api/integrations/battles/${encodeURIComponent(publicId)}`,
    { signal }
  )
  return data.battle
}

async function publicAgentDuelRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'omit',
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'zh-CN'
    }
  })
  const body = await readJson(response)
  if (!response.ok) {
    const error = body as ApiErrorBody
    throw new AgentDuelIntegrationError(
      response.status,
      error.error?.code ?? null,
      error.error?.message ?? `AgentDuel 请求失败（${response.status}）`,
      parseRetryAfter(response.headers.get('Retry-After'))
    )
  }
  return body as T
}

export async function fetchReplayResult(replayUrl: string, signal?: AbortSignal): Promise<NormalizedReplayResult> {
  const response = await fetch(replayUrl, { credentials: 'omit', signal })
  if (!response.ok) {
    throw new AgentDuelIntegrationError(response.status, null, `回放资源请求失败（${response.status}）`)
  }
  return normalizeReplayResult(await response.json())
}

export function normalizeBattleSharePath(battle: Battle): Battle {
  if (!battle.share_path) return battle
  return {
    ...battle,
    share_path: new URL(battle.share_path, WEBSITE_BASE_URL).toString()
  }
}

export function isInvalidAppKey(error: unknown): boolean {
  return error instanceof AgentDuelIntegrationError
    && error.status === 401
    && error.code === 'INVALID_INTEGRATION_APP_KEY'
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    if (response.ok) throw new AgentDuelIntegrationError(response.status, null, 'AgentDuel 返回了无法解析的数据')
    return {}
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null
}

export async function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError')
  await new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    const onAbort = (): void => {
      globalThis.clearTimeout(timeout)
      reject(new DOMException('请求已取消', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
