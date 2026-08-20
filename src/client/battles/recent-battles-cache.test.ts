import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BattlePage } from '../api/client.js'
import {
  RECENT_BATTLES_CACHE_TTL_MS,
  clearRecentBattlesAfterSuccess,
  createRecentBattlesCache,
  refreshRecentBattlesAfterCompletedBattle,
  type RecentBattlesQuery
} from './recent-battles-cache.js'

const DEFAULT_QUERY: RecentBattlesQuery = {
  battleTypes: [],
  challengeRoles: [],
  results: [],
  limit: 20
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('最近战斗缓存', () => {
  it('按查询合并并发请求，两分钟内命中，过期后重新读取', async () => {
    let now = 1_000
    const firstRequest = deferred<BattlePage>()
    const firstPage = battlePage('battle-old')
    const secondPage = battlePage('battle-new')
    const loadBattlePage = vi.fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(secondPage)
    const cache = createRecentBattlesCache({ now: () => now, loadBattlePage })
    cache.setAppKey('agent_key')

    const first = cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)
    const second = cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)
    await flushMicrotasks()
    expect(loadBattlePage).toHaveBeenCalledTimes(1)

    now = 10_000
    firstRequest.resolve(firstPage)
    await expect(Promise.all([first, second])).resolves.toEqual([firstPage, firstPage])

    now = 10_000 + RECENT_BATTLES_CACHE_TTL_MS - 1
    await expect(cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)).resolves.toBe(firstPage)
    expect(loadBattlePage).toHaveBeenCalledTimes(1)

    now += 1
    await expect(cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)).resolves.toBe(secondPage)
    expect(loadBattlePage).toHaveBeenCalledTimes(2)
  })

  it('玩法、游标与筛选条件分别缓存，筛选数组顺序不影响键', async () => {
    const loadBattlePage = vi.fn().mockResolvedValue(battlePage('battle-1'))
    const cache = createRecentBattlesCache({ loadBattlePage })
    cache.setAppKey('agent_key')

    await Promise.all([
      cache.getBattlePage('agent_key', 'deathmatch', {
        battleTypes: ['practice', 'ranked'], challengeRoles: [], results: []
      }),
      cache.getBattlePage('agent_key', 'deathmatch', {
        battleTypes: ['ranked', 'practice'], challengeRoles: [], results: []
      }),
      cache.getBattlePage('agent_key', 'deathmatch', {
        battleTypes: [], challengeRoles: [], results: [], cursor: 'page-2'
      }),
      cache.getBattlePage('agent_key', 'captureTheFlag', DEFAULT_QUERY)
    ])

    expect(loadBattlePage).toHaveBeenCalledTimes(3)
  })

  it('提交成功后只清空缓存，不立即请求；提交失败不清空', async () => {
    const clear = vi.fn()
    await expect(clearRecentBattlesAfterSuccess({ clear }, 'agent_key', async () => 'battle-id')).resolves.toBe('battle-id')
    expect(clear).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledWith('agent_key')

    clear.mockClear()
    await expect(clearRecentBattlesAfterSuccess({ clear }, 'agent_key', async () => {
      throw new Error('start failed')
    })).rejects.toThrow('start failed')
    expect(clear).not.toHaveBeenCalled()
  })

  it('仅在 done 时刷新对应玩法的默认第一页', async () => {
    const refreshDefault = vi.fn()
    for (const status of ['pending', 'running', 'error', 'canceled'] as const) {
      refreshRecentBattlesAfterCompletedBattle({ refreshDefault }, 'agent_key', 'deathmatch', status)
    }
    expect(refreshDefault).not.toHaveBeenCalled()

    refreshRecentBattlesAfterCompletedBattle({ refreshDefault }, 'agent_key', 'captureTheFlag', 'done')
    expect(refreshDefault).toHaveBeenCalledTimes(1)
    expect(refreshDefault).toHaveBeenCalledWith('agent_key', 'captureTheFlag')
  })

  it('done 强制替换对应玩法缓存并保留另一玩法缓存', async () => {
    const loadBattlePage = vi.fn()
      .mockResolvedValueOnce(battlePage('death-old'))
      .mockResolvedValueOnce(battlePage('ctf-old'))
      .mockResolvedValueOnce(battlePage('death-new'))
    const cache = createRecentBattlesCache({ loadBattlePage })
    cache.setAppKey('agent_key')
    await cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)
    const ctfPage = await cache.getBattlePage('agent_key', 'captureTheFlag', DEFAULT_QUERY)

    cache.refreshDefault('agent_key', 'deathmatch')
    await flushMicrotasks()
    await expect(cache.getBattlePage('agent_key', 'deathmatch', DEFAULT_QUERY)).resolves.toEqual(battlePage('death-new'))
    await expect(cache.getBattlePage('agent_key', 'captureTheFlag', DEFAULT_QUERY)).resolves.toBe(ctfPage)
    expect(loadBattlePage).toHaveBeenCalledTimes(3)
  })
})

function battlePage(publicId: string): BattlePage {
  return { battles: [{ public_id: publicId } as BattlePage['battles'][number]], next_cursor: null }
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
