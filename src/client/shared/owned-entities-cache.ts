import {
  fetchCharacters,
  fetchTeams,
  isInvalidAppKey,
  type BattleStatus,
  type Character,
  type Team
} from '../api/client.js'

export const OWNED_ENTITIES_CACHE_TTL_MS = 2 * 60 * 1000

interface CacheEntry<T> {
  key: string | null
  value: T | null
  expiresAt: number
  pending: PendingRequest<T> | null
}

interface PendingRequest<T> {
  controller: AbortController
  promise: Promise<T>
}

export interface OwnedEntitiesCache {
  setAppKey: (appKey: string | null) => void
  peekCharacters: (appKey: string) => Character[] | null
  peekTeams: (appKey: string) => Team[] | null
  getCharacters: (appKey: string, signal?: AbortSignal) => Promise<Character[]>
  getTeams: (appKey: string, signal?: AbortSignal) => Promise<Team[]>
  prefetchAll: (appKey: string) => void
  refreshAll: (appKey: string) => void
  dispose: () => void
}

interface AppKeySource {
  getSnapshot: () => { appKey: string | null }
  subscribe: (listener: () => void) => () => void
}

export function bindOwnedEntitiesCache(
  cache: Pick<OwnedEntitiesCache, 'setAppKey' | 'dispose'>,
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

export async function refreshOwnedEntitiesAfterSuccess<T>(
  cache: Pick<OwnedEntitiesCache, 'refreshAll'>,
  appKey: string,
  operation: () => Promise<T>
): Promise<T> {
  const value = await operation()
  try {
    cache.refreshAll(appKey)
  } catch {
    // 写操作已经成功，缓存生命周期变化不能把它改判为失败。
  }
  return value
}

export function refreshOwnedEntitiesAfterCompletedBattle(
  cache: Pick<OwnedEntitiesCache, 'refreshAll'>,
  appKey: string,
  status: BattleStatus
): void {
  if (status !== 'done') return
  try {
    cache.refreshAll(appKey)
  } catch {
    // 页面可能在战斗完成的同时因 Key 变化而卸载。
  }
}

interface OwnedEntitiesCacheOptions {
  ttlMs?: number
  now?: () => number
  loadCharacters?: (appKey: string, signal: AbortSignal) => Promise<Character[]>
  loadTeams?: (appKey: string, signal: AbortSignal) => Promise<Team[]>
  onUnauthorized?: () => void
}

export function createOwnedEntitiesCache(options: OwnedEntitiesCacheOptions = {}): OwnedEntitiesCache {
  const ttlMs = options.ttlMs ?? OWNED_ENTITIES_CACHE_TTL_MS
  const now = options.now ?? Date.now
  const loadCharacters = options.loadCharacters ?? fetchCharacters
  const loadTeams = options.loadTeams ?? fetchTeams
  const onUnauthorized = options.onUnauthorized ?? (() => {})
  const characters = createEntry<Character[]>()
  const teams = createEntry<Team[]>()
  let activeAppKey: string | null = null
  let unauthorizedAppKey: string | null = null
  let generation = 0
  let disposed = false

  const clear = (): void => {
    generation += 1
    clearEntry(characters)
    clearEntry(teams)
  }
  const requireActiveKey = (appKey: string): void => {
    if (disposed) throw abortError('角色与团队缓存已释放')
    if (activeAppKey !== appKey) throw abortError('App Key 已变更')
  }
  const peekEntry = <T>(entry: CacheEntry<T>, appKey: string): T | null => {
    if (disposed || activeAppKey !== appKey || entry.value === null || now() >= entry.expiresAt) return null
    return entry.value
  }
  const observe = <T>(promise: Promise<T>, appKey: string): void => {
    void promise.catch((error: unknown) => {
      if (activeAppKey === appKey && unauthorizedAppKey !== appKey && isInvalidAppKey(error)) {
        unauthorizedAppKey = appKey
        onUnauthorized()
      }
    })
  }
  const loadEntry = <T>(
    entry: CacheEntry<T>,
    appKey: string,
    loader: (key: string, signal: AbortSignal) => Promise<T>,
    entryKey: string
  ): Promise<T> => {
    if (entry.key !== entryKey) {
      clearEntry(entry)
      entry.key = entryKey
    }
    if (entry.value !== null && now() < entry.expiresAt) return Promise.resolve(entry.value)
    if (entry.pending !== null) return entry.pending.promise

    const requestGeneration = generation
    const controller = new AbortController()
    let promise: Promise<T>
    promise = Promise.resolve()
      .then(async () => await loader(appKey, controller.signal))
      .then(
        (value) => {
          if (
            !disposed
            && activeAppKey === appKey
            && generation === requestGeneration
            && entry.pending?.promise === promise
          ) {
            entry.value = value
            entry.expiresAt = now() + ttlMs
            entry.pending = null
          }
          return value
        },
        (error: unknown) => {
          if (entry.pending?.promise === promise) entry.pending = null
          throw error
        }
      )
    entry.pending = { controller, promise }
    observe(promise, appKey)
    return promise
  }
  const ensureAll = (appKey: string): { characters: Promise<Character[]>; teams: Promise<Team[]> } => {
    requireActiveKey(appKey)
    return {
      characters: loadEntry(characters, appKey, loadCharacters, 'characters'),
      teams: loadEntry(teams, appKey, loadTeams, 'teams')
    }
  }
  const prefetch = (appKey: string): void => {
    const requests = ensureAll(appKey)
    observe(requests.characters, appKey)
    observe(requests.teams, appKey)
  }

  return {
    setAppKey(appKey) {
      if (disposed || activeAppKey === appKey) return
      clear()
      activeAppKey = appKey
      unauthorizedAppKey = null
    },
    peekCharacters: appKey => peekEntry(characters, appKey),
    peekTeams: appKey => peekEntry(teams, appKey),
    async getCharacters(appKey, signal) {
      const requests = ensureAll(appKey)
      return await waitForRequest(requests.characters, signal)
    },
    async getTeams(appKey, signal) {
      const requests = ensureAll(appKey)
      return await waitForRequest(requests.teams, signal)
    },
    prefetchAll(appKey) {
      prefetch(appKey)
    },
    refreshAll(appKey) {
      requireActiveKey(appKey)
      clear()
      prefetch(appKey)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clear()
      activeAppKey = null
      unauthorizedAppKey = null
    }
  }
}

function createEntry<T>(): CacheEntry<T> {
  return { key: null, value: null, expiresAt: 0, pending: null }
}

function clearEntry<T>(entry: CacheEntry<T>): void {
  entry.pending?.controller.abort()
  entry.value = null
  entry.expiresAt = 0
  entry.pending = null
  entry.key = null
}

async function waitForRequest<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return await promise
  if (signal.aborted) throw abortError('请求已取消')
  return await new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(abortError('请求已取消'))
    }
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
