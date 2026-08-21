import { describe, expect, it, vi } from 'vitest'
import type { BattleMap } from '../api/client.js'
import {
  BATTLE_MAPS_CACHE_TTL_MS,
  createBattleMapsCache,
  type BattleMapCatalogs
} from './battle-maps-cache.js'

describe('战斗地图缓存', () => {
  it('默认缓存有效期为 86400 秒，并合并无缓存时的并发读取', async () => {
    expect(BATTLE_MAPS_CACHE_TTL_MS).toBe(86_400_000)
    const request = deferred<BattleMapCatalogs>()
    const loadMaps = vi.fn(() => request.promise)
    const cache = createBattleMapsCache({ loadMaps })
    cache.setAppKey('agent_key')

    const first = cache.get('agent_key', 'zh-CN')
    const second = cache.get('agent_key', 'zh-CN')
    expect(loadMaps).toHaveBeenCalledTimes(1)

    request.resolve(catalogs('old'))
    await expect(Promise.all([first, second])).resolves.toEqual([catalogs('old'), catalogs('old')])
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(catalogs('old'))
    expect(loadMaps).toHaveBeenCalledTimes(1)
  })

  it('地图缓存过期后立即返回旧目录，并在后台静默更新', async () => {
    let now = 1_000
    const refresh = deferred<BattleMapCatalogs>()
    const loadMaps = vi.fn()
      .mockResolvedValueOnce(catalogs('old'))
      .mockReturnValueOnce(refresh.promise)
    const cache = createBattleMapsCache({ now: () => now, loadMaps })
    cache.setAppKey('agent_key')
    await cache.get('agent_key', 'zh-CN')

    now += BATTLE_MAPS_CACHE_TTL_MS
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(catalogs('old'))
    await expect(cache.get('agent_key', 'zh-CN')).resolves.toEqual(catalogs('old'))
    expect(loadMaps).toHaveBeenCalledTimes(2)

    refresh.resolve(catalogs('new'))
    await flushMicrotasks()
    expect(cache.peek('agent_key')).toEqual(catalogs('new'))
  })

  it('App Key 变化会丢弃旧账户地图缓存', async () => {
    const loadMaps = vi.fn().mockResolvedValue(catalogs('maps'))
    const cache = createBattleMapsCache({ loadMaps })
    cache.setAppKey('agent_old')
    await cache.get('agent_old', 'zh-CN')

    cache.setAppKey('agent_new')
    expect(cache.peek('agent_old')).toBeNull()
    expect(cache.peek('agent_new')).toBeNull()
    await cache.get('agent_new', 'zh-CN')
    expect(loadMaps).toHaveBeenCalledTimes(2)
  })
})

function catalogs(name: string): BattleMapCatalogs {
  return {
    deathmatch: [map(`deathmatch-${name}`)],
    captureTheFlag: [map(`capture-${name}`)]
  }
}

function map(mapId: string): BattleMap {
  return {
    map_id: mapId,
    name_key: `maps.${mapId}`,
    width: 32,
    height: 24,
    asset_path: `/maps/${mapId}.tmj`,
    min_agent_contract_version: '0.1.0',
    participant_agent_contract_version: null,
    is_enabled: true,
    is_compatible: true,
    is_random_eligible: true
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
