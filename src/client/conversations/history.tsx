import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useSyncExternalStore } from 'react'
import { getConversationStatus, getCurrentSessionId, promptTitle } from './helpers.js'
import type { AgentConversationRecord, AgentConversationService } from './service.js'

export const MAX_DISPLAYED_AGENT_CONVERSATIONS = 5

export function getDisplayedAgentConversations(
  records: readonly AgentConversationRecord[]
): readonly AgentConversationRecord[] {
  return records.slice(0, MAX_DISPLAYED_AGENT_CONVERSATIONS)
}

type AgentConversationHistoryProps = Pick<
  PropsRuntime<'sidebar.footer.action'>,
  'useSessions' | 'useSessionStatus'
> & {
  service: AgentConversationService
  onOpen: (sessionId: string) => void
}

export function AgentConversationHistory({
  service,
  useSessions,
  useSessionStatus,
  onOpen
}: AgentConversationHistoryProps): React.JSX.Element | null {
  const records = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot)
  const current = useSessions(getCurrentSessionId)
  const summaries = useSessions(state => state.byId)
  const phase = useSessions(state => state.phase)
  const sessionStatuses = useSessionStatus(state => state)
  if (records.length === 0) return null

  return (
    <div className="agentduel-conversation-list" aria-label="AgentDuel 对话历史">
      {getDisplayedAgentConversations(records).map((record) => {
        const summary = summaries[record.sessionId as SessionId]
        const pendingInteraction = sessionStatuses.get(record.sessionId as SessionId)?.pendingInteraction
        const status = getConversationStatus(summary, pendingInteraction?.kind, phase !== 'ready')
        const title = summary?.title?.trim() || promptTitle(record.prompt)
        const selected = current === record.sessionId
        return (
          <div
            className={`agentduel-conversation-row${selected ? ' is-current' : ''}`}
            key={record.sessionId}
          >
            <button
              className="agentduel-conversation-open"
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onOpen(record.sessionId)}
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
            <button
              className="agentduel-conversation-delete"
              type="button"
              aria-label={`从代码优化列表删除“${title}”`}
              title="从代码优化列表删除"
              onClick={() => service.remove(record.sessionId)}
            >
              删除
            </button>
          </div>
        )
      })}
    </div>
  )
}
