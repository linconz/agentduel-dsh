import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentDuelIntegrationError, type Character, type Team } from '../api/client.js'
import {
  OWNED_ENTITIES_CACHE_TTL_MS,
  bindOwnedEntitiesCache,
  createOwnedEntitiesCache,
  refreshOwnedEntitiesAfterCompletedBattle,
  refreshOwnedEntitiesAfterSuccess
} from './owned-entities-cache.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('本人角色与团队缓存', () => {
  it('完整版本摘要返回前不暴露列表快照，完成后同步命中真实模型数据', async () => {
    const characterVersion = deferred<{ version_no: number; ai_model: string; change_summary: null } | null>()
    const teamVersion = deferred<{ version_no: number; ai_model: string; change_summary: null } | null>()
    const ownedCharacter = activeCharacter('character-1')
    const ownedTeam = activeTeam('team-1')
    const loadCharacterVersion = vi.fn(() => characterVersion.promise)
    const loadTeamVersion = vi.fn(() => teamVersion.promise)
    const cache = createOwnedEntitiesCache({
      loadCharacters: async () => [ownedCharacter],
      loadTeams: async () => [ownedTeam],
      loadCharacterVersion,
      loadTeamVersion
    })
    cache.setAppKey('agent_key')

    const characterList = cache.getCharacterList('agent_key')
    const teamList = cache.getTeamList('agent_key')
    await flushMicrotasks()
    expect(cache.peekCharacterList('agent_key')).toBeNull()
    expect(cache.peekTeamList('agent_key')).toBeNull()

    characterVersion.resolve({ version_no: 3, ai_model: 'deepseek-v3', change_summary: null })
    teamVersion.resolve({ version_no: 5, ai_model: 'deepseek-r1', change_summary: null })
    await expect(characterList).resolves.toMatchObject({ characters: [ownedCharacter] })
    await expect(teamList).resolves.toMatchObject({ teams: [ownedTeam] })

    expect(cache.peekCharacterList('agent_key')?.versions.get('character-1')).toMatchObject({
      version_no: 3,
      ai_model: 'deepseek-v3'
    })
    expect(cache.peekTeamList('agent_key')?.versions.get('team-1')).toMatchObject({
      version_no: 5,
      ai_model: 'deepseek-r1'
    })

    await cache.getCharacterList('agent_key')
    await cache.getTeamList('agent_key')
    expect(loadCharacterVersion).toHaveBeenCalledTimes(1)
    expect(loadTeamVersion).toHaveBeenCalledTimes(1)
  })

  it('非 active 对象以真实的空版本写入完整快照，不请求版本接口', async () => {
    const inactiveCharacter = { ...activeCharacter('character-inactive'), status: 'suspended' as const }
    const inactiveTeam = { ...activeTeam('team-inactive'), status: 'suspended' as const }
    const loadCharacterVersion = vi.fn()
    const loadTeamVersion = vi.fn()
    const cache = createOwnedEntitiesCache({
      loadCharacters: async () => [inactiveCharacter],
      loadTeams: async () => [inactiveTeam],
      loadCharacterVersion,
      loadTeamVersion
    })
    cache.setAppKey('agent_key')

    await cache.getCharacterList('agent_key')
    await cache.getTeamList('agent_key')
    expect(cache.peekCharacterList('agent_key')?.versions.get('character-inactive')).toBeNull()
    expect(cache.peekTeamList('agent_key')?.versions.get('team-inactive')).toBeNull()
    expect(loadCharacterVersion).not.toHaveBeenCalled()
    expect(loadTeamVersion).not.toHaveBeenCalled()
  })

  it('并行预热两类数据，并从各自成功时刻计算两分钟 TTL', async () => {
    let now = 1_000
    const firstCharacters = deferred<Character[]>()
    const firstTeams = deferred<Team[]>()
    const loadCharacters = vi.fn()
      .mockReturnValueOnce(firstCharacters.promise)
      .mockResolvedValueOnce([character('character-new')])
    const loadTeams = vi.fn()
      .mockReturnValueOnce(firstTeams.promise)
      .mockResolvedValueOnce([team('team-new')])
    const cache = createOwnedEntitiesCache({ now: () => now, loadCharacters, loadTeams })

    cache.setAppKey('agent_key')
    cache.prefetchAll('agent_key')
    await flushMicrotasks()
    expect(loadCharacters).toHaveBeenCalledTimes(1)
    expect(loadTeams).toHaveBeenCalledTimes(1)

    now = 10_000
    firstCharacters.resolve([character('character-old')])
    firstTeams.resolve([team('team-old')])
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-old')])
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-old')])
    expect(cache.peekCharacters('agent_key')).toEqual([character('character-old')])
    expect(cache.peekTeams('agent_key')).toEqual([team('team-old')])

    now = 10_000 + OWNED_ENTITIES_CACHE_TTL_MS - 1
    await cache.getCharacters('agent_key')
    await cache.getTeams('agent_key')
    expect(loadCharacters).toHaveBeenCalledTimes(1)
    expect(loadTeams).toHaveBeenCalledTimes(1)

    now += 1
    expect(cache.peekCharacters('agent_key')).toBeNull()
    expect(cache.peekTeams('agent_key')).toBeNull()
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-new')])
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-new')])
    expect(loadCharacters).toHaveBeenCalledTimes(2)
    expect(loadTeams).toHaveBeenCalledTimes(2)
  })

  it('把空列表作为有效内存数据同步返回', async () => {
    const loadCharacters = vi.fn().mockResolvedValue([])
    const loadTeams = vi.fn().mockResolvedValue([])
    const cache = createOwnedEntitiesCache({ loadCharacters, loadTeams })
    cache.setAppKey('agent_key')

    await cache.getCharacters('agent_key')
    await cache.getTeams('agent_key')
    expect(cache.peekCharacters('agent_key')).toEqual([])
    expect(cache.peekTeams('agent_key')).toEqual([])

    await cache.getCharacters('agent_key')
    await cache.getTeams('agent_key')
    expect(loadCharacters).toHaveBeenCalledTimes(1)
    expect(loadTeams).toHaveBeenCalledTimes(1)
  })

  it('合并同资源并发请求，并隔离角色与团队失败', async () => {
    const charactersRequest = deferred<Character[]>()
    const loadCharacters = vi.fn((_appKey: string, _signal: AbortSignal): Promise<Character[]> => charactersRequest.promise)
    const loadTeams = vi.fn()
      .mockRejectedValueOnce(new Error('teams unavailable'))
      .mockResolvedValueOnce([team('team-retry')])
    const cache = createOwnedEntitiesCache({ loadCharacters, loadTeams })
    cache.setAppKey('agent_key')

    const first = cache.getCharacters('agent_key')
    const second = cache.getCharacters('agent_key')
    await flushMicrotasks()
    expect(loadCharacters).toHaveBeenCalledTimes(1)
    expect(loadTeams).toHaveBeenCalledTimes(1)

    charactersRequest.resolve([character('character-1')])
    await expect(Promise.all([first, second])).resolves.toEqual([
      [character('character-1')],
      [character('character-1')]
    ])
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-retry')])
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-1')])
    expect(loadTeams).toHaveBeenCalledTimes(2)
    expect(loadCharacters).toHaveBeenCalledTimes(1)
  })

  it('不缓存请求错误，后续读取会重新请求', async () => {
    const loadCharacters = vi.fn().mockResolvedValue([character('character-1')])
    const loadTeams = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce([team('team-1')])
    const cache = createOwnedEntitiesCache({ loadCharacters, loadTeams })
    cache.setAppKey('agent_key')

    await expect(cache.getTeams('agent_key')).rejects.toThrow('temporary')
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-1')])
    expect(loadTeams).toHaveBeenCalledTimes(2)
  })

  it('页面取消只停止等待，不会中止共享请求', async () => {
    const charactersRequest = deferred<Character[]>()
    const sharedSignals: AbortSignal[] = []
    const loadCharacters = vi.fn((_appKey: string, signal: AbortSignal): Promise<Character[]> => {
      sharedSignals.push(signal)
      return charactersRequest.promise
    })
    const cache = createOwnedEntitiesCache({
      loadCharacters,
      loadTeams: async () => []
    })
    const pageController = new AbortController()
    cache.setAppKey('agent_key')

    const pageRequest = cache.getCharacters('agent_key', pageController.signal)
    await flushMicrotasks()
    pageController.abort()
    await expect(pageRequest).rejects.toMatchObject({ name: 'AbortError' })
    expect(sharedSignals[0]?.aborted).toBe(false)

    charactersRequest.resolve([character('character-1')])
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-1')])
    expect(loadCharacters).toHaveBeenCalledTimes(1)
  })

  it('强制刷新中止旧请求，且旧结果不能覆盖新缓存', async () => {
    const oldCharacters = deferred<Character[]>()
    const newCharacters = deferred<Character[]>()
    const oldTeams = deferred<Team[]>()
    const newTeams = deferred<Team[]>()
    const characterSignals: AbortSignal[] = []
    const teamSignals: AbortSignal[] = []
    const loadCharacters = vi.fn((_appKey: string, signal: AbortSignal): Promise<Character[]> => {
      characterSignals.push(signal)
      return characterSignals.length === 1 ? oldCharacters.promise : newCharacters.promise
    })
    const loadTeams = vi.fn((_appKey: string, signal: AbortSignal): Promise<Team[]> => {
      teamSignals.push(signal)
      return teamSignals.length === 1 ? oldTeams.promise : newTeams.promise
    })
    const cache = createOwnedEntitiesCache({ loadCharacters, loadTeams })
    cache.setAppKey('agent_key')
    cache.prefetchAll('agent_key')
    await flushMicrotasks()

    cache.refreshAll('agent_key')
    await flushMicrotasks()
    expect(characterSignals[0]?.aborted).toBe(true)
    expect(teamSignals[0]?.aborted).toBe(true)
    expect(loadCharacters).toHaveBeenCalledTimes(2)
    expect(loadTeams).toHaveBeenCalledTimes(2)

    newCharacters.resolve([character('character-new')])
    newTeams.resolve([team('team-new')])
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-new')])
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-new')])

    oldCharacters.resolve([character('character-old')])
    oldTeams.resolve([team('team-old')])
    await flushMicrotasks()
    await expect(cache.getCharacters('agent_key')).resolves.toEqual([character('character-new')])
    await expect(cache.getTeams('agent_key')).resolves.toEqual([team('team-new')])
  })

  it('Key 变化与释放会清空缓存、中止请求并拒绝旧 Key 读取', async () => {
    const requests: Array<{ key: string; signal: AbortSignal; deferred: Deferred<Character[]> }> = []
    const loadCharacters = vi.fn((key: string, signal: AbortSignal): Promise<Character[]> => {
      const request = { key, signal, deferred: deferred<Character[]>() }
      requests.push(request)
      return request.deferred.promise
    })
    const cache = createOwnedEntitiesCache({ loadCharacters, loadTeams: async () => [] })
    cache.setAppKey('agent_old')
    cache.prefetchAll('agent_old')
    await flushMicrotasks()

    cache.setAppKey(null)
    expect(requests[0]?.signal.aborted).toBe(true)
    await expect(cache.getCharacters('agent_old')).rejects.toThrow('App Key 已变更')

    cache.setAppKey('agent_new')
    cache.prefetchAll('agent_new')
    await flushMicrotasks()
    cache.dispose()
    expect(requests[1]?.signal.aborted).toBe(true)
    expect(() => cache.prefetchAll('agent_new')).toThrowError('角色与团队缓存已释放')
  })

  it('预热发现 App Key 无效时通知统一失效处理', async () => {
    const onUnauthorized = vi.fn()
    const cache = createOwnedEntitiesCache({
      loadCharacters: async () => {
        throw new AgentDuelIntegrationError(401, 'INVALID_INTEGRATION_APP_KEY', 'invalid')
      },
      loadTeams: async () => [],
      onUnauthorized
    })
    cache.setAppKey('agent_key')
    cache.prefetchAll('agent_key')

    await flushMicrotasks()
    await flushMicrotasks()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

describe('本人角色与团队刷新时序', () => {
  it('绑定已有 Key、新 Key、重置与卸载生命周期', () => {
    let appKey: string | null = 'agent_existing'
    const listeners = new Set<() => void>()
    const setAppKey = vi.fn()
    const prefetchAll = vi.fn()
    const dispose = vi.fn()
    const unbind = bindOwnedEntitiesCache(
      { setAppKey, prefetchAll, dispose },
      {
        getSnapshot: () => ({ appKey }),
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        }
      }
    )

    expect(setAppKey).toHaveBeenLastCalledWith('agent_existing')
    expect(prefetchAll).toHaveBeenLastCalledWith('agent_existing')

    for (const listener of listeners) listener()
    expect(prefetchAll).toHaveBeenCalledTimes(1)

    appKey = null
    for (const listener of listeners) listener()
    expect(setAppKey).toHaveBeenLastCalledWith(null)
    expect(prefetchAll).toHaveBeenCalledTimes(1)

    appKey = 'agent_new'
    for (const listener of listeners) listener()
    expect(setAppKey).toHaveBeenLastCalledWith('agent_new')
    expect(prefetchAll).toHaveBeenLastCalledWith('agent_new')

    unbind()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(0)
  })

  it('仅在写操作成功后触发刷新，且不等待刷新请求', async () => {
    const refreshAll = vi.fn()
    const cache = { refreshAll }

    await expect(refreshOwnedEntitiesAfterSuccess(cache, 'agent_key', async () => 'created')).resolves.toBe('created')
    expect(refreshAll).toHaveBeenCalledWith('agent_key')

    refreshAll.mockImplementationOnce(() => { throw new Error('cache disposed') })
    await expect(refreshOwnedEntitiesAfterSuccess(cache, 'agent_key', async () => 'updated')).resolves.toBe('updated')

    refreshAll.mockClear()
    await expect(refreshOwnedEntitiesAfterSuccess(cache, 'agent_key', async () => {
      throw new Error('write failed')
    })).rejects.toThrow('write failed')
    expect(refreshAll).not.toHaveBeenCalled()
  })

  it('仅在战斗完成为 done 时刷新', () => {
    const refreshAll = vi.fn()
    const cache = { refreshAll }

    for (const status of ['pending', 'running', 'error', 'canceled'] as const) {
      refreshOwnedEntitiesAfterCompletedBattle(cache, 'agent_key', status)
    }
    expect(refreshAll).not.toHaveBeenCalled()

    refreshOwnedEntitiesAfterCompletedBattle(cache, 'agent_key', 'done')
    expect(refreshAll).toHaveBeenCalledTimes(1)
    expect(refreshAll).toHaveBeenCalledWith('agent_key')
  })
})

function character(publicId: string): Character {
  return { public_id: publicId } as Character
}

function team(publicId: string): Team {
  return { public_id: publicId } as Team
}

function activeCharacter(publicId: string): Character {
  return {
    public_id: publicId,
    status: 'active',
    updated_at: '2026-08-20T00:00:00.000Z',
    code_source: 'custom'
  } as Character
}

function activeTeam(publicId: string): Team {
  return {
    public_id: publicId,
    status: 'active',
    updated_at: '2026-08-20T00:00:00.000Z',
    code_source: 'custom'
  } as Team
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
