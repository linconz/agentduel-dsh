import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AGENTDUEL_PLUGIN_VERSION,
  AgentDuelIntegrationError,
  agentDuelRequest,
  createBattleRequestBody,
  fetchAccountBattleHistory,
  fetchPublicBattleHistory,
  fetchPublicBattleDetails,
  fetchPublicBattleReviewContext,
  fetchRecentRankedReplays,
  fetchReplayResult,
  isInvalidAppKey,
  normalizeBattleSharePath,
  updateCharacterBadgeDisplay,
  updateTeamBadgeDisplay,
  type Battle
} from './client.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('战斗请求体', () => {
  it('构造指定对手死斗练习赛与复仇参数', () => {
    expect(createBattleRequestBody({
      mode: 'deathmatch',
      battleType: 'practice',
      challengerPublicId: 'character-own',
      targetPublicId: 'character-target',
      revengeOfBattlePublicId: 'battle-old',
      mapId: 'arena'
    })).toEqual({
      battle_type: 'practice',
      game_mode_id: 'deathmatch',
      challenger_character_public_id: 'character-own',
      target_character_public_id: 'character-target',
      revenge_of_battle_public_id: 'battle-old',
      map_id: 'arena'
    })
  })

  it('排位赛忽略前端残留的目标、地图和复仇字段', () => {
    expect(createBattleRequestBody({
      mode: 'captureTheFlag',
      battleType: 'ranked',
      challengerPublicId: 'team-own',
      targetPublicId: 'team-target',
      revengeOfBattlePublicId: 'battle-old',
      mapId: 'ctf-map'
    })).toEqual({
      battle_type: 'ranked',
      game_mode_id: 'captureTheFlag',
      challenger_team_public_id: 'team-own'
    })
  })
})

describe('徽章展示设置', () => {
  it('使用 Turnstile PUT 完整替换角色徽章分组和顺序', async () => {
    const settings = {
      equipped_badge_keys: ['character.completed.total', 'character.ranked.debut'],
      hidden_badge_keys: ['character.victories.total']
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateCharacterBadgeDisplay(
      'agent_TestKey1234567',
      'character/1',
      settings,
      'fresh-character-token'
    )).resolves.toEqual(settings)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.agentduel.app/api/integrations/characters/badge-display/character%2F1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual(settings)
    expect(new Headers(init.headers).get('X-Turnstile-Token')).toBe('fresh-character-token')
  })

  it('团队徽章保存使用团队专用接口', async () => {
    const settings = {
      equipped_badge_keys: ['ctf.completed.total'],
      hidden_badge_keys: ['ctf.ranked.debut']
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await updateTeamBadgeDisplay('agent_TestKey1234567', 'team/1', settings, 'fresh-team-token')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.agentduel.app/api/integrations/teams/badge-display/team%2F1')
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('X-Turnstile-Token')).toBe('fresh-team-token')
  })
})

describe('统一请求层', () => {
  it('公开观战依次读取最近排位引用和战斗详情且不携带 App Key', async () => {
    const battle = { public_id: 'battle-1', replay_url: 'https://replay.example/battle-1.json' } as Battle
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        battles: [{ battle_public_id: 'battle-1', game_mode_id: 'deathmatch' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ battle }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
    vi.stubGlobal('fetch', fetchMock)

    const recent = await fetchRecentRankedReplays()
    await expect(fetchPublicBattleDetails(recent[0]?.battle_public_id ?? '')).resolves.toEqual(battle)

    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'https://api.agentduel.app/api/battles/recent',
      'https://api.agentduel.app/api/battles/battle-1'
    ])
    for (const [, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      expect(init.credentials).toBe('omit')
      expect(new Headers(init.headers).get('Authorization')).toBeNull()
      expect(new Headers(init.headers).get('Accept-Language')).toBe('zh-CN')
      expect(new Headers(init.headers).get('AgentDuel-Type')).toBeNull()
      expect(new Headers(init.headers).get('AgentDuel-Plugin-Version')).toBeNull()
    }
  })

  it('公开观战通过短分享路径读取冻结的复盘上下文', async () => {
    const context = {
      share_path: '/b/replay-1',
      replay_url: 'https://replay.example/battle-1.json',
      map_snapshot: { terrain_rows: ['***', '*#*'] }
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(context), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPublicBattleReviewContext(
      'https://www.agentduel.app/b/replay-1'
    )).resolves.toEqual(context)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.agentduel.app/api/battles/review-context?share_path=%2Fb%2Freplay-1')
    expect(init.credentials).toBe('omit')
    expect(new Headers(init.headers).get('Authorization')).toBeNull()
    expect(new Headers(init.headers).get('AgentDuel-Type')).toBeNull()
    expect(new Headers(init.headers).get('AgentDuel-Plugin-Version')).toBeNull()
  })

  it('账户最近战斗使用统一接口并下推玩法和列表筛选', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      battles: [],
      next_cursor: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchAccountBattleHistory('agent_TestKey1234567', {
      cursor: 'next cursor',
      limit: 20,
      battleTypes: ['practice', 'ranked'],
      gameModeIds: ['deathmatch'],
      results: ['win'],
      challengeRoles: ['challenger', 'target']
    })

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.agentduel.app/api/integrations/battles?cursor=next+cursor&limit=20&battle_type=practice%2Cranked&game_mode_id=deathmatch&result=win&challenge_role=challenger%2Ctarget')
  })

  it('公开对战记录使用访客视角接口并保留分页筛选', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      battles: [],
      next_cursor: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPublicBattleHistory('agent_TestKey1234567', 'characters', 'character/guest', {
      cursor: 'next cursor',
      battleType: 'ranked'
    })

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.agentduel.app/api/integrations/battles/characters/public/character%2Fguest?cursor=next+cursor&battle_type=ranked')
  })

  it('GET 网络错误和临时 5xx 有限重试，并固定认证、语言和凭据策略', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: 'TEMPORARY_ERROR', message: '暂时不可用' }
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
    vi.stubGlobal('fetch', fetchMock)

    const request = agentDuelRequest<{ ok: boolean }>('agent_TestKey1234567', '/api/integrations/test')
    await vi.runAllTimersAsync()
    await expect(request).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [, init] = fetchMock.mock.calls[2] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(init.credentials).toBe('omit')
    expect(headers.get('Accept-Language')).toBe('zh-CN')
    expect(headers.get('AgentDuel-Type')).toBe('dsh')
    expect(headers.get('AgentDuel-Plugin-Version')).toBe(AGENTDUEL_PLUGIN_VERSION)
    expect(headers.get('Authorization')).toBe('Bearer agent_TestKey1234567')
  })

  it('非 integrations 路径不携带 AgentDuel 自定义 Header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await agentDuelRequest('agent_TestKey1234567', '/api/battles/test', {
      headers: {
        'AgentDuel-Type': 'unexpected',
        'AgentDuel-Plugin-Version': 'unexpected'
      }
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('AgentDuel-Type')).toBeNull()
    expect(headers.get('AgentDuel-Plugin-Version')).toBeNull()
  })

  it('写请求遇到临时服务错误也不自动重放', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'TEMPORARY_ERROR', message: '暂时不可用' }
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(agentDuelRequest('agent_TestKey1234567', '/api/integrations/test', {
      method: 'POST',
      body: '{}',
      turnstileToken: 'fresh-token'
    })).rejects.toMatchObject({
      status: 503,
      code: 'TEMPORARY_ERROR'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get('X-Turnstile-Token')).toBe('fresh-token')
  })

  it('识别无效 App Key 业务错误', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'INVALID_INTEGRATION_APP_KEY', message: 'App Key 无效' }
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await agentDuelRequest('agent_TestKey1234567', '/api/integrations/test')
      .then(() => null, (caught: unknown) => caught)
    expect(isInvalidAppKey(error)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('回放资源请求不携带 App Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchReplayResult('https://replay.example/battle.json')).rejects.toBeInstanceOf(AgentDuelIntegrationError)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://replay.example/battle.json')
    expect(init.credentials).toBe('omit')
    expect(init.headers).toBeUndefined()
  })
})

describe('分享地址', () => {
  it('把相对路径规范化到 AgentDuel 官网', () => {
    const source = {
      share_path: '/battles/battle-1'
    } as Battle
    expect(normalizeBattleSharePath(source).share_path).toBe('https://www.agentduel.app/battles/battle-1')
  })
})
