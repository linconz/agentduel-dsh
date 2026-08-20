import { AGENTDUEL_PLUGIN_VERSION, AGENTDUEL_TYPE } from '../api/client.js'

const APP_KEY_STORAGE_KEY = 'agentduel.app_key'
const APP_KEY_PATTERN = /^agent_[A-Za-z0-9]{16}$/
const API_CHECK_URL = 'https://api.agentduel.app/api/integrations/check'

interface CheckAppKeyResponse {
  valid: boolean
}

export class AppKeyCheckError extends Error {
  constructor(
    public readonly kind: 'request' | 'rate-limit',
    public readonly retryAfterSeconds: number | null = null
  ) {
    super(kind)
  }
}

export function isAppKey(value: string): boolean {
  return APP_KEY_PATTERN.test(value)
}

export function readStoredAppKey(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(APP_KEY_STORAGE_KEY)
    if (stored === null) return null
    if (isAppKey(stored)) return stored
    localStorage.removeItem(APP_KEY_STORAGE_KEY)
  } catch {
    // 浏览器禁用本地存储时按未配置处理。
  }
  return null
}

export function saveStoredAppKey(appKey: string): boolean {
  try {
    localStorage.setItem(APP_KEY_STORAGE_KEY, appKey)
    return true
  } catch {
    return false
  }
}

export function removeStoredAppKey(): boolean {
  try {
    localStorage.removeItem(APP_KEY_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function maskAppKey(appKey: string): string {
  return `${appKey.slice(0, 10)}${'*'.repeat(12)}`
}

export async function checkAppKey(appKey: string, turnstileToken: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(API_CHECK_URL, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN',
      'AgentDuel-Type': AGENTDUEL_TYPE,
      'AgentDuel-Plugin-Version': AGENTDUEL_PLUGIN_VERSION,
      'X-Turnstile-Token': turnstileToken
    },
    body: JSON.stringify({ app_key: appKey })
  })
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new AppKeyCheckError('request')
  }
  if (response.status === 429) {
    const raw = response.headers.get('Retry-After')
    const seconds = raw === null ? null : Number(raw)
    throw new AppKeyCheckError('rate-limit', Number.isFinite(seconds) ? Math.ceil(seconds as number) : null)
  }
  if (!response.ok || typeof body !== 'object' || body === null || typeof (body as Partial<CheckAppKeyResponse>).valid !== 'boolean') {
    throw new AppKeyCheckError('request')
  }
  return (body as CheckAppKeyResponse).valid
}
