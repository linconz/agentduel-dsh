import {
  AgentDuelReplayPlayer,
  UnsupportedReplayVersionError,
  type NormalizedReplayResult
} from '@agentduel/replay-player'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import {
  AgentDuelIntegrationError,
  abortableDelay,
  fetchBattleDetails,
  fetchCharacters,
  fetchReplayResult,
  fetchTeams,
  isInvalidAppKey,
  normalizeBattleSharePath,
  type Battle
} from '../api/client.js'
import { AgentCodeOptimization } from '../conversations/code-optimization.js'
import type { AgentConversationService } from '../conversations/service.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { battleReviewOptimization, type BattleReviewOptimization } from './review-prompt.js'

type ReplayPageProps = BasicPageProps
  & Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'>
  & {
    conversations: AgentConversationService
    onConversationSubmitted: (sessionId: SessionId) => void
    publicId: string
  }

export function ReplayPage({
  appKey,
  conversations,
  navigation,
  onConversationSubmitted,
  publicId,
  useSessions,
  useWorkspaces
}: ReplayPageProps): React.JSX.Element {
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
        if (battle.status !== 'done' || !battle.replay_url) {
          setState({ status: 'unavailable', battle, message: '这场战斗当前没有可用回放。' })
          return
        }
        const [replay, characters, teams] = await Promise.all([
          fetchReplayResult(battle.replay_url, controller.signal),
          fetchCharacters(appKey, controller.signal),
          fetchTeams(appKey, controller.signal)
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
  }, [appKey, navigation, publicId, reloadKey])

  if (state.status === 'ready') {
    return (
      <AgentDuelReplayPlayer
        battle={state.battle}
        i18nMode="bundled"
        locale="zh-CN"
        ownParticipantPublicId={state.ownPublicId}
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
