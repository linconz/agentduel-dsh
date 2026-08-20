import { AgentDuelReplayPlayer, UnsupportedReplayVersionError } from '@agentduel/replay-player'
import type { NormalizedReplayResult } from '@agentduel/replay-player'
import { useEffect, useState } from 'react'
import {
  AgentDuelIntegrationError,
  fetchPublicBattleDetails,
  fetchPublicBattleReviewContext,
  fetchRecentRankedReplays,
  fetchReplayResult,
  normalizeBattleSharePath,
  type Battle,
  type RecentRankedReplayBattle
} from '../api/client.js'

type SpectateState =
  | { status: 'loading-list' | 'loading-replay' }
  | { status: 'empty' }
  | { status: 'ready'; battle: Battle; replay: NormalizedReplayResult; terrainRows: readonly string[] }
  | { status: 'error'; message: string }

export function SpectatePage(): React.JSX.Element {
  const [recentBattles, setRecentBattles] = useState<readonly RecentRankedReplayBattle[] | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<SpectateState>({ status: 'loading-list' })

  useEffect(() => {
    const controller = new AbortController()
    setRecentBattles(null)
    setSelectedIndex(0)
    setState({ status: 'loading-list' })
    void fetchRecentRankedReplays(controller.signal).then((battles) => {
      if (battles.length === 0) {
        setRecentBattles([])
        setState({ status: 'empty' })
        return
      }
      setRecentBattles(battles)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setState({ status: 'error', message: spectatorErrorMessage(error) })
    })
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    if (recentBattles === null || recentBattles.length === 0) return
    const controller = new AbortController()
    const selected = recentBattles[selectedIndex % recentBattles.length]
    if (selected === undefined) return
    setState({ status: 'loading-replay' })
    void (async () => {
      try {
        const battle = await fetchPublicBattleDetails(selected.battle_public_id, controller.signal)
        if (battle.status !== 'done' || !battle.replay_url || !battle.share_path) {
          throw new Error('RECENT_REPLAY_UNAVAILABLE')
        }
        const [replay, reviewContext] = await Promise.all([
          fetchReplayResult(battle.replay_url, controller.signal),
          fetchPublicBattleReviewContext(battle.share_path, controller.signal)
        ])
        if (controller.signal.aborted) return
        setState({
          status: 'ready',
          battle: normalizeBattleSharePath(battle),
          replay,
          terrainRows: reviewContext.map_snapshot.terrain_rows
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: spectatorErrorMessage(error) })
      }
    })()
    return () => controller.abort()
  }, [recentBattles, selectedIndex])

  if (state.status === 'ready') {
    return (
      <AgentDuelReplayPlayer
        key={state.battle.public_id}
        battle={state.battle}
        i18nMode="bundled"
        locale="zh-CN"
        ownParticipantPublicId={null}
        replayResult={state.replay}
        terrainRows={state.terrainRows}
        replayToolbar={(
          <button
            className="agentduel-spectate-next-button"
            type="button"
            disabled={(recentBattles?.length ?? 0) < 2}
            onClick={() => setSelectedIndex(index => (
              recentBattles === null || recentBattles.length === 0
                ? index
                : (index + 1) % recentBattles.length
            ))}
          >
            换一场战斗
          </button>
        )}
      />
    )
  }

  const loading = state.status === 'loading-list' || state.status === 'loading-replay'
  return (
    <section className="agentduel-module-state" role={loading ? 'status' : state.status === 'error' ? 'alert' : 'status'}>
      <div>
        <p className="agentduel-module-kicker">spectate</p>
        <h1>
          {state.status === 'loading-list'
            ? '正在获取最近排位战斗'
            : state.status === 'loading-replay'
              ? '正在加载对战回放'
              : state.status === 'empty'
                ? '暂无可观战的排位回放'
                : '观战回放暂时无法加载'}
        </h1>
        <p>
          {state.status === 'loading-list'
            ? '正在读取公开的最近排位战斗列表。'
            : state.status === 'loading-replay'
              ? '已选中战斗，正在读取战斗详情和回放资源。'
              : state.status === 'empty'
                ? '当前没有已经生成回放的公开排位战斗，请稍后再来。'
                : state.status === 'error'
                  ? state.message
                  : ''}
        </p>
        {!loading ? (
          <button type="button" onClick={() => setReloadKey(value => value + 1)}>重新加载</button>
        ) : null}
      </div>
    </section>
  )
}

function spectatorErrorMessage(error: unknown): string {
  if (error instanceof UnsupportedReplayVersionError) return '这场战斗的回放版本暂不受支持，请稍后重试。'
  if (error instanceof AgentDuelIntegrationError && error.status === 404) return '最近战斗已不可用，请重新获取观战列表。'
  return '无法读取最近战斗或回放资源，请稍后重试。'
}
