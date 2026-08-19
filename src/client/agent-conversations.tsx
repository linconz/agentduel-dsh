import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import type { ClientContext, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConnectionHandle,
  ModelCatalogModel,
  ModelProviderGroup,
  ModelSelection,
  SessionId,
  WorkspaceId
} from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

const CONVERSATION_STORAGE_KEY = 'agentduel.conversations.v1'
const MAX_STORED_CONVERSATIONS = 100

const TASK_PROMPTS = {
  optimize: `请检查当前工作区中的 AgentDuel Agent 代码，并结合已有的对局数据定位策略或实现缺陷。请直接完成可验证的优化，运行相关测试，并保留可提交的代码修改。最后说明修改内容、验证结果以及下一轮对战应重点观察的指标。`,
  analyze: `请分析当前工作区中可获得的 AgentDuel 对局记录、回放数据和 Agent 实现。请说明胜负关键、策略缺陷与异常行为，给出按收益排序的改进建议；如果证据足够，请直接实现最优先的改进并运行相关测试。`
} as const

type AgentTaskKind = keyof typeof TASK_PROMPTS

export interface AgentConversationRecord {
  sessionId: string
  prompt: string
  provider: string
  model: string
  reasoningEffort?: string
  createdAt: number
}

export interface PreparedAgentConversation {
  workspaceId: WorkspaceId
  sessionId: SessionId
  current: ModelSelection
  routable: boolean
  groups: readonly ModelProviderGroup[]
  failures: readonly { id: string; name: string; message: string }[]
}

export interface AgentConversationService {
  getSnapshot: () => readonly AgentConversationRecord[]
  subscribe: (listener: () => void) => () => void
  bindStorage: () => () => void
  prepare: (workspaceId: WorkspaceId) => Promise<PreparedAgentConversation>
  submit: (input: {
    sessionId: SessionId
    prompt: string
    selection: ModelSelection
  }) => Promise<SessionId>
  open: (sessionId: string) => void
}

export function createAgentConversationService(
  ctx: ClientContext,
  connection: ConnectionHandle
): AgentConversationService {
  let records = readStoredConversations()
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const storeRecord = (record: AgentConversationRecord): void => {
    records = [record, ...records.filter(item => item.sessionId !== record.sessionId)]
      .slice(0, MAX_STORED_CONVERSATIONS)
    try {
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(records))
    } catch {
      // 存储不可用时仍保留本次页面内的历史记录。
    }
    emit()
  }

  return {
    getSnapshot: () => records,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    bindStorage: () => {
      const handleStorage = (event: StorageEvent): void => {
        if (event.key !== CONVERSATION_STORAGE_KEY) return
        records = readStoredConversations()
        emit()
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
    prepare: async (workspaceId) => {
      const sessionId = await ctx.workspaces.connectWorkspace(workspaceId)
      const response = await connection.api.sessions.models({ sessionId })
      if (!response.result.ok) throw new Error(response.result.error.message)
      return {
        workspaceId,
        sessionId,
        current: response.result.value.current,
        routable: response.result.value.routable,
        groups: response.result.value.groups,
        failures: response.result.value.failures
      }
    },
    submit: async ({ sessionId, prompt, selection }) => {
      const selected = await connection.api.sessions.selectModel({
        sessionId,
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort === undefined
          ? {}
          : { reasoningEffort: selection.reasoningEffort })
      })
      if (!selected.result.ok) throw new Error(selected.result.error.message)

      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined) throw new Error('DSH 尚未准备好新对话，请重试')
      const accepted = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
      if (!accepted.ok) throw new Error(accepted.error.message)

      storeRecord({
        sessionId,
        prompt,
        provider: selected.result.value.selected.provider,
        model: selected.result.value.selected.model,
        ...(selected.result.value.selected.reasoningEffort === undefined
          ? {}
          : { reasoningEffort: selected.result.value.selected.reasoningEffort }),
        createdAt: Date.now()
      })
      return sessionId
    },
    open: (sessionId) => ctx.sessions.open(sessionId as SessionId)
  }
}

type AgentConversationHistoryProps = Pick<PropsRuntime<'sidebar.footer.action'>, 'useSessions'> & {
  service: AgentConversationService
  onOpen: (sessionId: string) => void
}

export function AgentConversationHistory({
  service,
  useSessions,
  onOpen
}: AgentConversationHistoryProps): React.JSX.Element | null {
  const records = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot)
  const current = useSessions(state => state.current)
  const summaries = useSessions(state => state.byId)
  const phase = useSessions(state => state.phase)
  if (records.length === 0) return null

  return (
    <div className="agentduel-conversation-list" aria-label="AgentDuel 对话历史">
      {records.map((record) => {
        const summary = summaries[record.sessionId as SessionId]
        const status = getConversationStatus(summary, phase !== 'ready')
        const title = summary?.title?.trim() || promptTitle(record.prompt)
        return (
          <button
            className="agentduel-conversation-row"
            type="button"
            aria-current={current === record.sessionId ? 'page' : undefined}
            onClick={() => onOpen(record.sessionId)}
            key={record.sessionId}
          >
            <span className="agentduel-conversation-row-main">
              <strong>{title}</strong>
              <small>{record.provider} / {record.model}</small>
            </span>
            <span className={`agentduel-conversation-status is-${status.tone}`}>
              <i aria-hidden="true" />
              {status.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type AgentConversationComposerProps = Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'> & {
  service: AgentConversationService
  onSubmitted: (sessionId: SessionId) => void
}

interface SelectableModel {
  provider: string
  providerName: string
  model: ModelCatalogModel
}

export function AgentConversationComposer({
  service,
  useSessions,
  useWorkspaces,
  onSubmitted
}: AgentConversationComposerProps): React.JSX.Element {
  const workspaces = useWorkspaces(state => state.items)
  const workspaceState = useWorkspaces(state => state.state)
  const recentWorkspaceId = useWorkspaces(state => state.recentWorkspaceId)
  const currentSessionId = useSessions(state => state.current)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [taskKind, setTaskKind] = useState<AgentTaskKind>('optimize')
  const [prompt, setPrompt] = useState<string>(TASK_PROMPTS.optimize)
  const [prepared, setPrepared] = useState<PreparedAgentConversation | null>(null)
  const [modelKey, setModelKey] = useState('')
  const [reasoningEffort, setReasoningEffort] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preferredWorkspace = useMemo(() => {
    const currentWorkspace = currentSessionId === undefined
      ? undefined
      : workspaces.find(workspace => workspace.sessionIds.includes(currentSessionId))
    return currentWorkspace
      ?? workspaces.find(workspace => workspace.workspaceId === recentWorkspaceId)
      ?? workspaces[0]
  }, [currentSessionId, recentWorkspaceId, workspaces])

  useEffect(() => {
    if (workspaces.some(workspace => workspace.workspaceId === workspaceId)) return
    setWorkspaceId(preferredWorkspace?.workspaceId ?? '')
  }, [preferredWorkspace, workspaceId, workspaces])

  useEffect(() => {
    const workspace = workspaces.find(item => item.workspaceId === workspaceId)
    if (workspace === undefined) {
      setPrepared(null)
      return
    }
    let active = true
    setPrepared(null)
    setLoadingModels(true)
    setError(null)
    void service.prepare(workspace.workspaceId).then((next) => {
      if (!active) return
      setPrepared(next)
      const firstAvailable = next.groups[0]?.models[0]
      const initial = next.routable || firstAvailable === undefined
        ? next.current
        : { provider: next.groups[0].id, model: firstAvailable.id }
      setModelKey(modelSelectionKey(initial))
      setReasoningEffort(
        initial.provider === next.current.provider && initial.model === next.current.model
          ? next.current.reasoningEffort ?? ''
          : firstAvailable?.reasoning?.defaultEffort ?? ''
      )
    }).catch((caught: unknown) => {
      if (active) setError(errorMessage(caught, '无法读取 DSH 模型列表'))
    }).finally(() => {
      if (active) setLoadingModels(false)
    })
    return () => { active = false }
  }, [service, workspaceId, workspaces])

  const selectableModels = useMemo(
    () => prepared === null ? [] : flattenModels(prepared),
    [prepared]
  )
  const selectedModel = selectableModels.find(item => modelSelectionKey({
    provider: item.provider,
    model: item.model.id
  }) === modelKey)
  const reasoningOptions = selectedModel?.model.reasoning?.efforts ?? []

  const changeTaskKind = (next: AgentTaskKind): void => {
    const previousTemplate = TASK_PROMPTS[taskKind]
    setTaskKind(next)
    if (prompt.trim() === '' || prompt === previousTemplate) setPrompt(TASK_PROMPTS[next])
  }

  const changeModel = (nextKey: string): void => {
    setModelKey(nextKey)
    const next = selectableModels.find(item => modelSelectionKey({
      provider: item.provider,
      model: item.model.id
    }) === nextKey)
    setReasoningEffort(next?.model.reasoning?.defaultEffort ?? '')
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const normalizedPrompt = prompt.trim()
    if (
      prepared === null
      || prepared.workspaceId !== workspaceId
      || selectedModel === undefined
      || submitting
    ) return
    if (normalizedPrompt === '') {
      setError('提示词不可为空')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const sessionId = await service.submit({
        sessionId: prepared.sessionId,
        prompt: normalizedPrompt,
        selection: {
          provider: selectedModel.provider,
          model: selectedModel.model.id,
          ...(reasoningEffort === '' ? {} : { reasoningEffort })
        }
      })
      onSubmitted(sessionId)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '提交提示词失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const noWorkspace = workspaceState !== 'loading' && workspaces.length === 0
  return (
    <div className="agentduel-agent-card">
      <header className="agentduel-agent-header">
        <p className="agentduel-eyebrow">AgentDuel 闭环</p>
        <h1>发起优化对话</h1>
        <p>选择 DSH 已配置的模型，并把 AgentDuel 任务作为新对话的第一条消息。提交后会自动打开该对话，运行状态也会保留在 AgentDuel 菜单中。</p>
      </header>

      {noWorkspace ? (
        <div className="agentduel-agent-empty" role="alert">
          <h2>需要一个 DSH 工作区</h2>
          <p>请先在 DSH 左侧的新对话页面添加当前 Agent 代码目录，再返回这里发起优化。</p>
        </div>
      ) : (
        <form className="agentduel-agent-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="agentduel-agent-task-tabs" aria-label="任务类型">
            <button type="button" aria-pressed={taskKind === 'optimize'} onClick={() => changeTaskKind('optimize')}>优化并提交代码</button>
            <button type="button" aria-pressed={taskKind === 'analyze'} onClick={() => changeTaskKind('analyze')}>分析对局</button>
          </div>

          <label className="agentduel-field-label" htmlFor="agentduel-agent-workspace">工作区</label>
          <select
            id="agentduel-agent-workspace"
            className="agentduel-agent-select"
            value={workspaceId}
            disabled={submitting || workspaceState === 'loading'}
            onChange={(event) => {
              setWorkspaceId(event.target.value)
              setPrepared(null)
              setError(null)
            }}
          >
            {workspaces.map(workspace => (
              <option value={workspace.workspaceId} key={workspace.workspaceId}>{workspace.title}</option>
            ))}
          </select>

          <label className="agentduel-field-label" htmlFor="agentduel-agent-model">模型</label>
          <select
            id="agentduel-agent-model"
            className="agentduel-agent-select"
            value={modelKey}
            disabled={submitting || loadingModels || prepared === null || prepared.workspaceId !== workspaceId || selectableModels.length === 0}
            onChange={(event) => changeModel(event.target.value)}
          >
            {loadingModels ? <option value="">正在读取模型…</option> : null}
            {prepared?.groups.map(group => (
              <optgroup label={group.name} key={group.id}>
                {selectableModels.filter(item => item.provider === group.id).map(item => (
                  <option
                    value={modelSelectionKey({ provider: item.provider, model: item.model.id })}
                    key={`${item.provider}:${item.model.id}`}
                  >
                    {item.model.name}
                  </option>
                ))}
              </optgroup>
            ))}
            {prepared?.routable && !prepared.groups.some(group => (
              group.id === prepared.current.provider
              && group.models.some(model => model.id === prepared.current.model)
            )) ? (
              <option value={modelSelectionKey(prepared.current)}>
                {prepared.current.provider} / {prepared.current.model}（当前）
              </option>
            ) : null}
          </select>

          {reasoningOptions.length > 0 ? (
            <>
              <label className="agentduel-field-label" htmlFor="agentduel-agent-reasoning">推理强度</label>
              <select
                id="agentduel-agent-reasoning"
                className="agentduel-agent-select"
                value={reasoningEffort}
                disabled={submitting}
                onChange={(event) => setReasoningEffort(event.target.value)}
              >
                <option value="">使用模型默认值</option>
                {reasoningOptions.map(effort => <option value={effort.id} key={effort.id}>{effort.name}</option>)}
              </select>
            </>
          ) : null}

          <label className="agentduel-field-label" htmlFor="agentduel-agent-prompt">任务提示词</label>
          <textarea
            id="agentduel-agent-prompt"
            className="agentduel-agent-prompt"
            rows={9}
            value={prompt}
            disabled={submitting}
            onChange={(event) => { setPrompt(event.target.value); setError(null) }}
          />
          <p className="agentduel-field-hint">可以补充对局编号、角色、期望指标或代码提交要求。</p>

          {prepared?.failures.length ? (
            <details className="agentduel-agent-model-failures">
              <summary>部分模型提供方不可用</summary>
              {prepared.failures.map(failure => <p key={failure.id}>{failure.name}：{failure.message}</p>)}
            </details>
          ) : null}
          <div className="agentduel-status" aria-live="polite">
            {error ? <p className="agentduel-error">{error}</p> : null}
          </div>
          <button
            className="agentduel-primary-button agentduel-agent-submit"
            type="submit"
            disabled={submitting || loadingModels || prepared === null || prepared.workspaceId !== workspaceId || selectedModel === undefined || prompt.trim() === ''}
          >
            {submitting ? '正在创建并提交…' : '提交给 Agent'}
          </button>
        </form>
      )}
    </div>
  )
}

function flattenModels(prepared: PreparedAgentConversation): SelectableModel[] {
  const models = prepared.groups.flatMap(group => group.models.map(model => ({
    provider: group.id,
    providerName: group.name,
    model
  })))
  const hasCurrent = models.some(item => (
    item.provider === prepared.current.provider && item.model.id === prepared.current.model
  ))
  if (hasCurrent || !prepared.routable) return models
  return [...models, {
    provider: prepared.current.provider,
    providerName: prepared.current.provider,
    model: { id: prepared.current.model, name: prepared.current.model }
  }]
}

function modelSelectionKey(selection: Pick<ModelSelection, 'provider' | 'model'>): string {
  return JSON.stringify([selection.provider, selection.model])
}

export function promptTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim()
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized
}

export function getConversationStatus(
  summary: SessionSummary | undefined,
  loading: boolean
): { label: string; tone: 'running' | 'waiting' | 'complete' | 'submitted' | 'missing' } {
  if (summary === undefined) return loading
    ? { label: '加载中', tone: 'submitted' }
    : { label: '不可用', tone: 'missing' }
  if (summary.pendingInteraction === 'approval') return { label: '等待确认', tone: 'waiting' }
  if (summary.pendingInteraction === 'plan-review') return { label: '等待方案确认', tone: 'waiting' }
  if (summary.pendingInteraction === 'question') return { label: '等待回答', tone: 'waiting' }
  if (summary.running) return { label: '运行中', tone: 'running' }
  if (summary.blank) return { label: '已提交', tone: 'submitted' }
  return { label: '已完成', tone: 'complete' }
}

function readStoredConversations(): AgentConversationRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CONVERSATION_STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAgentConversationRecord).slice(0, MAX_STORED_CONVERSATIONS)
  } catch {
    return []
  }
}

export function isAgentConversationRecord(value: unknown): value is AgentConversationRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<AgentConversationRecord>
  return typeof record.sessionId === 'string'
    && record.sessionId.length > 0
    && typeof record.prompt === 'string'
    && record.prompt.trim().length > 0
    && typeof record.provider === 'string'
    && typeof record.model === 'string'
    && (record.reasoningEffort === undefined || typeof record.reasoningEffort === 'string')
    && typeof record.createdAt === 'number'
    && Number.isFinite(record.createdAt)
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}
