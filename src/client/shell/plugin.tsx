import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { bindRecentBattlesCache, createRecentBattlesCache } from '../battles/recent-battles-cache.js'
import { ConversationBattleLinkBridge } from '../conversations/battle-link-bridge.js'
import { createAgentConversationService } from '../conversations/service.js'
import { bindOwnedEntitiesCache, createOwnedEntitiesCache } from '../shared/owned-entities-cache.js'
import { styles } from '../styles/styles.js'
import { agentDuelPackageStyles } from '../styles/package-styles.js'
import { createAgentDuelModel, type AgentDuelInjected } from './model.js'
import { AgentDuelPage } from './page-host.js'
import { SidebarEntry } from './sidebar.js'

export const inject = ['slots', 'connection', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  const model = createAgentDuelModel()
  const ownedEntities = createOwnedEntitiesCache({ onUnauthorized: model.invalidateAppKey })
  const recentBattles = createRecentBattlesCache({ onUnauthorized: model.invalidateAppKey })
  const connection = ctx.get('connection') as ConnectionHandle
  const conversations = createAgentConversationService(ctx, connection)
  const injectModel = (): AgentDuelInjected => ({
    model,
    conversations,
    ownedEntities,
    recentBattles,
    getSession: sessionId => ctx.sessions.binding(sessionId)?.session
  })
  installStyles(ctx)
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
