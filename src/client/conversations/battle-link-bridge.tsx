import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useAgentDuel, type AgentDuelInjected } from '../shell/model.js'
import { getConversationBattleSearch, getRecordedConversationBattleSearch } from './battle-links.js'
import { canOfferBattleFromConversation } from './completion.js'

type ConversationBattleLinkBridgeProps = PropsRuntime<'shell.overlay'> & AgentDuelInjected

export function ConversationBattleLinkBridge({
  conversations,
  getSession,
  model,
  useSessions
}: ConversationBattleLinkBridgeProps): React.JSX.Element | null {
  const agentDuelSnapshot = useAgentDuel(model)
  const currentSessionId = useSessions(state => state.current)
  const currentSession = currentSessionId === undefined ? undefined : getSession(currentSessionId)
  const subscribeCurrentSession = useCallback(
    (listener: () => void) => currentSession?.subscribe(listener) ?? (() => {}),
    [currentSession]
  )
  const getCurrentSessionSnapshot = useCallback(
    (): ConversationSnapshot | undefined => currentSession?.getSnapshot(),
    [currentSession]
  )
  const currentConversation = useSyncExternalStore(
    subscribeCurrentSession,
    getCurrentSessionSnapshot,
    getCurrentSessionSnapshot
  )
  const records = useSyncExternalStore(
    conversations.subscribe,
    conversations.getSnapshot,
    conversations.getSnapshot
  )
  const record = records.find(item => item.sessionId === currentSessionId)
  const [enhancedSessionId, setEnhancedSessionId] = useState<string | null>(null)
  const fallbackSearch = record === undefined ? null : getRecordedConversationBattleSearch(record)
  const canOfferBattle = canOfferBattleFromConversation(
    currentConversation,
    agentDuelSnapshot.route.kind !== 'none'
  )

  useEffect(() => {
    if (record === undefined || !canOfferBattle) return
    let enhancedAnchor: HTMLAnchorElement | null = null
    let scheduled = false
    let active = true

    const restoreAnchor = (): void => {
      if (enhancedAnchor === null) return
      const originalText = enhancedAnchor.dataset.agentduelOriginalText
      if (originalText !== undefined) enhancedAnchor.textContent = originalText
      enhancedAnchor.classList.remove('agentduel-conversation-battle-button')
      enhancedAnchor.removeAttribute('role')
      delete enhancedAnchor.dataset.agentduelBattleAction
      delete enhancedAnchor.dataset.agentduelBattleSearch
      delete enhancedAnchor.dataset.agentduelOriginalText
      enhancedAnchor = null
    }

    const enhanceLastBattleLink = (): void => {
      if (!active) return
      scheduled = false
      const candidates = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
        .map(anchor => ({ anchor, search: getConversationBattleSearch(record, anchor.href) }))
        .filter((candidate): candidate is { anchor: HTMLAnchorElement; search: string } => candidate.search !== null)
      const candidate = candidates.at(-1)
      if (candidate === undefined) {
        restoreAnchor()
        setEnhancedSessionId(current => current === record.sessionId ? null : current)
        return
      }
      setEnhancedSessionId(record.sessionId)
      if (enhancedAnchor === candidate.anchor) {
        candidate.anchor.dataset.agentduelBattleSearch = candidate.search
        if (candidate.anchor.textContent !== '开始对战') candidate.anchor.textContent = '开始对战'
        return
      }
      restoreAnchor()
      enhancedAnchor = candidate.anchor
      enhancedAnchor.dataset.agentduelOriginalText = enhancedAnchor.textContent ?? ''
      enhancedAnchor.dataset.agentduelBattleAction = 'true'
      enhancedAnchor.dataset.agentduelBattleSearch = candidate.search
      enhancedAnchor.classList.add('agentduel-conversation-battle-button')
      enhancedAnchor.setAttribute('role', 'button')
      enhancedAnchor.textContent = '开始对战'
    }

    const scheduleEnhancement = (): void => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(enhanceLastBattleLink)
    }
    const observer = new MutationObserver(scheduleEnhancement)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['href'],
      childList: true,
      subtree: true
    })
    const handleClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[data-agentduel-battle-action="true"]')
        : null
      const search = target?.dataset.agentduelBattleSearch
      if (target === null || search === undefined) return
      event.preventDefault()
      event.stopImmediatePropagation()
      model.navigate({ kind: 'battle-new', search })
    }
    document.addEventListener('click', handleClick, true)
    scheduleEnhancement()
    return () => {
      active = false
      observer.disconnect()
      document.removeEventListener('click', handleClick, true)
      restoreAnchor()
    }
  }, [canOfferBattle, model, record])

  if (
    record === undefined
    || !canOfferBattle
    || fallbackSearch === null
    || enhancedSessionId === record.sessionId
  ) return null

  return (
    <button
      className="agentduel-conversation-battle-button agentduel-conversation-battle-fallback"
      type="button"
      onClick={() => model.navigate({ kind: 'battle-new', search: fallbackSearch })}
    >
      开始对战
    </button>
  )
}
