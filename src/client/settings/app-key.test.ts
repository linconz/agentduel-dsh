import { afterEach, describe, expect, it, vi } from 'vitest'
import { AGENTDUEL_PLUGIN_VERSION, AGENTDUEL_TYPE } from '../api/client.js'
import { checkAppKey } from './app-key.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('App Key 校验请求', () => {
  it('携带插件类型、插件版本和当前 Turnstile token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const signal = new AbortController().signal
    await expect(checkAppKey('agent_TestKey1234567', 'fresh-token', signal)).resolves.toBe(true)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(url).toBe('https://api.agentduel.app/api/integrations/check')
    expect(init.credentials).toBe('omit')
    expect(headers.get('AgentDuel-Type')).toBe(AGENTDUEL_TYPE)
    expect(headers.get('AgentDuel-Plugin-Version')).toBe(AGENTDUEL_PLUGIN_VERSION)
    expect(headers.get('X-Turnstile-Token')).toBe('fresh-token')
    expect(headers.get('Authorization')).toBeNull()
  })
})
