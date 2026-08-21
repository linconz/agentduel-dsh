import {
  fetchAccountBattleHistory,
  isInvalidAppKey,
  type BattleChallengeRole,
  type BattlePage,
  type BattleResult,
  type BattleStatus,
  type BattleType,
  type GameModeId
} from '../api/client.js'

export const RECENT_BATTLES_CACHE_TTL_MS = 2 * 60 * 1000

export interface RecentBattlesQuery {
  battleTypes: readonly BattleType[]
  challengeRoles: readonly BattleChallengeRole[]
  results: readonly BattleResult[]
  cursor?: string | null
  limit?: number
}

interface CacheEntry {
  mode: GameModeId
  value: BattlePage | null
  expiresAt: number
  pending: PendingRequest | null
}

interface PendingRequest {
  controller: AbortController
  promise: Promise<BattlePage>
}

export interface RecentBattlesCache {
  setAppKey: (appKey: string | null) => void
  getBattlePage: (
    appKey: string,
    mode: GameModeId,
    query: RecentBattlesQuery,
    signal?: AbortSignal
  ) => Promise<BattlePage>
  clear: (appKey: string) => void
  refreshDefault: (appKey: string, mode: GameModeId) => void
  dispose: () => void
}

interface AppKeySource {
  getSnapshot: () => { appKey: string | null }
  subscribe: (listener: () => void) => () => void
}

interface RecentBattlesCacheOptions {
  ttlMs?: number
  now?: () => number
  loadBattlePage?: (
    appKey: string,
    mode: GameModeId,
    query: RecentBattlesQuery,
    signal: AbortSignal
  ) => Promise<BattlePage>
  onUnauthorized?: () => void
}

const DEFAULT_QUERY: RecentBattlesQuery = {
  battleTypes: [],
  challengeRoles: [],
  results: [],
  limit: 20
}

export function createRecentBattlesCache(options: RecentBattlesCacheOptions = {}): RecentBattlesCache {
  const ttlMs = options.ttlMs ?? RECENT_BATTLES_CACHE_TTL_MS
  const now = options.now ?? Date.now
  const loadBattlePage = options.loadBattlePage ?? loadAccountBattlePage
  const onUnauthorized = options.onUnauthorized ?? (() => {})
  const entries = new Map<string, CacheEntry>()
  let activeAppKey: string | null = null
  let disposed = false

  const requireActiveKey = (appKey: string): void => {
    if (disposed) throw abortError('最近战斗缓存已释放')
    if (activeAppKey !== appKey) throw abortError('App Key 已变更')
  }
  const clearEntries = (mode?: GameModeId): void => {
    for (const [key, entry] of entries) {
      if (mode !== undefined && entry.mode !== mode) continue
      entry.pending?.controller.abort()
      entries.delete(key)
    }
  }
  const invalidateEntries = (mode?: GameModeId): void => {
    for (const entry of entries.values()) {
      if (mode !== undefined && entry.mode !== mode) continue
      entry.pending?.controller.abort()
      entry.pending = null
      entry.expiresAt = 0
    }
  }
  const observe = (promise: Promise<BattlePage>, appKey: string): void => {
    void promise.catch((error: unknown) => {
      if (activeAppKey === appKey && isInvalidAppKey(error)) onUnauthorized()
    })
  }
  const loadEntry = (
    appKey: string,
    mode: GameModeId,
    query: RecentBattlesQuery,
    key: string,
    entry: CacheEntry
  ): Promise<BattlePage> => {
    const controller = new AbortController()
    let promise: Promise<BattlePage>
    promise = Promise.resolve()
      .then(async () => await loadBattlePage(appKey, mode, normalizeQuery(query), controller.signal))
      .then(
        (page) => {
          if (!disposed && activeAppKey === appKey && entries.get(key) === entry && entry.pending?.promise === promise) {
            entry.value = page
            entry.expiresAt = now() + ttlMs
            entry.pending = null
          }
          return page
        },
        (error: unknown) => {
          if (entries.get(key) === entry && entry.pending?.promise === promise) entry.pending = null
          throw error
        }
      )
    entry.pending = { controller, promise }
    entries.set(key, entry)
    observe(promise, appKey)
    return promise
  }
  const getOrLoad = (appKey: string, mode: GameModeId, query: RecentBattlesQuery): Promise<BattlePage> => {
    requireActiveKey(appKey)
    const key = cacheKey(mode, query)
    const existing = entries.get(key)
    if (existing !== undefined) {
      if (existing.value !== null) {
        if (now() >= existing.expiresAt && existing.pending === null) {
          loadEntry(appKey, mode, query, key, existing)
        }
        return Promise.resolve(existing.value)
      }
      if (existing.pending !== null) return existing.pending.promise
    }

    const entry = existing ?? { mode, value: null, expiresAt: 0, pending: null }
    return loadEntry(appKey, mode, query, key, entry)
  }

  return {
    setAppKey(appKey) {
      if (disposed || activeAppKey === appKey) return
      clearEntries()
      activeAppKey = appKey
    },
    async getBattlePage(appKey, mode, query, signal) {
      return await waitForRequest(getOrLoad(appKey, mode, query), signal)
    },
    clear(appKey) {
      if (disposed || activeAppKey !== appKey) return
      invalidateEntries()
    },
    refreshDefault(appKey, mode) {
      if (disposed || activeAppKey !== appKey) return
      const key = cacheKey(mode, DEFAULT_QUERY)
      const entry = entries.get(key) ?? { mode, value: null, expiresAt: 0, pending: null }
      entry.pending?.controller.abort()
      entry.pending = null
      entry.expiresAt = 0
      loadEntry(appKey, mode, DEFAULT_QUERY, key, entry)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clearEntries()
      activeAppKey = null
    }
  }
}

export function bindRecentBattlesCache(
  cache: Pick<RecentBattlesCache, 'setAppKey' | 'dispose'>,
  source: AppKeySource
): () => void {
  let activeAppKey: string | null | undefined
  const syncAppKey = (): void => {
    const appKey = source.getSnapshot().appKey
    if (appKey === activeAppKey) return
    activeAppKey = appKey
    cache.setAppKey(appKey)
  }
  const unsubscribe = source.subscribe(syncAppKey)
  syncAppKey()
  return () => {
    unsubscribe()
    cache.dispose()
  }
}

export async function clearRecentBattlesAfterSuccess<T>(
  cache: Pick<RecentBattlesCache, 'clear'>,
  appKey: string,
  operation: () => Promise<T>
): Promise<T> {
  const value = await operation()
  cache.clear(appKey)
  return value
}

export function refreshRecentBattlesAfterCompletedBattle(
  cache: Pick<RecentBattlesCache, 'refreshDefault'>,
  appKey: string,
  mode: GameModeId,
  status: BattleStatus
): void {
  if (status === 'done') cache.refreshDefault(appKey, mode)
}

function cacheKey(mode: GameModeId, query: RecentBattlesQuery): string {
  return JSON.stringify([
    mode,
    query.cursor ?? null,
    query.limit ?? 20,
    [...query.battleTypes].sort(),
    [...query.challengeRoles].sort(),
    [...query.results].sort()
  ])
}

function normalizeQuery(query: RecentBattlesQuery): RecentBattlesQuery {
  return {
    cursor: query.cursor,
    limit: query.limit ?? 20,
    battleTypes: query.battleTypes,
    challengeRoles: query.challengeRoles,
    results: query.results
  }
}

async function loadAccountBattlePage(
  appKey: string,
  mode: GameModeId,
  query: RecentBattlesQuery,
  signal: AbortSignal
): Promise<BattlePage> {
  return await fetchAccountBattleHistory(appKey, {
    cursor: query.cursor,
    limit: query.limit ?? 20,
    battleTypes: query.battleTypes,
    gameModeIds: [mode],
    results: query.results,
    challengeRoles: query.challengeRoles
  }, signal)
}

async function waitForRequest<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return await promise
  if (signal.aborted) throw abortError('请求已取消')
  return await new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortError('请求已取消'))
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}

function abortError(message: string): DOMException {
  return new DOMException(message, 'AbortError')
}
