import {
  fetchDashboardSummary,
  isInvalidAppKey,
  type DashboardSummary,
  type IntegrationLocale
} from '../api/client.js'

export const DASHBOARD_SUMMARY_CACHE_TTL_MS = 2 * 60 * 1000

interface PendingRequest {
  controller: AbortController
  promise: Promise<DashboardSummary>
}

interface AppKeySource {
  getSnapshot: () => { appKey: string | null }
  subscribe: (listener: () => void) => () => void
}

interface DashboardSummaryCacheOptions {
  ttlMs?: number
  now?: () => number
  loadSummary?: (
    appKey: string,
    locale: IntegrationLocale,
    signal: AbortSignal
  ) => Promise<DashboardSummary>
  onUnauthorized?: () => void
}

export interface DashboardSummaryCache {
  setAppKey: (appKey: string | null) => void
  subscribe: (listener: () => void) => () => void
  peek: (appKey: string) => DashboardSummary | null
  get: (
    appKey: string,
    locale: IntegrationLocale,
    signal?: AbortSignal
  ) => Promise<DashboardSummary>
  refresh: (appKey: string, locale: IntegrationLocale) => void
  dispose: () => void
}

export function createDashboardSummaryCache(
  options: DashboardSummaryCacheOptions = {}
): DashboardSummaryCache {
  const ttlMs = options.ttlMs ?? DASHBOARD_SUMMARY_CACHE_TTL_MS
  const now = options.now ?? Date.now
  const loadSummary = options.loadSummary ?? fetchDashboardSummary
  const onUnauthorized = options.onUnauthorized ?? (() => {})
  let activeAppKey: string | null = null
  let unauthorizedAppKey: string | null = null
  let value: DashboardSummary | null = null
  let expiresAt = 0
  let pending: PendingRequest | null = null
  let generation = 0
  let disposed = false
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const clear = (): void => {
    generation += 1
    pending?.controller.abort()
    pending = null
    value = null
    expiresAt = 0
    emit()
  }
  const requireActiveKey = (appKey: string): void => {
    if (disposed) throw abortError('Dashboard 摘要缓存已释放')
    if (activeAppKey !== appKey) throw abortError('App Key 已变更')
  }
  const observe = (promise: Promise<DashboardSummary>, appKey: string): void => {
    void promise.catch((error: unknown) => {
      if (activeAppKey === appKey && unauthorizedAppKey !== appKey && isInvalidAppKey(error)) {
        unauthorizedAppKey = appKey
        onUnauthorized()
      }
    })
  }
  const load = (appKey: string, locale: IntegrationLocale): Promise<DashboardSummary> => {
    const controller = new AbortController()
    const requestGeneration = generation
    let promise: Promise<DashboardSummary>
    promise = loadSummary(appKey, locale, controller.signal).then(
      (summary) => {
        if (
          !disposed
          && activeAppKey === appKey
          && generation === requestGeneration
          && pending?.promise === promise
        ) {
          value = summary
          expiresAt = now() + ttlMs
          pending = null
          emit()
        }
        return summary
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
      unauthorizedAppKey = null
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    peek(appKey) {
      if (disposed || activeAppKey !== appKey || value === null) return null
      return value
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
    refresh(appKey, locale) {
      if (disposed || activeAppKey !== appKey) return
      generation += 1
      pending?.controller.abort()
      pending = null
      load(appKey, locale)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clear()
      activeAppKey = null
      unauthorizedAppKey = null
      listeners.clear()
    }
  }
}

export function bindDashboardSummaryCache(
  cache: Pick<DashboardSummaryCache, 'setAppKey' | 'dispose'>,
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
