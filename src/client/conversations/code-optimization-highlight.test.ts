import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AGENT_OPTIMIZATION_HIGHLIGHT_MS,
  startAgentOptimizationHighlight
} from './code-optimization.js'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Agent 代码优化引导高亮', () => {
  it('滚动到 section 并在 3 秒后完成高亮', () => {
    vi.useFakeTimers()
    const nativeSetTimeout = globalThis.setTimeout
    const nativeClearTimeout = globalThis.clearTimeout
    const scrollIntoView = vi.fn()
    const onComplete = vi.fn()
    vi.stubGlobal('window', {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
      cancelAnimationFrame: vi.fn(),
      setTimeout: nativeSetTimeout,
      clearTimeout: nativeClearTimeout,
      matchMedia: () => ({ matches: false })
    })

    startAgentOptimizationHighlight({ scrollIntoView }, onComplete)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(onComplete).not.toHaveBeenCalled()
    vi.advanceTimersByTime(AGENT_OPTIMIZATION_HIGHLIGHT_MS)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('减少动态效果时使用即时滚动并可清理未完成的计时器', () => {
    vi.useFakeTimers()
    const nativeSetTimeout = globalThis.setTimeout
    const nativeClearTimeout = globalThis.clearTimeout
    const scrollIntoView = vi.fn()
    const onComplete = vi.fn()
    vi.stubGlobal('window', {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0)
        return 2
      },
      cancelAnimationFrame: vi.fn(),
      setTimeout: nativeSetTimeout,
      clearTimeout: nativeClearTimeout,
      matchMedia: () => ({ matches: true })
    })

    const dispose = startAgentOptimizationHighlight({ scrollIntoView }, onComplete)
    dispose()
    vi.advanceTimersByTime(AGENT_OPTIMIZATION_HIGHLIGHT_MS)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
    expect(onComplete).not.toHaveBeenCalled()
  })
})
