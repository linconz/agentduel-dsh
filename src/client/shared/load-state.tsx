import { useEffect, useState } from 'react'
import { isInvalidAppKey } from '../api/client.js'
import type { AgentDuelPageNavigation } from '../shell/routes.js'

export type LoadState<T> =
  | { status: 'loading'; value: null; error: null }
  | { status: 'ready'; value: T; error: null }
  | { status: 'error'; value: null; error: unknown }

export function useLoadState<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: readonly unknown[],
  getCachedValue?: () => T | null
): [LoadState<T>, () => void] {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<LoadState<T>>(() => loadStateFromCache(getCachedValue))
  useEffect(() => {
    const controller = new AbortController()
    setState(loadStateFromCache(getCachedValue))
    void loader(controller.signal).then(
      (value) => { if (!controller.signal.aborted) setState({ status: 'ready', value, error: null }) },
      (error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', value: null, error }) }
    )
    return () => controller.abort()
  // 调用方传入稳定的加载函数依赖，避免把每次渲染的新函数作为依赖。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey])
  return [state, () => setReloadKey((value) => value + 1)]
}

function loadStateFromCache<T>(getCachedValue?: () => T | null): LoadState<T> {
  const value = getCachedValue?.() ?? null
  return value === null
    ? { status: 'loading', value: null, error: null }
    : { status: 'ready', value, error: null }
}

export function ModuleLoadState<T>({
  label,
  onRetry,
  state
}: {
  label: string
  onRetry: () => void
  state: LoadState<T>
}): React.JSX.Element {
  if (state.status === 'loading') {
    return <section className="agentduel-module-state" role="status"><div>正在加载{label}…</div></section>
  }
  return (
    <section className="agentduel-module-state" role="alert">
      <div>
        <p className="agentduel-module-kicker">AgentDuel</p>
        <h1>{label}暂时无法加载</h1>
        <p>请检查网络连接后重新尝试。</p>
        <button type="button" onClick={onRetry}>重新加载</button>
      </div>
    </section>
  )
}

export function useUnauthorizedEffect(error: unknown, navigation: AgentDuelPageNavigation): void {
  useEffect(() => {
    if (isInvalidAppKey(error)) navigation.invalidateAppKey()
  }, [error, navigation])
}
