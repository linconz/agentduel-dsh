import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { bindRecentBattlesCache, createRecentBattlesCache } from '../battles/recent-battles-cache.js'
import { bindBattleMapsCache, createBattleMapsCache } from '../battles/battle-maps-cache.js'
import { ConversationBattleLinkBridge } from '../conversations/battle-link-bridge.js'
import { createAgentConversationService } from '../conversations/service.js'
import { bindDashboardSummaryCache, createDashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import { bindOwnedEntitiesCache, createOwnedEntitiesCache } from '../shared/owned-entities-cache.js'
import { styles } from '../styles/styles.js'
import { agentDuelPackageStyles } from '../styles/package-styles.js'
import { createAgentDuelModel, type AgentDuelInjected } from './model.js'
import { AgentDuelPage } from './page-host.js'
import { SidebarEntry } from './sidebar.js'

export const inject = [
  'slots', 'sessions', 'workspaces', 'uiSession', 'uiConversation', 'uiWorkspace',
  'modelDirectories', 'remote', 'remote.session'
]

export function apply(ctx: ClientContext): void {
  const model = createAgentDuelModel()
  const battleMaps = createBattleMapsCache({ onUnauthorized: model.invalidateAppKey })
  const dashboardSummary = createDashboardSummaryCache({ onUnauthorized: model.invalidateAppKey })
  const ownedEntities = createOwnedEntitiesCache({ onUnauthorized: model.invalidateAppKey })
  const recentBattles = createRecentBattlesCache({ onUnauthorized: model.invalidateAppKey })
  const conversations = createAgentConversationService(ctx)
  const injectModel = (): AgentDuelInjected => ({
    model,
    battleMaps,
    conversations,
    dashboardSummary,
    ownedEntities,
    recentBattles,
    getSession: sessionId => ctx.sessions.binding(sessionId)?.session,
    getChat: (sessionId) => {
      const binding = ctx.sessions.binding(sessionId)
      return binding === undefined
        ? undefined
        : ctx.uiConversation.binding(binding).target('chat')
    }
  })
  installStyles(ctx)
  ctx.effect(() => bindBattleMapsCache(battleMaps, model), 'agentduel: battle maps cache')
  ctx.effect(() => bindDashboardSummaryCache(dashboardSummary, model), 'agentduel: dashboard summary cache')
  ctx.effect(() => bindOwnedEntitiesCache(ownedEntities, model), 'agentduel: owned entities cache')
  ctx.effect(() => bindRecentBattlesCache(recentBattles, model), 'agentduel: recent battles cache')
  ctx.effect(() => conversations.bindStorage(), 'agentduel: conversation storage')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'agentduel', order: 10, inject: injectModel }, SidebarEntry))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'agentduel-battle-link-bridge', inject: injectModel }, ConversationBattleLinkBridge))
  ctx.slots.inject('conversation', () => model.bindPage(() => ctx.slots.register({ name: 'conversation', priority: -10, inject: injectModel }, AgentDuelPage)))
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
