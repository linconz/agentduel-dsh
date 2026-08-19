export const TURNSTILE_SITE_KEY = '0x4AAAAAAEC9mYVSj2YNhmaW'

const TURNSTILE_SCRIPT_ID = 'agentduel-turnstile-script'
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileRenderOptions {
  sitekey: string
  execution: 'execute'
  appearance: 'interaction-only'
  language: 'zh-CN'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
  'unsupported-callback': () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  execute: (widgetId: string) => void
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export class TurnstileVerificationError extends Error {
  constructor() {
    super('安全验证失败')
    this.name = 'TurnstileVerificationError'
  }
}

export interface TurnstileChallenge {
  token: string
  release: () => void
}

let turnstileScriptPromise: Promise<TurnstileApi> | undefined

export async function executeTurnstile(
  container: HTMLElement,
  signal: AbortSignal
): Promise<TurnstileChallenge> {
  const api = await waitForTurnstile(signal)

  return await new Promise<TurnstileChallenge>((resolve, reject) => {
    let widgetId: string | null = null
    let settled = false

    const release = (): void => {
      signal.removeEventListener('abort', onAbort)
      if (widgetId === null) return
      try { api.reset(widgetId) } catch { /* Widget 可能已被 Cloudflare 释放。 */ }
      try { api.remove(widgetId) } catch { /* 重复释放不影响下一次验证。 */ }
      widgetId = null
    }
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      release()
      reject(error)
    }
    const onAbort = (): void => fail(abortError())
    signal.addEventListener('abort', onAbort, { once: true })

    try {
      widgetId = api.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        language: 'zh-CN',
        callback: (token) => {
          if (settled) return
          settled = true
          resolve({ token, release })
        },
        'error-callback': () => fail(new TurnstileVerificationError()),
        'expired-callback': () => fail(new TurnstileVerificationError()),
        'timeout-callback': () => fail(new TurnstileVerificationError()),
        'unsupported-callback': () => fail(new TurnstileVerificationError())
      })
      api.execute(widgetId)
    } catch {
      fail(new TurnstileVerificationError())
    }
  })
}

async function waitForTurnstile(signal: AbortSignal): Promise<TurnstileApi> {
  if (signal.aborted) throw abortError()
  return await new Promise<TurnstileApi>((resolve, reject) => {
    const onAbort = (): void => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    void loadTurnstile().then(
      (api) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) reject(abortError())
        else resolve(api)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile !== undefined) return Promise.resolve(window.turnstile)
  if (turnstileScriptPromise !== undefined) return turnstileScriptPromise

  turnstileScriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
    if (script === null) {
      script = document.createElement('script')
      script.id = TURNSTILE_SCRIPT_ID
      script.src = TURNSTILE_SCRIPT_URL
      script.async = true
      script.defer = true
      script.dataset.plugin = 'agentduel-dsh'
      document.head.appendChild(script)
    }

    const cleanup = (): void => {
      window.clearTimeout(timeout)
      script?.removeEventListener('load', finish)
      script?.removeEventListener('error', fail)
    }
    const finish = (): void => {
      cleanup()
      if (window.turnstile === undefined) {
        turnstileScriptPromise = undefined
        reject(new TurnstileVerificationError())
      } else {
        resolve(window.turnstile)
      }
    }
    const fail = (): void => {
      cleanup()
      script?.remove()
      turnstileScriptPromise = undefined
      reject(new TurnstileVerificationError())
    }
    const timeout = window.setTimeout(fail, 15_000)
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })
  })
  return turnstileScriptPromise
}

function abortError(): DOMException {
  return new DOMException('验证已取消', 'AbortError')
}
