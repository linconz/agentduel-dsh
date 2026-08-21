import {
  AgentDuelReplayPlayer,
  UnsupportedReplayVersionError,
  type NormalizedReplayResult
} from '@agentduel/replay-player'
import { AgentDuelBreadcrumbs } from '@agentduel/component'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import {
  AgentDuelIntegrationError,
  abortableDelay,
  fetchBattleDetails,
  fetchReplayResult,
  isInvalidAppKey,
  normalizeBattleSharePath,
  type Battle
} from '../api/client.js'
import { AgentCodeOptimization } from '../conversations/code-optimization.js'
import type { AgentConversationService } from '../conversations/service.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { OwnedEntitiesPageProps } from '../shared/page-types.js'
import { refreshOwnedEntitiesAfterCompletedBattle } from '../shared/owned-entities-cache.js'
import { routeHref } from '../shell/routes.js'
import { getReplayParticipantDetailHref, getStartAgainSearch } from './presenters.js'
import { battleReviewOptimization, type BattleReviewOptimization } from './review-prompt.js'
import { refreshRecentBattlesAfterCompletedBattle, type RecentBattlesCache } from './recent-battles-cache.js'

type ReplayPageProps = OwnedEntitiesPageProps
  & Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'>
  & {
    conversations: AgentConversationService
    dashboardSummary: DashboardSummaryCache
    onConversationSubmitted: (sessionId: SessionId) => void
    publicId: string
    recentBattles: RecentBattlesCache
  }

export function ReplayPage({
  appKey,
  conversations,
  dashboardSummary,
  navigation,
  ownedEntities,
  onConversationSubmitted,
  publicId,
  recentBattles,
  useSessions,
  useWorkspaces
}: ReplayPageProps): React.JSX.Element {
  const Link = useModuleLink(navigation)
  type ReplayState =
    | { status: 'loading' | 'waiting'; battle: Battle | null }
    | {
      status: 'ready'
      battle: Battle
      replay: NormalizedReplayResult
      ownPublicId: string | null
      optimization: BattleReviewOptimization | null
    }
    | { status: 'unavailable' | 'expired' | 'error'; battle: Battle | null; message: string }
  const [state, setState] = useState<ReplayState>({ status: 'loading', battle: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    void (async () => {
      try {
        let battle: Battle | null = null
        const delays = [0, 1000, 2000, 4000, 8000, 1000, 2000, 4000, 8000]
        for (let attempt = 0; attempt < delays.length; attempt += 1) {
          const delay = delays[attempt] ?? 0
          if (delay > 0) await abortableDelay(delay, controller.signal)
          battle = await fetchBattleDetails(appKey, publicId, controller.signal)
          if (disposed) return
          if (battle.status !== 'pending' && battle.status !== 'running') break
          setState({ status: 'waiting', battle })
        }
        if (!battle) throw new Error('没有读取到战斗信息')
        if (battle.status === 'pending' || battle.status === 'running') {
          setState({ status: 'expired', battle, message: '战斗仍在处理中，请稍后重新加载。' })
          return
        }
        refreshOwnedEntitiesAfterCompletedBattle(ownedEntities, appKey, battle.status)
        refreshRecentBattlesAfterCompletedBattle(recentBattles, appKey, battle.game_mode_id, battle.status)
        if (battle.status === 'done') dashboardSummary.refresh(appKey, 'zh-CN')
        if (battle.status !== 'done' || !battle.replay_url) {
          setState({ status: 'unavailable', battle, message: '这场战斗当前没有可用回放。' })
          return
        }
        const [replay, characters, teams] = await Promise.all([
          fetchReplayResult(battle.replay_url, controller.signal),
          ownedEntities.getCharacters(appKey, controller.signal),
          ownedEntities.getTeams(appKey, controller.signal)
        ])
        if (disposed) return
        const normalizedBattle = normalizeBattleSharePath(battle)
        const ownedIds = new Set([...characters, ...teams].map(item => item.public_id))
        const ownPublicId = normalizedBattle.participants.find(participant => (
          ownedIds.has(participant.public_id)
        ))?.public_id ?? null
        setState({
          status: 'ready',
          battle: normalizedBattle,
          replay,
          ownPublicId,
          optimization: battleReviewOptimization(normalizedBattle, characters, teams)
        })
      } catch (error) {
        if (disposed || controller.signal.aborted) return
        if (isInvalidAppKey(error)) {
          navigation.invalidateAppKey()
          return
        }
        const message = error instanceof UnsupportedReplayVersionError
          ? '该回放版本暂不受播放器支持。'
          : error instanceof AgentDuelIntegrationError && error.status === 404
            ? '找不到这场战斗。'
            : '战斗回放暂时无法加载。'
        setState({ status: 'error', battle: null, message })
      }
    })()
    return () => {
      disposed = true
      controller.abort()
    }
  }, [appKey, dashboardSummary, navigation, ownedEntities, publicId, recentBattles, reloadKey])

  if (state.status === 'ready') {
    const startAgainSearch = getStartAgainSearch(state.battle, state.ownPublicId)
    const isDeathmatch = state.battle.game_mode_id === 'deathmatch'
    return (
      <AgentDuelReplayPlayer
        battle={state.battle}
        breadcrumbNavigation={(
          <AgentDuelBreadcrumbs
            ariaLabel="战斗回放导航"
            items={[
              {
                href: routeHref({ kind: isDeathmatch ? 'character-list' : 'team-list' }),
                label: '备战室'
              },
              {
                href: routeHref({
                  kind: isDeathmatch ? 'deathmatch-battles' : 'capture-the-flag-battles'
                }),
                label: isDeathmatch ? '死斗模式' : '夺旗模式'
              },
              { label: '战斗回放' }
            ]}
            linkComponent={Link}
          />
        )}
        getParticipantHref={getReplayParticipantDetailHref}
        i18nMode="bundled"
        locale="zh-CN"
        ownParticipantPublicId={state.ownPublicId}
        participantLinkComponent={Link}
        participantTools={state.optimization ? (
          <AgentCodeOptimization
            resource={state.optimization.resource}
            initialPrompt={state.optimization.prompt}
            service={conversations}
            useSessions={useSessions}
            useWorkspaces={useWorkspaces}
            onSubmitted={onConversationSubmitted}
          />
        ) : null}
        replayToolbar={startAgainSearch !== null ? (
          <button
            className="agentduel-replay-toolbar-action"
            type="button"
            onClick={() => navigation.navigate({ kind: 'battle-new', search: startAgainSearch })}
          >再来一局</button>
        ) : null}
        replayResult={state.replay}
      />
    )
  }
  const isWaiting = state.status === 'loading' || state.status === 'waiting'
  return (
    <section className="agentduel-module-state" role={isWaiting ? 'status' : 'alert'}>
      <div>
        <p className="agentduel-module-kicker">battle replay</p>
        <h1>{isWaiting ? '正在准备战斗回放' : '无法播放回放'}</h1>
        <p>{isWaiting ? '战斗完成并生成回放后会自动开始播放。' : 'message' in state ? state.message : ''}</p>
        {!isWaiting ? (
          <div className="agentduel-module-actions">
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>重新加载</button>
            <button type="button" onClick={() => navigation.navigate(
              state.battle?.game_mode_id === 'captureTheFlag'
                ? { kind: 'capture-the-flag-battles' }
                : { kind: 'deathmatch-battles' }
            )}>返回最近战斗</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
