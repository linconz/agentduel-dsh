import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestScope } from '../shared/request-scope.js'
import { createRecentBattlesCache } from './recent-battles-cache.js'
import { createAccountBattlePageLoader } from './recent-battles-page.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('账户级最近战斗加载', () => {
  it.each([
    ['deathmatch', 'deathmatch'],
    ['captureTheFlag', 'captureTheFlag']
  ] as const)('%s 模式使用正确的统一战斗接口参数', async (mode, expectedMode) => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      battles: [],
      next_cursor: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const scope = new RequestScope()
    const recentBattles = createRecentBattlesCache()
    recentBattles.setAppKey('agent_TestKey1234567')
    const load = createAccountBattlePageLoader('agent_TestKey1234567', mode, scope, recentBattles)
    const query = {
      battleTypes: [],
      challengeRoles: [],
      results: [],
      limit: 20
    }

    const first = load(query)
    const second = load(query)

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    await load(query)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://api.agentduel.app/api/integrations/battles?limit=20&game_mode_id=${expectedMode}`
    )
    scope.dispose()
    recentBattles.dispose()
  })

  it('不同游标和筛选条件分别发起请求', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      battles: [],
      next_cursor: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const scope = new RequestScope()
    const recentBattles = createRecentBattlesCache()
    recentBattles.setAppKey('agent_TestKey1234567')
    const load = createAccountBattlePageLoader('agent_TestKey1234567', 'deathmatch', scope, recentBattles)

    await Promise.all([
      load({ battleTypes: [], challengeRoles: [], results: [], cursor: 'page-2' }),
      load({ battleTypes: ['ranked'], challengeRoles: [], results: [] })
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([
      'https://api.agentduel.app/api/integrations/battles?cursor=page-2&limit=20&game_mode_id=deathmatch',
      'https://api.agentduel.app/api/integrations/battles?limit=20&battle_type=ranked&game_mode_id=deathmatch'
    ]))
    scope.dispose()
    recentBattles.dispose()
  })
})
