import {
  BattlesNewApiError,
  type BattleStartMap,
  type BattleStartSelection,
  type BattlesNewDataSource
} from '@agentduel/battles-new'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AGENTDUEL_PLUGIN_VERSION, fetchDashboardSummary, fetchMaps } from '../api/client.js'
import { RequestScope } from '../shared/request-scope.js'
import { createBattleNewDataSource } from './battle-new-data-source.js'

const APP_KEY = 'agent_TestKey1234567'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('开始对战首屏数据', () => {
  it('并行且恰好请求摘要和两类无参与方参数的地图，并按 locale 设置公共请求头', async () => {
    const requests = new Map<string, Deferred<Response>>()
    const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      const request = deferred<Response>()
      requests.set(url, request)
      return request.promise
    })
    vi.stubGlobal('fetch', fetchMock)
    const { dataSource } = createHarness()

    const participantsPromise = dataSource.loadParticipants('en-US')
    const mapsPromise = dataSource.loadMaps('en-US')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const expectedUrls = [
      'https://api.agentduel.app/api/integrations/dashboard/summary',
      'https://api.agentduel.app/api/integrations/game-modes/deathmatch/maps',
      'https://api.agentduel.app/api/integrations/game-modes/captureTheFlag/maps'
    ]
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual(expectedUrls)
    expect(expectedUrls.every(url => !url.includes('participant_public_id'))).toBe(true)

    for (const [, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      const headers = new Headers(init.headers)
      expect(init.credentials).toBe('omit')
      expect(init.method).toBe('GET')
      expect(headers.get('Authorization')).toBe(`Bearer ${APP_KEY}`)
      expect(headers.get('AgentDuel-Type')).toBe('dsh')
      expect(headers.get('AgentDuel-Plugin-Version')).toBe(AGENTDUEL_PLUGIN_VERSION)
      expect(headers.get('Accept')).toBe('application/json')
      expect(headers.get('Accept-Language')).toBe('en-US')
      expect(headers.get('Content-Type')).toBeNull()
    }

    requests.get(expectedUrls[0])?.resolve(jsonResponse(dashboardSummary()))
    requests.get(expectedUrls[1])?.resolve(jsonResponse({ maps: deathmatchMaps() }))
    requests.get(expectedUrls[2])?.resolve(jsonResponse({ maps: captureTheFlagMaps() }))

    const [participants, maps] = await Promise.all([participantsPromise, mapsPromise])
    expect(participants).toEqual({
      characters: [
        {
          public_id: 'character-custom',
          name: '自定义角色',
          code_source: 'custom',
          active_code: { version_no: 7, agent_contract_version: '0.2.0' },
          ranked_results: { wins: 3, draws: 2, losses: 1 },
          battle_readiness: {
            practice: { can_request: true, blocking_reason: null },
            ranked: { can_request: false, blocking_reason: 'active_battle' }
          }
        },
        {
          public_id: 'character-default',
          name: '默认角色',
          code_source: 'default',
          active_code: null,
          ranked_results: { wins: 0, draws: 0, losses: 0 },
          battle_readiness: {
            practice: { can_request: false, blocking_reason: 'content_restricted' },
            ranked: { can_request: false, blocking_reason: 'content_restricted' }
          }
        }
      ],
      teams: [
        {
          public_id: 'team-inactive',
          name: '未就绪团队',
          code_source: 'none',
          active_code: null,
          ranked_results: { wins: 1, draws: 0, losses: 4 },
          battle_readiness: {
            practice: { can_request: false, blocking_reason: 'team_code_required' },
            ranked: { can_request: false, blocking_reason: 'team_code_required' }
          }
        }
      ]
    })
    expect(maps.deathmatch.map((map: BattleStartMap) => map.map_id)).toEqual([
      'default_arena',
      'reedbank_ruins',
      'thicket_maze',
      'unknown_second',
      'unknown_first'
    ])
    expect(maps.captureTheFlag.map((map: BattleStartMap) => map.map_id)).toEqual([
      'default_arena',
      'four_corners_ruins',
      'bannerhold_heights',
      'ctf_unknown'
    ])
    expect(maps.deathmatch.find((map: BattleStartMap) => map.map_id === 'reedbank_ruins')?.is_enabled).toBe(false)
    expect(maps.deathmatch[0]).toEqual({
      map_id: 'default_arena',
      name_key: 'maps.default_arena',
      width: 32,
      height: 24,
      asset_path: '/maps/default.tmj',
      min_agent_contract_version: '0.1.0',
      is_enabled: true
    })
  })
})

describe('开始对战提交', () => {
  it.each([
    {
      label: '死斗随机练习',
      selection: selection({ mode: 'deathmatch', opponentSelection: 'random' }),
      expected: {
        battle_type: 'practice',
        game_mode_id: 'deathmatch',
        challenger_character_public_id: 'character-own'
      }
    },
    {
      label: '死斗指定练习',
      selection: selection({
        mode: 'deathmatch',
        opponentSelection: 'specified',
        targetPublicId: 'character-target',
        targetName: '目标角色',
        revengeOfBattlePublicId: 'battle-old',
        mapId: 'reedbank_ruins'
      }),
      expected: {
        battle_type: 'practice',
        game_mode_id: 'deathmatch',
        challenger_character_public_id: 'character-own',
        target_character_public_id: 'character-target',
        revenge_of_battle_public_id: 'battle-old',
        map_id: 'reedbank_ruins'
      }
    },
    {
      label: '死斗排位',
      selection: selection({
        mode: 'deathmatch',
        battleType: 'ranked',
        opponentSelection: 'specified',
        targetPublicId: 'stale-target',
        revengeOfBattlePublicId: 'stale-battle',
        mapId: 'stale-map'
      }),
      expected: {
        battle_type: 'ranked',
        game_mode_id: 'deathmatch',
        challenger_character_public_id: 'character-own'
      }
    },
    {
      label: '夺旗随机练习',
      selection: selection({ mode: 'captureTheFlag', opponentSelection: 'random' }),
      expected: {
        battle_type: 'practice',
        game_mode_id: 'captureTheFlag',
        challenger_team_public_id: 'team-own'
      }
    },
    {
      label: '夺旗指定练习',
      selection: selection({
        mode: 'captureTheFlag',
        opponentSelection: 'specified',
        targetPublicId: 'team-target',
        targetName: '目标团队',
        revengeOfBattlePublicId: 'battle-old',
        mapId: 'four_corners_ruins'
      }),
      expected: {
        battle_type: 'practice',
        game_mode_id: 'captureTheFlag',
        challenger_team_public_id: 'team-own',
        target_team_public_id: 'team-target',
        revenge_of_battle_public_id: 'battle-old',
        map_id: 'four_corners_ruins'
      }
    },
    {
      label: '夺旗排位',
      selection: selection({
        mode: 'captureTheFlag',
        battleType: 'ranked',
        opponentSelection: 'specified',
        targetPublicId: 'stale-target',
        revengeOfBattlePublicId: 'stale-battle',
        mapId: 'stale-map'
      }),
      expected: {
        battle_type: 'ranked',
        game_mode_id: 'captureTheFlag',
        challenger_team_public_id: 'team-own'
      }
    }
  ])('$label 使用正确请求体且不搜索', async ({ selection: value, expected }) => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ battle: { public_id: 'battle-new' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { clear, dataSource, refreshSummary, release, runTurnstile } = createHarness()

    await expect(dataSource.startBattle(value)).resolves.toEqual({ public_id: 'battle-new' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(url).toBe('https://api.agentduel.app/api/integrations/battles')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(JSON.parse(String(init.body))).toEqual(expected)
    expect(headers.get('Authorization')).toBe(`Bearer ${APP_KEY}`)
    expect(headers.get('AgentDuel-Type')).toBe('dsh')
    expect(headers.get('AgentDuel-Plugin-Version')).toBe(AGENTDUEL_PLUGIN_VERSION)
    expect(headers.get('Accept-Language')).toBe('en-US')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Turnstile-Token')).toBe('fresh-token')
    expect(runTurnstile).toHaveBeenCalledTimes(1)
    expect(release).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledWith(APP_KEY)
    expect(refreshSummary).toHaveBeenCalledWith(APP_KEY, 'en-US')
  })

  it('只有目标名称时只搜索一次，按去除首尾空格后的完全匹配 ID 创建', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        characters: [
          { public_id: 'partial', name: '目标角色扩展' },
          { public_id: 'exact', name: ' 目标角色 ' }
        ]
      }))
      .mockResolvedValueOnce(jsonResponse({ battle: { public_id: 'battle-searched' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { dataSource } = createHarness()

    await expect(dataSource.startBattle(selection({
      mode: 'deathmatch',
      opponentSelection: 'specified',
      targetName: ' 目标角色 ',
      targetPublicId: null,
      revengeOfBattlePublicId: 'battle-old'
    }))).resolves.toEqual({ public_id: 'battle-searched' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.agentduel.app/api/integrations/characters/search?q=%E7%9B%AE%E6%A0%87%E8%A7%92%E8%89%B2'
    )
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({
      battle_type: 'practice',
      game_mode_id: 'deathmatch',
      challenger_character_public_id: 'character-own',
      target_character_public_id: 'exact'
    })
  })

  it('目标名称没有完全匹配时返回稳定错误，且不执行验证或创建', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      teams: [{ public_id: 'partial', name: '目标团队扩展' }]
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { dataSource, runTurnstile } = createHarness()

    await expect(dataSource.startBattle(selection({
      mode: 'captureTheFlag',
      opponentSelection: 'specified',
      targetName: '目标团队',
      targetPublicId: null
    }))).rejects.toMatchObject({
      status: 404,
      code: 'BATTLE_START_TARGET_NOT_FOUND'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(runTurnstile).not.toHaveBeenCalled()
  })

  it('每次提交都取得新的 Turnstile token 并在请求结束后释放', async () => {
    const releaseFirst = vi.fn()
    const releaseSecond = vi.fn()
    const runTurnstile = vi.fn()
      .mockResolvedValueOnce({ token: 'token-first', release: releaseFirst })
      .mockResolvedValueOnce({ token: 'token-second', release: releaseSecond })
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ battle: { public_id: 'battle-new' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { dataSource } = createHarness(runTurnstile)

    await dataSource.startBattle(selection({ mode: 'deathmatch', opponentSelection: 'random' }))
    await dataSource.startBattle(selection({ mode: 'deathmatch', opponentSelection: 'random' }))

    expect(runTurnstile).toHaveBeenCalledTimes(2)
    expect(new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).get('X-Turnstile-Token')).toBe('token-first')
    expect(new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).get('X-Turnstile-Token')).toBe('token-second')
    expect(releaseFirst).toHaveBeenCalledTimes(1)
    expect(releaseSecond).toHaveBeenCalledTimes(1)
  })

  it.each([
    [401, 'INVALID_INTEGRATION_APP_KEY', null],
    [429, 'BATTLE_RATE_LIMITED', 13]
  ] as const)('保留 %s 错误的状态、代码和 Retry-After', async (status, code, retryAfterSeconds) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (retryAfterSeconds !== null) headers['Retry-After'] = String(retryAfterSeconds)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code, message: '本地化错误消息' }
    }), { status, headers }))
    vi.stubGlobal('fetch', fetchMock)
    const { dataSource } = createHarness()

    const error = await dataSource.startBattle(selection({
      mode: 'deathmatch',
      opponentSelection: 'random'
    })).then(() => null, (caught: unknown) => caught)

    expect(error).toBeInstanceOf(BattlesNewApiError)
    expect(error).toMatchObject({ status, code, retryAfterSeconds })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('创建发生超时或未知结果时不自动重放', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('request timeout'))
    vi.stubGlobal('fetch', fetchMock)
    const { clear, dataSource, release } = createHarness()

    await expect(dataSource.startBattle(selection({
      mode: 'deathmatch',
      opponentSelection: 'random'
    }))).rejects.toMatchObject({ status: 0, code: null })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(release).toHaveBeenCalledTimes(1)
    expect(clear).not.toHaveBeenCalled()
  })
})

function createHarness(runTurnstileOverride?: ReturnType<typeof vi.fn>): {
  clear: ReturnType<typeof vi.fn>
  dataSource: BattlesNewDataSource
  refreshSummary: ReturnType<typeof vi.fn>
  release: ReturnType<typeof vi.fn>
  runTurnstile: ReturnType<typeof vi.fn>
} {
  const clear = vi.fn()
  const refreshSummary = vi.fn()
  const release = vi.fn()
  const runTurnstile = runTurnstileOverride ?? vi.fn().mockResolvedValue({ token: 'fresh-token', release })
  const dataSource = createBattleNewDataSource({
    appKey: APP_KEY,
    battleMaps: {
      async get(appKey, locale, signal) {
        const [deathmatch, captureTheFlag] = await Promise.all([
          fetchMaps(appKey, 'deathmatch', locale, signal),
          fetchMaps(appKey, 'captureTheFlag', locale, signal)
        ])
        return { deathmatch, captureTheFlag }
      }
    },
    dashboardSummary: {
      get: fetchDashboardSummary,
      refresh: refreshSummary
    },
    recentBattles: { clear },
    requestScope: new RequestScope(),
    runTurnstile
  })
  return { clear, dataSource, refreshSummary, release, runTurnstile }
}

function selection(overrides: Partial<BattleStartSelection>): BattleStartSelection {
  const mode = overrides.mode ?? 'deathmatch'
  return {
    mode,
    battleType: 'practice',
    challengerPublicId: mode === 'deathmatch' ? 'character-own' : 'team-own',
    opponentSelection: 'random',
    targetName: '',
    targetPublicId: null,
    revengeOfBattlePublicId: null,
    mapId: null,
    locale: 'en-US',
    ...overrides
  }
}

function dashboardSummary(): unknown {
  return {
    user: { primary_email: 'private@example.com' },
    characters: [
      {
        public_id: 'character-custom',
        name: '自定义角色',
        code_source: 'custom',
        active_code: {
          version_no: 7,
          agent_contract_version: '0.2.0',
          ai_model: 'model-not-forwarded'
        },
        ranked_results: { wins: 3, draws: 2, losses: 1 },
        battle_readiness: {
          practice: { can_request: true, blocking_reason: null },
          ranked: { can_request: false, blocking_reason: 'active_battle' }
        },
        api_key: 'must-not-be-forwarded'
      },
      {
        public_id: 'character-default',
        name: '默认角色',
        code_source: 'default',
        active_code: null,
        ranked_results: { wins: 0, draws: 0, losses: 0 },
        battle_readiness: {
          practice: { can_request: false, blocking_reason: 'content_restricted' },
          ranked: { can_request: false, blocking_reason: 'content_restricted' }
        },
        status: 'suspended'
      }
    ],
    teams: [
      {
        public_id: 'team-inactive',
        name: '未就绪团队',
        code_source: 'none',
        active_code: null,
        ranked_results: { wins: 1, draws: 0, losses: 4 },
        battle_readiness: {
          practice: { can_request: false, blocking_reason: 'team_code_required' },
          ranked: { can_request: false, blocking_reason: 'team_code_required' }
        },
        units: [{ slot_no: 1, class_id: 'mage' }]
      }
    ]
  }
}

function deathmatchMaps(): unknown[] {
  return [
    battleMap('unknown_second', true),
    battleMap('thicket_maze', true),
    battleMap('default_arena', true, '/maps/default.tmj'),
    battleMap('unknown_first', true),
    battleMap('reedbank_ruins', false)
  ]
}

function captureTheFlagMaps(): unknown[] {
  return [
    battleMap('ctf_unknown', false),
    battleMap('bannerhold_heights', true),
    battleMap('four_corners_ruins', true),
    battleMap('default_arena', true)
  ]
}

function battleMap(mapId: string, isEnabled: boolean, assetPath = `/maps/${mapId}.tmj`): unknown {
  return {
    map_id: mapId,
    name_key: `maps.${mapId}`,
    width: 32,
    height: 24,
    asset_path: assetPath,
    min_agent_contract_version: '0.1.0',
    is_enabled: isEnabled,
    is_compatible: false,
    is_random_eligible: false,
    participant_agent_contract_version: 'must-not-be-forwarded'
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
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
