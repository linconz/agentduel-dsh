import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { AgentConversationHistory } from '../conversations/history.js'
import { AgentDuelLogo } from './logo.js'
import { useAgentDuel, type AgentDuelInjected } from './model.js'
import type { AgentDuelRoute } from './routes.js'

type SidebarEntryProps = PropsRuntime<'sidebar.footer.action'> & AgentDuelInjected

export function SidebarEntry({
  wide,
  model,
  conversations,
  useSessions,
  useSessionPendingInteraction,
  useWorkspaces
}: SidebarEntryProps): React.JSX.Element {
  const snapshot = useAgentDuel(model)
  const rootRef = useRef<HTMLDivElement>(null)
  const archivedSessionIds = useWorkspaces(state => state.archivedSessionIds)
  const conversationRecords = useSyncExternalStore(
    conversations.subscribe,
    conversations.getSnapshot,
    conversations.getSnapshot
  )
  const archivedSessionIdSet = useMemo(
    () => new Set<string>(archivedSessionIds),
    [archivedSessionIds]
  )
  const hasAgentConversations = conversationRecords.some(
    record => !archivedSessionIdSet.has(record.sessionId)
  )

  useEffect(() => {
    conversations.synchronizeArchived(archivedSessionIds)
  }, [archivedSessionIds, conversations])

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

  return (
    <div ref={rootRef} className={`agentduel-root${snapshot.expanded ? ' agentduel-root--expanded' : ''}`}>
      <button className="agentduel-trigger" type="button" aria-expanded={snapshot.expanded} onClick={model.toggleExpanded}>
        <AgentDuelLogo />
        <span className="agentduel-trigger-label">AgentDuel</span>
        {snapshot.expanded ? (
          <svg
            className="agentduel-trigger-indicator"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M18 9c.852 0 1.297.986.783 1.623l-.076.084-6 6a1 1 0 0 1-1.32.083l-.094-.083-6-6-.083-.094-.054-.077-.054-.096-.017-.036-.027-.067-.032-.108-.01-.053-.01-.06-.004-.057v-.118l.005-.058.009-.06.01-.052.032-.108.027-.067.07-.132.065-.09.073-.081.094-.083.077-.054.096-.054.036-.017.067-.027.108-.032.053-.01.06-.01.057-.004z" />
          </svg>
        ) : null}
      </button>
      {snapshot.expanded ? (
        <nav className="agentduel-menu" aria-label="AgentDuel 功能">
          <SidebarButton current={snapshot.route.kind === 'spectate'} label="观战" onClick={() => model.navigate({ kind: 'spectate' })} />
          <SidebarButton current={false} label="排位赛天梯" onClick={() => window.open('https://www.agentduel.app/rank-list', '_blank', 'noopener,noreferrer')} />
          <SidebarButton current={snapshot.route.kind === 'battle-new'} label="开始对战" onClick={() => model.navigate({ kind: 'battle-new', search: '' })} />
          <div className="agentduel-separator" />
          <div className="agentduel-section">死斗模式</div>
          <SidebarButton current={isCharacterRoute(snapshot.route)} label="角色列表" onClick={() => model.navigate({ kind: 'character-list' })} />
          <SidebarButton current={snapshot.route.kind === 'deathmatch-battles'} label="最近战斗" onClick={() => model.navigate({ kind: 'deathmatch-battles' })} />
          <div className="agentduel-section">夺旗模式</div>
          <SidebarButton current={isTeamRoute(snapshot.route)} label="团队列表" onClick={() => model.navigate({ kind: 'team-list' })} />
          <SidebarButton current={snapshot.route.kind === 'capture-the-flag-battles'} label="最近战斗" onClick={() => model.navigate({ kind: 'capture-the-flag-battles' })} />

          {hasAgentConversations ? (
            <>
              <div className="agentduel-separator" />
              <div className="agentduel-section">Agent 代码优化</div>
              <AgentConversationHistory
                service={conversations}
                useSessions={useSessions}
                useSessionPendingInteraction={useSessionPendingInteraction}
                onOpen={(sessionId) => {
                  model.closePage()
                  conversations.open(sessionId)
                }}
              />
            </>
          ) : null}
          <div className="agentduel-separator" />
          <SidebarButton current={snapshot.route.kind === 'app-key'} label="设置" onClick={model.showAppKey} />
        </nav>
      ) : null}
    </div>
  )
}

function commonAncestor(first: HTMLElement, second: Node): HTMLElement | null {
  let current: HTMLElement | null = first
  while (current !== null) {
    if (current.contains(second)) return current
    current = current.parentElement
  }
  return null
}

function SidebarButton({ current, label, onClick }: { current: boolean; label: string; onClick: () => void }): React.JSX.Element {
  return <button className="agentduel-item" type="button" aria-current={current ? 'page' : undefined} onClick={onClick}>{label}</button>
}

function isCharacterRoute(route: AgentDuelRoute): boolean {
  return route.kind === 'character-list' || route.kind === 'character-create'
    || route.kind === 'character-detail' || route.kind === 'character-public-detail' || route.kind === 'character-edit'
}

function isTeamRoute(route: AgentDuelRoute): boolean {
  return route.kind === 'team-list' || route.kind === 'team-create'
    || route.kind === 'team-detail' || route.kind === 'team-public-detail' || route.kind === 'team-edit'
}
