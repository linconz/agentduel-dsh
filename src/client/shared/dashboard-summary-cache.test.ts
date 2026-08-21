import { describe, expect, it, vi } from 'vitest'
import { AgentDuelIntegrationError, type DashboardSummary } from '../api/client.js'
import {
  bindDashboardSummaryCache,
  createDashboardSummaryCache
} from './dashboard-summary-cache.js'

describe('Dashboard 摘要共享缓存', () => {
  it('角色列表、团队列表和开始对战的并发读取合并为一次摘要请求', async () => {
    const request = deferred<DashboardSummary>()
    const loadSummary = vi.fn(() => request.promise)
    const cache = createDashboardSummaryCache({ loadSummary })
    cache.setAppKey('agent_key')

    const characterListRead = cache.get('agent_key', 'zh-CN')
    const teamListRead = cache.get('agent_key', 'zh-CN')
    const battleNewRead = cache.get('agent_key', 'zh-CN')

    expect(loadSummary).toHaveBeenCalledTimes(1)
    request.resolve(summary('first'))
    await expect(Promise.all([characterListRead, teamListRead, battleNewRead])).resolves.toEqual([
      summary('first'),
      summary('first'),
      summary('first')
    ])
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(summary('first'))
    expect(loadSummary).toHaveBeenCalledTimes(1)
  })

  it('静默刷新期间立即返回旧快照，完成后切换缓存快照', async () => {
    const first = deferred<DashboardSummary>()
    const refreshed = deferred<DashboardSummary>()
    const loadSummary = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(refreshed.promise)
    const cache = createDashboardSummaryCache({ loadSummary })
    cache.setAppKey('agent_key')

    const initialRead = cache.get('agent_key', 'zh-CN')
    first.resolve(summary('old'))
    await expect(initialRead).resolves.toEqual(summary('old'))

    cache.refresh('agent_key', 'zh-CN')
    expect(cache.peek('agent_key')).toEqual(summary('old'))
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(summary('old'))
    refreshed.resolve(summary('new'))
    await flushMicrotasks()

    expect(cache.peek('agent_key')).toEqual(summary('new'))
    expect(loadSummary).toHaveBeenCalledTimes(2)
  })

  it('在 App Key 与摘要数据变化时通知订阅者', async () => {
    const initial = deferred<DashboardSummary>()
    const loadSummary = vi.fn().mockReturnValueOnce(initial.promise)
    const cache = createDashboardSummaryCache({ loadSummary })
    const listener = vi.fn()
    const unsubscribe = cache.subscribe(listener)

    cache.setAppKey('agent_key')
    expect(listener).toHaveBeenCalledTimes(1)
    const initialRead = cache.get('agent_key', 'zh-CN')
    initial.resolve(summary('old'))
    await expect(initialRead).resolves.toEqual(summary('old'))
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    cache.setAppKey(null)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('过期摘要仍立即展示，并在后台合并刷新请求', async () => {
    let now = 1_000
    const refreshed = deferred<DashboardSummary>()
    const loadSummary = vi.fn()
      .mockResolvedValueOnce(summary('old'))
      .mockReturnValueOnce(refreshed.promise)
    const cache = createDashboardSummaryCache({ now: () => now, ttlMs: 100, loadSummary })
    cache.setAppKey('agent_key')
    await cache.get('agent_key', 'zh-CN')

    now += 100
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(summary('old'))
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(summary('old'))
    expect(loadSummary).toHaveBeenCalledTimes(2)

    refreshed.resolve(summary('new'))
    await flushMicrotasks()
    expect(cache.peek('agent_key')).toEqual(summary('new'))
  })

  it('静默刷新失败时保留旧快照，并统一处理无效 App Key', async () => {
    const onUnauthorized = vi.fn()
    const loadSummary = vi.fn()
      .mockResolvedValueOnce(summary('old'))
      .mockRejectedValueOnce(new AgentDuelIntegrationError(
        401,
        'INVALID_INTEGRATION_APP_KEY',
        'invalid'
      ))
    const cache = createDashboardSummaryCache({ loadSummary, onUnauthorized })
    cache.setAppKey('agent_key')
    await cache.get('agent_key', 'zh-CN')

    cache.refresh('agent_key', 'zh-CN')
    await flushMicrotasks()
    await flushMicrotasks()

    expect(cache.peek('agent_key')).toEqual(summary('old'))
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('绑定 App Key 生命周期时不主动请求摘要', () => {
    let appKey: string | null = 'agent_existing'
    const listeners = new Set<() => void>()
    const setAppKey = vi.fn()
    const dispose = vi.fn()
    const unbind = bindDashboardSummaryCache(
      { setAppKey, dispose },
      {
        getSnapshot: () => ({ appKey }),
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        }
      }
    )

    expect(setAppKey).toHaveBeenCalledWith('agent_existing')
    appKey = null
    for (const listener of listeners) listener()
    expect(setAppKey).toHaveBeenLastCalledWith(null)

    unbind()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

function summary(name: string): DashboardSummary {
  return {
    user: { public_id: `account-${name}` },
    characters: [{
      public_id: `character-${name}`,
      slot_no: 1,
      name,
      status: 'active',
      class_id: 'mage',
      code_source: 'default',
      created_at: '2026-08-01T00:00:00.000Z',
      active_code: null,
      ranked_rating: 800,
      battle_counts: { practice: 0, ranked: 0 },
      ranked_results: { wins: 0, draws: 0, losses: 0 },
      latest_submission: null,
      battle_readiness: {
        practice: { can_request: true, blocking_reason: null },
        ranked: { can_request: true, blocking_reason: null }
      }
    }],
    teams: []
  }
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
