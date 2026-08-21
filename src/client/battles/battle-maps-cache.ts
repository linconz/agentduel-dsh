import {
  fetchMaps,
  isInvalidAppKey,
  type BattleMap,
  type IntegrationLocale
} from '../api/client.js'

export const BATTLE_MAPS_CACHE_TTL_MS = 86_400 * 1000

export interface BattleMapCatalogs {
  deathmatch: BattleMap[]
  captureTheFlag: BattleMap[]
}

interface PendingRequest {
  controller: AbortController
  promise: Promise<BattleMapCatalogs>
}

interface AppKeySource {
  getSnapshot: () => { appKey: string | null }
  subscribe: (listener: () => void) => () => void
}

interface BattleMapsCacheOptions {
  ttlMs?: number
  now?: () => number
  loadMaps?: (
    appKey: string,
    locale: IntegrationLocale,
    signal: AbortSignal
  ) => Promise<BattleMapCatalogs>
  onUnauthorized?: () => void
}

export interface BattleMapsCache {
  setAppKey: (appKey: string | null) => void
  peek: (appKey: string) => BattleMapCatalogs | null
  get: (
    appKey: string,
    locale: IntegrationLocale,
    signal?: AbortSignal
  ) => Promise<BattleMapCatalogs>
  dispose: () => void
}

export function createBattleMapsCache(options: BattleMapsCacheOptions = {}): BattleMapsCache {
  const ttlMs = options.ttlMs ?? BATTLE_MAPS_CACHE_TTL_MS
  const now = options.now ?? Date.now
  const loadMaps = options.loadMaps ?? loadBattleMaps
  const onUnauthorized = options.onUnauthorized ?? (() => {})
  let activeAppKey: string | null = null
  let value: BattleMapCatalogs | null = null
  let expiresAt = 0
  let pending: PendingRequest | null = null
  let generation = 0
  let disposed = false

  const clear = (): void => {
    generation += 1
    pending?.controller.abort()
    pending = null
    value = null
    expiresAt = 0
  }
  const requireActiveKey = (appKey: string): void => {
    if (disposed) throw abortError('地图缓存已释放')
    if (activeAppKey !== appKey) throw abortError('App Key 已变更')
  }
  const observe = (promise: Promise<BattleMapCatalogs>, appKey: string): void => {
    void promise.catch((error: unknown) => {
      if (activeAppKey === appKey && isInvalidAppKey(error)) onUnauthorized()
    })
  }
  const load = (appKey: string, locale: IntegrationLocale): Promise<BattleMapCatalogs> => {
    const controller = new AbortController()
    const requestGeneration = generation
    let promise: Promise<BattleMapCatalogs>
    promise = loadMaps(appKey, locale, controller.signal).then(
      (catalogs) => {
        if (
          !disposed
          && activeAppKey === appKey
          && generation === requestGeneration
          && pending?.promise === promise
        ) {
          value = catalogs
          expiresAt = now() + ttlMs
          pending = null
        }
        return catalogs
      },
      (error: unknown) => {
        if (pending?.promise === promise) pending = null
        throw error
      }
    )
    pending = { controller, promise }
    observe(promise, appKey)
    return promise
  }

  return {
    setAppKey(appKey) {
      if (disposed || activeAppKey === appKey) return
      clear()
      activeAppKey = appKey
    },
    peek(appKey) {
      return !disposed && activeAppKey === appKey ? value : null
    },
    async get(appKey, locale, signal) {
      requireActiveKey(appKey)
      if (value !== null) {
        if (now() >= expiresAt && pending === null) load(appKey, locale)
        return value
      }
      if (pending !== null) return await waitForRequest(pending.promise, signal)
      return await waitForRequest(load(appKey, locale), signal)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clear()
      activeAppKey = null
    }
  }
}

export function bindBattleMapsCache(
  cache: Pick<BattleMapsCache, 'setAppKey' | 'dispose'>,
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

async function loadBattleMaps(
  appKey: string,
  locale: IntegrationLocale,
  signal: AbortSignal
): Promise<BattleMapCatalogs> {
  const [deathmatch, captureTheFlag] = await Promise.all([
    fetchMaps(appKey, 'deathmatch', locale, signal),
    fetchMaps(appKey, 'captureTheFlag', locale, signal)
  ])
  return { deathmatch, captureTheFlag }
}

async function waitForRequest<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return await promise
  if (signal.aborted) throw abortError('请求已取消')
  return await new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortError('请求已取消'))
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      (result) => {
        signal.removeEventListener('abort', onAbort)
        resolve(result)
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
