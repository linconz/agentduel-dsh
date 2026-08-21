import type { SessionFace } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { useSyncExternalStore } from 'react'
import type { AgentConversationService } from '../conversations/service.js'
import type { RecentBattlesCache } from '../battles/recent-battles-cache.js'
import type { BattleMapsCache } from '../battles/battle-maps-cache.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import { readStoredAppKey, removeStoredAppKey, saveStoredAppKey } from '../settings/app-key.js'
import type { OwnedEntitiesCache } from '../shared/owned-entities-cache.js'
import { requiresAgentDuelAppKey, type AgentDuelRoute } from './routes.js'

export interface AgentDuelSnapshot {
  expanded: boolean
  route: AgentDuelRoute
  appKey: string | null
}

export interface AgentDuelModel {
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

export interface AgentDuelInjected {
  model: AgentDuelModel
  battleMaps: BattleMapsCache
  conversations: AgentConversationService
  dashboardSummary: DashboardSummaryCache
  ownedEntities: OwnedEntitiesCache
  recentBattles: RecentBattlesCache
  getSession: (sessionId: SessionId) => SessionFace | undefined
}

export function createAgentDuelModel(): AgentDuelModel {
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
    if (requiresAgentDuelAppKey(route) && snapshot.appKey === null) {
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
      if (!saveStoredAppKey(appKey)) return false
      update({ expanded: true, route: { kind: 'character-list' }, appKey })
      return true
    },
    resetAppKey: () => {
      if (!removeStoredAppKey()) return false
      update({ expanded: true, route: { kind: 'app-key' }, appKey: null })
      return true
    },
    invalidateAppKey: () => {
      removeStoredAppKey()
      update({ expanded: true, route: { kind: 'app-key' }, appKey: null })
    },
    closePage: () => update({ ...snapshot, route: { kind: 'none' } })
  }
}

export function useAgentDuel(model: AgentDuelModel): AgentDuelSnapshot {
  return useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot)
}
