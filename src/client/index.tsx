import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { AgentDuelLogo } from './AgentDuelLogo.js'
import {
  AgentConversationComposer,
  AgentConversationHistory,
  createAgentConversationService,
  type AgentConversationService
} from './agent-conversations.js'
import {
  AgentDuelFeaturePage,
  agentDuelPackageStyles,
  type AgentDuelPageNavigation,
  type AgentDuelRoute,
  type RunTurnstile
} from './pages.js'
import { styles } from './styles.js'
import { executeTurnstile, TurnstileVerificationError } from './turnstile.js'

const APP_KEY_STORAGE_KEY = 'agentduel.app_key'
const APP_KEY_PATTERN = /^agent_[A-Za-z0-9]{16}$/
const API_CHECK_URL = 'https://api.agentduel.app/api/integrations/check'

interface AgentDuelSnapshot {
  expanded: boolean
  route: AgentDuelRoute
  appKey: string | null
}

interface AgentDuelModel {
  getSnapshot: () => AgentDuelSnapshot
  subscribe: (listener: () => void) => () => void
  bindPage: (registerPage: () => () => void) => () => void
  toggleExpanded: () => void
  navigate: (route: AgentDuelRoute) => void
  showAppKey: () => void
  saveVerifiedAppKey: (appKey: string) => boolean
  resetAppKey: () => boolean
  invalidateAppKey: () => void
  closePage: () => void
}

interface AgentDuelInjected {
  model: AgentDuelModel
  conversations: AgentConversationService
}

interface CheckAppKeyResponse {
  valid: boolean
}

class AppKeyCheckError extends Error {
  constructor(
    public readonly kind: 'request' | 'rate-limit',
    public readonly retryAfterSeconds: number | null = null
  ) {
    super(kind)
  }
}

function isAppKey(value: string): boolean {
  return APP_KEY_PATTERN.test(value)
}

function readStoredAppKey(): string | null {
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

function maskAppKey(appKey: string): string {
  return `${appKey.slice(0, 10)}${'*'.repeat(12)}`
}

async function checkAppKey(appKey: string, turnstileToken: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(API_CHECK_URL, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN',
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

function createAgentDuelModel(): AgentDuelModel {
  let snapshot: AgentDuelSnapshot = {
    expanded: false,
    route: { kind: 'none' },
    appKey: readStoredAppKey()
  }
  const listeners = new Set<() => void>()
  let registerPage: (() => () => void) | undefined
  let disposePage: (() => void) | undefined

  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  const syncPage = (): void => {
    if (snapshot.route.kind !== 'none' && disposePage === undefined && registerPage !== undefined) disposePage = registerPage()
    if (snapshot.route.kind === 'none' && disposePage !== undefined) {
      disposePage()
      disposePage = undefined
    }
  }
  const update = (next: AgentDuelSnapshot): void => {
    snapshot = next
    syncPage()
    emit()
  }
  const showAppKey = (): void => update({ ...snapshot, expanded: true, route: { kind: 'app-key' } })
  const navigate = (route: AgentDuelRoute): void => {
    if (
      route.kind !== 'none'
      && route.kind !== 'app-key'
      && route.kind !== 'agent-conversation-new'
      && snapshot.appKey === null
    ) {
      showAppKey()
      return
    }
    update({ ...snapshot, expanded: true, route })
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    bindPage: (nextRegisterPage) => {
      registerPage = nextRegisterPage
      syncPage()
      return () => {
        disposePage?.()
        disposePage = undefined
        registerPage = undefined
      }
    },
    toggleExpanded: () => update({ ...snapshot, expanded: !snapshot.expanded }),
    navigate,
    showAppKey,
    saveVerifiedAppKey: (appKey) => {
      try { localStorage.setItem(APP_KEY_STORAGE_KEY, appKey) } catch { return false }
      update({ expanded: true, route: { kind: 'character-list' }, appKey })
      return true
    },
    resetAppKey: () => {
      try { localStorage.removeItem(APP_KEY_STORAGE_KEY) } catch { return false }
      update({ expanded: true, route: { kind: 'app-key' }, appKey: null })
      return true
    },
    invalidateAppKey: () => {
      try { localStorage.removeItem(APP_KEY_STORAGE_KEY) } catch { /* 设置页仍可继续使用。 */ }
      update({ expanded: true, route: { kind: 'app-key' }, appKey: null })
    },
    closePage: () => update({ ...snapshot, route: { kind: 'none' } })
  }
}

function useAgentDuel(model: AgentDuelModel): AgentDuelSnapshot {
  return useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot)
}

function commonAncestor(first: HTMLElement, second: Node): HTMLElement | null {
  let current: HTMLElement | null = first
  while (current !== null) {
    if (current.contains(second)) return current
    current = current.parentElement
  }
  return null
}

type SidebarEntryProps = PropsRuntime<'sidebar.footer.action'> & AgentDuelInjected

function SidebarEntry({ wide, model, conversations, useSessions }: SidebarEntryProps): React.JSX.Element {
  const snapshot = useAgentDuel(model)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    let disposed = false
    const handleSidebarNavigation = (event: MouseEvent): void => {
      const target = event.target
      if (!(target instanceof Node) || root.contains(target)) return
      const ancestor = commonAncestor(root, target)
      if (ancestor === null) return
      const rootRect = root.getBoundingClientRect()
      const ancestorRect = ancestor.getBoundingClientRect()
      if (ancestorRect.width > Math.max(rootRect.width + 64, 100)) return
      queueMicrotask(() => { if (!disposed) model.closePage() })
    }
    document.addEventListener('click', handleSidebarNavigation, true)
    return () => {
      disposed = true
      document.removeEventListener('click', handleSidebarNavigation, true)
    }
  }, [model])

  if (!wide) {
    return (
      <div ref={rootRef} className="agentduel-root agentduel-root--rail">
        <button className="agentduel-trigger" type="button" title="AgentDuel" aria-label="AgentDuel" aria-expanded={snapshot.expanded} aria-current={snapshot.route.kind !== 'none' ? 'page' : undefined} onClick={model.toggleExpanded}>
          <AgentDuelLogo />
        </button>
      </div>
    )
  }

  const currentMode = snapshot.route.kind === 'battle-new'
    ? new URLSearchParams(snapshot.route.search).get('mode') ?? 'deathmatch'
    : null
  return (
    <div ref={rootRef} className="agentduel-root">
      <button className="agentduel-trigger" type="button" aria-expanded={snapshot.expanded} onClick={model.toggleExpanded}>
        <AgentDuelLogo />
        <span className="agentduel-trigger-label">AgentDuel</span>
      </button>
      {snapshot.expanded ? (
        <nav className="agentduel-menu" aria-label="AgentDuel 功能">
          <AgentConversationHistory
            service={conversations}
            useSessions={useSessions}
            onOpen={(sessionId) => {
              model.closePage()
              conversations.open(sessionId)
            }}
          />
          <div className="agentduel-separator" />
          <div className="agentduel-section">死斗模式</div>
          <SidebarButton current={isCharacterRoute(snapshot.route)} label="角色列表" onClick={() => model.navigate({ kind: 'character-list' })} />
          <SidebarButton current={snapshot.route.kind === 'battle-new' && currentMode === 'deathmatch'} label="开始对战" onClick={() => model.navigate({ kind: 'battle-new', search: 'mode=deathmatch' })} />
          <SidebarButton current={snapshot.route.kind === 'deathmatch-battles'} label="最近战斗" onClick={() => model.navigate({ kind: 'deathmatch-battles' })} />
          <div className="agentduel-section">夺旗模式</div>
          <SidebarButton current={isTeamRoute(snapshot.route)} label="团队列表" onClick={() => model.navigate({ kind: 'team-list' })} />
          <SidebarButton current={snapshot.route.kind === 'battle-new' && currentMode === 'captureTheFlag'} label="开始对战" onClick={() => model.navigate({ kind: 'battle-new', search: 'mode=captureTheFlag' })} />
          <SidebarButton current={snapshot.route.kind === 'capture-the-flag-battles'} label="最近战斗" onClick={() => model.navigate({ kind: 'capture-the-flag-battles' })} />

          <div className="agentduel-separator" />
          <div className="agentduel-section">Agent 代码优化</div>
          <SidebarButton
            current={snapshot.route.kind === 'agent-conversation-new'}
            label="发起优化对话"
            onClick={() => model.navigate({ kind: 'agent-conversation-new' })}
          />
          <div className="agentduel-separator" />
          <SidebarButton current={snapshot.route.kind === 'app-key'} label="设置" onClick={model.showAppKey} />
        </nav>
      ) : null}
    </div>
  )
}

function SidebarButton({ current, label, onClick }: { current: boolean; label: string; onClick: () => void }): React.JSX.Element {
  return <button className="agentduel-item" type="button" aria-current={current ? 'page' : undefined} onClick={onClick}>{label}</button>
}

function isCharacterRoute(route: AgentDuelRoute): boolean {
  return route.kind === 'character-list' || route.kind === 'character-create'
    || route.kind === 'character-detail' || route.kind === 'character-edit'
}

function isTeamRoute(route: AgentDuelRoute): boolean {
  return route.kind === 'team-list' || route.kind === 'team-create'
    || route.kind === 'team-detail' || route.kind === 'team-edit'
}

function AppKeyPage({ appKey, model, runTurnstile }: { appKey: string | null; model: AgentDuelModel; runTurnstile: RunTurnstile }): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrySeconds, setRetrySeconds] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const verificationAbortRef = useRef<AbortController | null>(null)
  const cancelResetRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => verificationAbortRef.current?.abort(), [])
  useEffect(() => {
    if (retrySeconds === null || retrySeconds <= 0) return
    const timeout = window.setTimeout(() => setRetrySeconds((current) => current === null || current <= 1 ? null : current - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [retrySeconds])
  useEffect(() => { if (resetOpen) cancelResetRef.current?.focus() }, [resetOpen])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting || retrySeconds !== null) return
    const normalized = draft.trim()
    if (!isAppKey(normalized)) {
      setError(normalized ? 'App Key 格式应为 agent_ 加 16 位大小写字母或数字' : 'App Key 不可为空')
      return
    }
    const controller = new AbortController()
    verificationAbortRef.current?.abort()
    verificationAbortRef.current = controller
    setSubmitting(true)
    setError(null)
    let challenge: Awaited<ReturnType<RunTurnstile>> | null = null
    try {
      challenge = await runTurnstile(controller.signal)
      const valid = await checkAppKey(normalized, challenge.token, controller.signal)
      if (!valid) setError('App Key 无效或已失效')
      else if (!model.saveVerifiedAppKey(normalized)) setError('无法将 App Key 保存到本地，请检查浏览器存储设置')
      else setDraft('')
    } catch (caught: unknown) {
      if (controller.signal.aborted) return
      if (caught instanceof AppKeyCheckError && caught.kind === 'rate-limit') {
        const seconds = caught.retryAfterSeconds ?? 60
        setRetrySeconds(seconds)
        setError(`请求过于频繁，请在 ${seconds} 秒后重试`)
      } else if (caught instanceof TurnstileVerificationError) setError('安全验证失败，请稍后重试')
      else setError('暂时无法验证 App Key，请稍后重试')
    } finally {
      challenge?.release()
      if (verificationAbortRef.current === controller) verificationAbortRef.current = null
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  const confirmReset = (): void => {
    if (!model.resetAppKey()) {
      setError('无法删除本地 App Key，请检查浏览器存储设置')
      return
    }
    setDraft('')
    setRetrySeconds(null)
    setResetOpen(false)
  }
  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) setResetOpen(false)
  }

  return (
    <div className="agentduel-key-card">
      <header className="agentduel-key-header">
        <p className="agentduel-eyebrow">AgentDuel</p>
        <h1 className="agentduel-key-title">App Key 设置</h1>
        <p className="agentduel-key-description">配置 AgentDuel App Key 后即可使用角色、团队和战斗功能。</p>
      </header>
      {appKey === null ? (
        <form className="agentduel-key-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label className="agentduel-field-label" htmlFor="agentduel-app-key">App Key</label>
          <input id="agentduel-app-key" className="agentduel-key-input" type="text" value={draft} required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="agent_A1b2C3d4E5f6G7h8" disabled={submitting} aria-invalid={error !== null} onChange={(event) => { setDraft(event.target.value); setError(null) }} />
          <p className="agentduel-field-hint">格式：agent_ 加 16 位大小写字母或数字</p>
          <div className="agentduel-status" aria-live="polite">{error ? <p className="agentduel-error">{error}</p> : null}</div>
          <button className="agentduel-primary-button" type="submit" disabled={submitting || retrySeconds !== null || !draft.trim()}>{submitting ? '验证中…' : retrySeconds !== null ? `${retrySeconds} 秒后可重试` : '保存'}</button>
          <div className="agentduel-or" aria-hidden="true"><span /><b>OR</b><span /></div>
          <button className="agentduel-get-key-button" type="button" onClick={() => window.open('https://www.agentduel.app/dashboard/integrations', '_blank', 'noopener,noreferrer')}>获取一个 App Key</button>
        </form>
      ) : (
        <div className="agentduel-verified" aria-live="polite">
          <div className="agentduel-verified-mark">有效</div>
          <p className="agentduel-verified-label">已验证 Key</p>
          <code className="agentduel-masked-key">{maskAppKey(appKey)}</code>
          <button className="agentduel-reset-button" type="button" onClick={() => setResetOpen(true)}>重置 Key</button>
        </div>
      )}
      {resetOpen ? (
        <div className="agentduel-dialog-backdrop" onMouseDown={handleBackdropClick} onKeyDown={(event) => { if (event.key === 'Escape') setResetOpen(false) }}>
          <div className="agentduel-dialog" role="dialog" aria-modal="true" aria-labelledby="agentduel-reset-title">
            <h2 id="agentduel-reset-title">确认重置 Key？</h2>
            <p>确认后将删除本地 App Key，需要重新填写并验证。</p>
            <div className="agentduel-dialog-actions">
              <button ref={cancelResetRef} className="agentduel-secondary-button" type="button" onClick={() => setResetOpen(false)}>取消</button>
              <button className="agentduel-danger-button" type="button" onClick={confirmReset}>确认重置</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type AgentDuelPageProps = PropsRuntime<'conversation'> & AgentDuelInjected

function AgentDuelPage({
  model,
  conversations,
  useSessions,
  useWorkspaces
}: AgentDuelPageProps): React.JSX.Element | null {
  const snapshot = useAgentDuel(model)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const runTurnstile = useCallback<RunTurnstile>(async (signal) => {
    const container = turnstileContainerRef.current
    if (!container) throw new TurnstileVerificationError()
    return await executeTurnstile(container, signal)
  }, [])
  const navigation = useMemo<AgentDuelPageNavigation>(() => ({ navigate: model.navigate, invalidateAppKey: model.invalidateAppKey }), [model])
  if (snapshot.route.kind === 'none') return null
  return (
    <section className="agentduel-page" aria-label={getRouteLabel(snapshot.route)}>
      {snapshot.route.kind === 'agent-conversation-new' ? (
        <AgentConversationComposer
          service={conversations}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          onSubmitted={(sessionId) => {
            model.closePage()
            conversations.open(sessionId)
          }}
        />
      ) : snapshot.route.kind === 'app-key' || snapshot.appKey === null ? (
        <AppKeyPage appKey={snapshot.appKey} model={model} runTurnstile={runTurnstile} />
      ) : (
        <AgentDuelFeaturePage appKey={snapshot.appKey} navigation={navigation} route={snapshot.route} runTurnstile={runTurnstile} />
      )}
      <div ref={turnstileContainerRef} className="agentduel-turnstile" />
    </section>
  )
}

function getRouteLabel(route: AgentDuelRoute): string {
  switch (route.kind) {
    case 'none': return 'AgentDuel'
    case 'app-key': return 'AgentDuel App Key 设置'
    case 'agent-conversation-new': return 'AgentDuel 发起优化对话'
    case 'character-list': return 'AgentDuel 死斗角色列表'
    case 'character-create': return 'AgentDuel 新建死斗角色'
    case 'character-detail': return 'AgentDuel 死斗角色详情'
    case 'character-edit': return 'AgentDuel 编辑死斗角色'
    case 'deathmatch-battles': return 'AgentDuel 死斗最近战斗'
    case 'team-list': return 'AgentDuel 夺旗团队列表'
    case 'team-create': return 'AgentDuel 新建夺旗团队'
    case 'team-detail': return 'AgentDuel 夺旗团队详情'
    case 'team-edit': return 'AgentDuel 编辑夺旗团队'
    case 'capture-the-flag-battles': return 'AgentDuel 夺旗最近战斗'
    case 'battle-new': return 'AgentDuel 开始对战'
    case 'replay': return 'AgentDuel 战斗回放'
  }
}

function installStyles(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'agentduel-dsh'
    style.dataset.pluginCss = 'agentduel-dsh/styles'
    style.textContent = `${agentDuelPackageStyles}\n${styles}`
    document.head.appendChild(style)
    return () => style.remove()
  }, 'agentduel: styles')
}

export const inject = ['slots', 'connection']

export function apply(ctx: ClientContext): void {
  const model = createAgentDuelModel()
  const connection = ctx.get('connection') as ConnectionHandle
  const conversations = createAgentConversationService(ctx, connection)
  const injectModel = (): AgentDuelInjected => ({ model, conversations })
  installStyles(ctx)
  ctx.effect(() => conversations.bindStorage(), 'agentduel: conversation storage')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'agentduel', order: 10, inject: injectModel }, SidebarEntry))
  ctx.slots.inject('conversation', () => model.bindPage(() => ctx.slots.register({ name: 'conversation', priority: -10, inject: injectModel }, AgentDuelPage)))
}
