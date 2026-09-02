import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  TASK_PROMPTS,
  errorMessage,
  flattenModels,
  modelSelectionKey,
  type AgentTaskKind
} from './helpers.js'
import type { AgentConversationService, PreparedAgentConversation } from './service.js'

type AgentConversationComposerProps = Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'> & {
  service: AgentConversationService
  onSubmitted: (sessionId: SessionId) => void
}

export function AgentConversationComposer({
  service,
  useSessions,
  useWorkspaces,
  onSubmitted
}: AgentConversationComposerProps): React.JSX.Element {
  const workspaces = useWorkspaces(state => state.items)
  const workspaceState = useWorkspaces(state => state.state)
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
      ?? workspaces[0]
  }, [currentSessionId, workspaces])

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
