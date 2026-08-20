import { useEffect, useMemo } from 'react'
import type { RunTurnstile } from './page-types.js'

export class RequestScope {
  private readonly controllers = new Set<AbortController>()
  private disposed = false

  async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.disposed) throw new DOMException('页面已关闭', 'AbortError')
    const controller = new AbortController()
    this.controllers.add(controller)
    try {
      return await operation(controller.signal)
    } finally {
      this.controllers.delete(controller)
    }
  }

  dispose(): void {
    this.disposed = true
    for (const controller of this.controllers) controller.abort()
    this.controllers.clear()
  }
}

export function useRequestScope(): RequestScope {
  const scope = useMemo(() => new RequestScope(), [])
  useEffect(() => () => scope.dispose(), [scope])
  return scope
}

export async function withTurnstile<T>(
  runTurnstile: RunTurnstile,
  signal: AbortSignal,
  operation: (token: string) => Promise<T>
): Promise<T> {
  const challenge = await runTurnstile(signal)
  try {
    return await operation(challenge.token)
  } finally {
    challenge.release()
  }
}

export function linkedAbortController(parent: AbortSignal): AbortController {
  const controller = new AbortController()
  if (parent.aborted) controller.abort()
  else parent.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal })
  return controller
}

export async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('当前浏览器不支持剪贴板写入')
  await navigator.clipboard.writeText(value)
}
