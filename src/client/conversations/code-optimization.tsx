import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, flattenModels, modelSelectionKey } from './helpers.js'
import type { AgentConversationService, PreparedAgentConversation } from './service.js'

export type AgentOptimizationResource =
  | { kind: 'character'; publicId: string }
  | { kind: 'team'; publicId: string }

type AgentCodeOptimizationProps = Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'> & {
  highlight?: boolean
  resource: AgentOptimizationResource
  initialPrompt: string
  service: AgentConversationService
  onHighlightComplete?: () => void
  onSubmitted: (sessionId: SessionId) => void
}

export const AGENT_OPTIMIZATION_HIGHLIGHT_MS = 3000

interface AgentOptimizationHighlightRuntime {
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (handle: number) => void
  setTimeout: (handler: TimerHandler, timeout?: number) => number
  clearTimeout: (id: number) => void
  matchMedia?: (query: string) => MediaQueryList
}

export function startAgentOptimizationHighlight(
  section: Pick<HTMLElement, 'scrollIntoView'> | null,
  onComplete: () => void,
  runtime: AgentOptimizationHighlightRuntime = window
): () => void {
  const frame = runtime.requestAnimationFrame(() => {
    const reduceMotion = runtime.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    section?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  })
  const timeout = runtime.setTimeout(onComplete, AGENT_OPTIMIZATION_HIGHLIGHT_MS)
  return () => {
    runtime.cancelAnimationFrame(frame)
    runtime.clearTimeout(timeout)
  }
}

export function AgentCodeOptimization({
  highlight = false,
  resource,
  initialPrompt,
  service,
  useSessions,
  useWorkspaces,
  onHighlightComplete,
  onSubmitted
}: AgentCodeOptimizationProps): React.JSX.Element {
  const headingId = useId()
  const promptId = useId()
  const modelId = useId()
  const sectionRef = useRef<HTMLDivElement>(null)
  const workspaces = useWorkspaces(state => state.items)
  const workspaceState = useWorkspaces(state => state.state)
  const currentSessionId = useSessions(state => state.current)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [prepared, setPrepared] = useState<PreparedAgentConversation | null>(null)
  const [modelKey, setModelKey] = useState('')
  const [reasoningEffort, setReasoningEffort] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<WorkspaceId | null>(null)
  const [selectingWorkspace, setSelectingWorkspace] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlighting, setHighlighting] = useState(highlight)

  useEffect(() => {
    if (!highlight) return
    setHighlighting(true)
    return startAgentOptimizationHighlight(sectionRef.current, () => {
      setHighlighting(false)
      onHighlightComplete?.()
    })
  }, [highlight, onHighlightComplete])

  const preferredWorkspace = useMemo(() => {
    const selectedWorkspace = selectedWorkspaceId === null
      ? undefined
      : workspaces.find(workspace => workspace.workspaceId === selectedWorkspaceId)
    const currentWorkspace = currentSessionId === undefined
      ? undefined
      : workspaces.find(workspace => workspace.sessionIds.includes(currentSessionId))
    return selectedWorkspace
      ?? currentWorkspace
      ?? workspaces[0]
  }, [currentSessionId, selectedWorkspaceId, workspaces])

  useEffect(() => {
    if (preferredWorkspace === undefined) {
      setPrepared(null)
      setModelKey('')
      setReasoningEffort('')
      setLoadingModels(false)
      return
    }
    let active = true
    setPrepared(null)
    setLoadingModels(true)
    setError(null)
    void service.prepare(preferredWorkspace.workspaceId).then((next) => {
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
  }, [preferredWorkspace, service])

  const selectableModels = useMemo(
    () => prepared === null ? [] : flattenModels(prepared),
    [prepared]
  )
  const selectedModel = selectableModels.find(item => modelSelectionKey({
    provider: item.provider,
    model: item.model.id
  }) === modelKey)

  const changeModel = (nextKey: string): void => {
    setModelKey(nextKey)
    const next = selectableModels.find(item => modelSelectionKey({
      provider: item.provider,
      model: item.model.id
    }) === nextKey)
    setReasoningEffort(next?.model.reasoning?.defaultEffort ?? '')
    setError(null)
  }

  const handleChooseWorkspace = async (): Promise<void> => {
    if (selectingWorkspace) return
    setSelectingWorkspace(true)
    setError(null)
    try {
      const workspaceId = await service.chooseWorkspace()
      if (workspaceId !== null) setSelectedWorkspaceId(workspaceId)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '无法添加工作区'))
    } finally {
      setSelectingWorkspace(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const normalizedPrompt = prompt.trim()
    if (normalizedPrompt === '') {
      setError('Prompt 不可为空')
      return
    }
    if (prepared === null || selectedModel === undefined || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const sessionId = await service.submit({
        sessionId: prepared.sessionId,
        prompt: normalizedPrompt,
        ...(resource.kind === 'character'
          ? { characterPublicId: resource.publicId }
          : { teamPublicId: resource.publicId }),
        selection: {
          provider: selectedModel.provider,
          model: selectedModel.model.id,
          ...(reasoningEffort === '' ? {} : { reasoningEffort })
        }
      })
      onSubmitted(sessionId)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '创建优化会话失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const noWorkspace = workspaces.length === 0
  return (
    <div
      ref={sectionRef}
      className={`agentduel-deathmode character-detail-section agentduel-character-agent-optimization${highlighting ? ' is-onboarding-highlighted' : ''}`}
    >
      <section aria-labelledby={headingId}>
        <div className="character-detail-section-heading">
          <h2 id={headingId}>Agent 代码优化</h2>
        </div>
        {noWorkspace ? (
          <div className="agentduel-character-workspace-card">
            <div>
              <h3>{workspaceState === 'loading' ? '正在读取工作区' : '选择 Agent 代码工作区'}</h3>
              <p>
                {workspaceState === 'loading'
                  ? '正在检查 DSH 中已有的工作区。'
                  : '选择当前 Agent 代码所在的目录，之后就可以直接通过 DeepSeek Harness 进行优化。'}
              </p>
            </div>
            <button
              className="agentduel-primary-button agentduel-character-workspace-button"
              type="button"
              disabled={workspaceState === 'loading' || selectingWorkspace}
              onClick={() => void handleChooseWorkspace()}
            >
              {workspaceState === 'loading'
                ? '正在读取…'
                : selectingWorkspace ? '正在添加…' : '选择工作区'}
            </button>
            {error ? <p className="character-detail-error" role="alert">{error}</p> : null}
          </div>
        ) : (
          <form className="agentduel-character-agent-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="agentduel-character-agent-prompt-field">
              <label className="agentduel-character-agent-label" htmlFor={promptId}>Prompt</label>
              <textarea
                id={promptId}
                className="agentduel-character-agent-prompt"
                value={prompt}
                disabled={submitting}
                rows={6}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  setError(null)
                }}
              />
            </div>
            <div className="agentduel-character-agent-controls">
              <div className="agentduel-character-agent-model-field">
                <label htmlFor={modelId}>模型</label>
                <select
                  id={modelId}
                  value={modelKey}
                  disabled={submitting || loadingModels || prepared === null || selectableModels.length === 0}
                  onChange={(event) => changeModel(event.target.value)}
                >
                  {workspaceState === 'loading' || loadingModels ? <option value="">正在读取模型…</option> : null}
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
              </div>
              <button
                className="agentduel-primary-button agentduel-character-agent-submit"
                type="submit"
                disabled={submitting || loadingModels || prepared === null || selectedModel === undefined || prompt.trim() === ''}
              >
                {submitting ? '正在创建会话…' : '优化 Agent 代码'}
              </button>
              <div className="agentduel-character-agent-instructions">
                在这里描述你的需求，DeepSeek Harness 会帮你编写和优化代码。
              </div>
            </div>
            {prepared?.failures.length ? (
              <details className="agentduel-agent-model-failures">
                <summary>部分模型提供方不可用</summary>
                {prepared.failures.map(failure => <p key={failure.id}>{failure.name}：{failure.message}</p>)}
              </details>
            ) : null}
            <div className="agentduel-character-agent-status" aria-live="polite">
              {error ? <p className="character-detail-error" role="alert">{error}</p> : null}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
