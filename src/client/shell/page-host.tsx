import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useCallback, useMemo, useRef } from 'react'
import { AgentConversationComposer } from '../conversations/composer.js'
import { OnboardingGate } from '../onboarding/gate.js'
import { AppKeyPage } from '../settings/app-key-page.js'
import type { RunTurnstile } from '../shared/page-types.js'
import { executeTurnstile, TurnstileVerificationError } from '../shared/turnstile.js'
import { SpectatePage } from '../spectate/spectate-page.js'
import { AgentDuelFeaturePage } from './feature-router.js'
import { useAgentDuel, type AgentDuelInjected } from './model.js'
import type { AgentDuelFeatureRoute, AgentDuelPageNavigation, AgentDuelRoute } from './routes.js'

type AgentDuelPageProps = PropsRuntime<'conversation'> & AgentDuelInjected

export function AgentDuelPage({
  model,
  battleMaps,
  conversations,
  dashboardSummary,
  ownedEntities,
  recentBattles,
  useSessions,
  useWorkspaces
}: AgentDuelPageProps): React.JSX.Element | null {
  const snapshot = useAgentDuel(model)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const runTurnstile = useCallback<RunTurnstile>(async (signal) => {
    const container = turnstileContainerRef.current
    if (!container) throw new TurnstileVerificationError()
    return await executeTurnstile(container, signal)
  }, [])
  const navigation = useMemo<AgentDuelPageNavigation>(() => ({ navigate: model.navigate, invalidateAppKey: model.invalidateAppKey }), [model])
  if (snapshot.route.kind === 'none') return null
  return (
    <section className="agentduel-page" aria-label={getRouteLabel(snapshot.route)}>
      {snapshot.route.kind === 'agent-conversation-new' ? (
        <AgentConversationComposer
          service={conversations}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          onSubmitted={(sessionId) => {
            model.closePage()
            conversations.open(sessionId)
          }}
        />
      ) : snapshot.route.kind === 'spectate' ? (
        <div className="agentduel-module-host">
          <SpectatePage navigation={navigation} />
        </div>
      ) : snapshot.route.kind === 'app-key' || snapshot.appKey === null ? (
        <AppKeyPage appKey={snapshot.appKey} model={model} runTurnstile={runTurnstile} />
      ) : (
        <OnboardingGate
          appKey={snapshot.appKey}
          dashboardSummary={dashboardSummary}
          navigation={navigation}
          route={snapshot.route as AgentDuelFeatureRoute}
        >
          {(highlightOptimizationPublicId, onOptimizationHighlightComplete) => (
            <AgentDuelFeaturePage
              appKey={snapshot.appKey as string}
              battleMaps={battleMaps}
              conversations={conversations}
              dashboardSummary={dashboardSummary}
              highlightOptimizationPublicId={highlightOptimizationPublicId}
              navigation={navigation}
              ownedEntities={ownedEntities}
              recentBattles={recentBattles}
              route={snapshot.route as AgentDuelFeatureRoute}
              runTurnstile={runTurnstile}
              useSessions={useSessions}
              useWorkspaces={useWorkspaces}
              onOptimizationHighlightComplete={onOptimizationHighlightComplete}
              onConversationSubmitted={(sessionId) => {
                model.closePage()
                conversations.open(sessionId)
              }}
            />
          )}
        </OnboardingGate>
      )}
      <div ref={turnstileContainerRef} className="agentduel-turnstile" />
    </section>
  )
}

function getRouteLabel(route: AgentDuelRoute): string {
  switch (route.kind) {
    case 'none': return 'AgentDuel'
    case 'app-key': return 'AgentDuel 设置'
    case 'agent-conversation-new': return 'AgentDuel 发起优化对话'
    case 'spectate': return 'AgentDuel 观战'
    case 'character-list': return 'AgentDuel 死斗角色列表'
    case 'character-create': return 'AgentDuel 新建死斗角色'
    case 'character-detail': return 'AgentDuel 死斗角色详情'
    case 'character-public-detail': return 'AgentDuel 对手角色详情'
    case 'character-edit': return 'AgentDuel 编辑死斗角色'
    case 'deathmatch-battles': return 'AgentDuel 死斗最近战斗'
    case 'team-list': return 'AgentDuel 夺旗团队列表'
    case 'team-create': return 'AgentDuel 新建夺旗团队'
    case 'team-detail': return 'AgentDuel 夺旗团队详情'
    case 'team-public-detail': return 'AgentDuel 对手团队详情'
    case 'team-edit': return 'AgentDuel 编辑夺旗团队'
    case 'capture-the-flag-battles': return 'AgentDuel 夺旗最近战斗'
    case 'battle-new': return 'AgentDuel 开始对战'
    case 'replay': return 'AgentDuel 战斗回放'
  }
}
