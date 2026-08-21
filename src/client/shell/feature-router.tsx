import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { BattleNewPage } from '../battles/battle-new-page.js'
import type { BattleMapsCache } from '../battles/battle-maps-cache.js'
import { RecentBattlesPage } from '../battles/recent-battles-page.js'
import { ReplayPage } from '../battles/replay-page.js'
import type { RecentBattlesCache } from '../battles/recent-battles-cache.js'
import { TeamCreatePage } from '../capture-the-flag/team-create-page.js'
import { TeamDetailPage } from '../capture-the-flag/team-detail-page.js'
import { TeamEditPage } from '../capture-the-flag/team-edit-page.js'
import { TeamListPage } from '../capture-the-flag/team-list-page.js'
import { TeamPublicDetailPage } from '../capture-the-flag/team-public-detail-page.js'
import type { AgentConversationService } from '../conversations/service.js'
import { CharacterCreatePage } from '../deathmatch/character-create-page.js'
import { CharacterDetailPage } from '../deathmatch/character-detail-page.js'
import { CharacterEditPage } from '../deathmatch/character-edit-page.js'
import { CharacterListPage } from '../deathmatch/character-list-page.js'
import { CharacterPublicDetailPage } from '../deathmatch/character-public-detail-page.js'
import type { RunTurnstile } from '../shared/page-types.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { OwnedEntitiesCache } from '../shared/owned-entities-cache.js'
import type { AgentDuelFeatureRoute, AgentDuelPageNavigation } from './routes.js'

export function AgentDuelFeaturePage({
  appKey,
  battleMaps,
  conversations,
  dashboardSummary,
  highlightOptimizationPublicId,
  navigation,
  ownedEntities,
  recentBattles,
  onConversationSubmitted,
  route,
  runTurnstile,
  useSessions,
  useWorkspaces,
  onOptimizationHighlightComplete
}: Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'> & {
  appKey: string
  battleMaps: BattleMapsCache
  conversations: AgentConversationService
  dashboardSummary: DashboardSummaryCache
  highlightOptimizationPublicId: string | null
  navigation: AgentDuelPageNavigation
  ownedEntities: OwnedEntitiesCache
  recentBattles: RecentBattlesCache
  onConversationSubmitted: (sessionId: SessionId) => void
  route: AgentDuelFeatureRoute
  runTurnstile: RunTurnstile
  onOptimizationHighlightComplete: () => void
}): React.JSX.Element {
  const key = route.kind === 'character-detail' || route.kind === 'character-public-detail' || route.kind === 'character-edit'
    || route.kind === 'team-detail' || route.kind === 'team-public-detail' || route.kind === 'team-edit' || route.kind === 'replay'
    ? `${route.kind}:${route.publicId}`
    : route.kind

  return (
    <div className="agentduel-module-host" key={key}>
      {route.kind === 'character-list' ? <CharacterListPage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} /> : null}
      {route.kind === 'character-create' ? <CharacterCreatePage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} ownedEntities={ownedEntities} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'character-detail' ? (
        <CharacterDetailPage
          appKey={appKey}
          conversations={conversations}
          highlightAgentOptimization={highlightOptimizationPublicId === route.publicId}
          navigation={navigation}
          onAgentOptimizationHighlightComplete={onOptimizationHighlightComplete}
          publicId={route.publicId}
          runTurnstile={runTurnstile}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          onConversationSubmitted={onConversationSubmitted}
        />
      ) : null}
      {route.kind === 'character-public-detail' ? <CharacterPublicDetailPage appKey={appKey} navigation={navigation} publicId={route.publicId} /> : null}
      {route.kind === 'character-edit' ? <CharacterEditPage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} ownedEntities={ownedEntities} publicId={route.publicId} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'deathmatch-battles' ? <RecentBattlesPage mode="deathmatch" appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} recentBattles={recentBattles} /> : null}
      {route.kind === 'team-list' ? <TeamListPage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} /> : null}
      {route.kind === 'team-create' ? <TeamCreatePage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} ownedEntities={ownedEntities} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'team-detail' ? (
        <TeamDetailPage
          appKey={appKey}
          conversations={conversations}
          navigation={navigation}
          publicId={route.publicId}
          runTurnstile={runTurnstile}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          onConversationSubmitted={onConversationSubmitted}
        />
      ) : null}
      {route.kind === 'team-public-detail' ? <TeamPublicDetailPage appKey={appKey} navigation={navigation} publicId={route.publicId} /> : null}
      {route.kind === 'team-edit' ? <TeamEditPage appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} ownedEntities={ownedEntities} publicId={route.publicId} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'capture-the-flag-battles' ? <RecentBattlesPage mode="captureTheFlag" appKey={appKey} dashboardSummary={dashboardSummary} navigation={navigation} recentBattles={recentBattles} /> : null}
      {route.kind === 'battle-new' ? <BattleNewPage appKey={appKey} battleMaps={battleMaps} dashboardSummary={dashboardSummary} navigation={navigation} recentBattles={recentBattles} runTurnstile={runTurnstile} search={route.search} /> : null}
      {route.kind === 'replay' ? (
        <ReplayPage
          appKey={appKey}
          conversations={conversations}
          dashboardSummary={dashboardSummary}
          navigation={navigation}
          ownedEntities={ownedEntities}
          recentBattles={recentBattles}
          publicId={route.publicId}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          onConversationSubmitted={onConversationSubmitted}
        />
      ) : null}
    </div>
  )
}
