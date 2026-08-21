import { useEffect, useState } from 'react'
import { isInvalidAppKey } from '../api/client.js'
import type { AgentDuelPageNavigation } from '../shell/routes.js'

export type LoadState<T> =
  | { status: 'loading'; value: null; error: null }
  | { status: 'ready'; value: T; error: null }
  | { status: 'error'; value: null; error: unknown }

export const MODULE_LOADING_TEXTS = [
  '正在打扫竞技场',
  '重新放置旗帜',
  '准备奏响战鼓',
  '检查草丛里的伏兵',
  '清点双方行动点',
  '校准战士的冲锋路线',
  '给法师的魔杖充能',
  '替猎人的陷阱找个好位置',
  '正在铺平竞技场上的脚印',
  '把石块摆回视野盲区',
  '确认水坑没有被偷偷填平',
  '等待双方 Agent 入场',
  '正在唤醒战斗引擎',
  '让裁判确认双方代码',
  '检查技能冷却沙漏',
  '重新计算可见视野',
  '正在回收遗落的装备',
  '确认草丛隐藏规则',
  '给红蓝双方分配出生点',
  '正在抛出本局随机种子',
  '战鼓已经响起，Agent 正在思考',
  '双方策略正在互相试探'
] as const

export function randomModuleLoadingText(
  current?: string,
  random: () => number = Math.random
): string {
  const currentIndex = current === undefined ? -1 : MODULE_LOADING_TEXTS.indexOf(current as typeof MODULE_LOADING_TEXTS[number])
  const candidateCount = currentIndex === -1 ? MODULE_LOADING_TEXTS.length : MODULE_LOADING_TEXTS.length - 1
  let candidateIndex = Math.floor(random() * candidateCount)
  if (currentIndex !== -1 && candidateIndex >= currentIndex) candidateIndex += 1
  return MODULE_LOADING_TEXTS[candidateIndex]
}

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
  const [loadingText, setLoadingText] = useState(() => randomModuleLoadingText())
  useEffect(() => {
    if (state.status !== 'loading') return
    const timer = window.setInterval(() => {
      setLoadingText((current) => randomModuleLoadingText(current))
    }, 3000)
    return () => window.clearInterval(timer)
  }, [state.status])

  if (state.status === 'loading') {
    return <section className="agentduel-module-state" role="status"><div>{loadingText}</div></section>
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
