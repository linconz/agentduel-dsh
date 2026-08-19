import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AgentDuelIntegrationError,
  agentDuelRequest,
  createBattleRequestBody,
  fetchReplayResult,
  isInvalidAppKey,
  normalizeBattleSharePath,
  type Battle
} from './agentduel-api.js'

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

describe('统一请求层', () => {
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
    expect(headers.get('Authorization')).toBe('Bearer agent_TestKey1234567')
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
