import {
  BattlesNewApiError,
  type BattleCharacterSummary,
  type BattleStartMap,
  type BattleStartParticipants,
  type BattleStartSelection,
  type BattleTeamSummary,
  type BattlesNewDataSource
} from '@agentduel/battles-new'
import {
  searchBattleTargets,
  startBattle,
  type BattleMap,
  type DashboardSummary
} from '../api/client.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { RunTurnstile } from '../shared/page-types.js'
import type { RequestScope } from '../shared/request-scope.js'
import { withTurnstile } from '../shared/request-scope.js'
import { toBattlesNewError } from './errors.js'
import type { BattleMapsCache } from './battle-maps-cache.js'
import { clearRecentBattlesAfterSuccess, type RecentBattlesCache } from './recent-battles-cache.js'

const MAP_ORDER = {
  deathmatch: ['default_arena', 'reedbank_ruins', 'thicket_maze'],
  captureTheFlag: ['default_arena', 'four_corners_ruins', 'bannerhold_heights']
} as const

interface BattleNewDataSourceOptions {
  appKey: string
  battleMaps: Pick<BattleMapsCache, 'get'>
  dashboardSummary: Pick<DashboardSummaryCache, 'get' | 'refresh'>
  recentBattles: Pick<RecentBattlesCache, 'clear'>
  requestScope: Pick<RequestScope, 'run'>
  runTurnstile: RunTurnstile
}

export function createBattleNewDataSource({
  appKey,
  battleMaps,
  dashboardSummary,
  recentBattles,
  requestScope,
  runTurnstile
}: BattleNewDataSourceOptions): BattlesNewDataSource {
  return {
    async loadParticipants(locale: 'zh-CN' | 'en-US') {
      try {
        return await requestScope.run(async (signal) => {
          const summary = await dashboardSummary.get(
            appKey,
            locale,
            signal
          )
          return selectBattleStartParticipants(summary)
        })
      } catch (error) {
        throw toBattlesNewError(error)
      }
    },
    async loadMaps(locale: 'zh-CN' | 'en-US') {
      try {
        return await requestScope.run(async (signal) => {
          const { deathmatch, captureTheFlag } = await battleMaps.get(appKey, locale, signal)
          return {
            deathmatch: selectAndSortMaps(deathmatch, MAP_ORDER.deathmatch),
            captureTheFlag: selectAndSortMaps(captureTheFlag, MAP_ORDER.captureTheFlag)
          }
        })
      } catch (error) {
        throw toBattlesNewError(error)
      }
    },
    async startBattle(selection: BattleStartSelection) {
      try {
        return await requestScope.run(async (signal) => {
          const isSpecifiedPractice = selection.battleType === 'practice'
            && selection.opponentSelection === 'specified'
          const retainedTargetPublicId = isSpecifiedPractice
            ? selection.targetPublicId?.trim() || null
            : null
          let targetPublicId = retainedTargetPublicId

          if (isSpecifiedPractice && targetPublicId === null) {
            targetPublicId = await resolveTargetPublicId(appKey, selection, signal)
          }

          const battle = await clearRecentBattlesAfterSuccess(recentBattles, appKey, async () => (
            await withTurnstile(runTurnstile, signal, async (token) => await startBattle(appKey, {
              mode: selection.mode,
              battleType: selection.battleType,
              challengerPublicId: selection.challengerPublicId,
              targetPublicId,
              revengeOfBattlePublicId: retainedTargetPublicId !== null
                ? selection.revengeOfBattlePublicId
                : null,
              mapId: selection.battleType === 'practice' ? selection.mapId : null
            }, token, selection.locale, signal))
          ))
          dashboardSummary.refresh(appKey, selection.locale)
          return { public_id: battle.public_id }
        })
      } catch (error) {
        throw toBattlesNewError(error)
      }
    }
  }
}

export function selectBattleStartParticipants(
  summary: DashboardSummary
): BattleStartParticipants {
  return {
    characters: summary.characters.map((character: BattleCharacterSummary) => ({
      public_id: character.public_id,
      name: character.name,
      code_source: character.code_source,
      active_code: character.active_code === null
        ? null
        : {
            version_no: character.active_code.version_no,
            agent_contract_version: character.active_code.agent_contract_version
          },
      ranked_results: character.ranked_results,
      battle_readiness: character.battle_readiness
    })),
    teams: summary.teams.map((team: BattleTeamSummary) => ({
      public_id: team.public_id,
      name: team.name,
      code_source: team.code_source,
      active_code: team.active_code === null
        ? null
        : {
            version_no: team.active_code.version_no,
            agent_contract_version: team.active_code.agent_contract_version
          },
      ranked_results: team.ranked_results,
      battle_readiness: team.battle_readiness
    }))
  }
}

function selectAndSortMaps(
  maps: readonly BattleMap[],
  preferredOrder: readonly string[]
): BattleStartMap[] {
  const ranks = new Map(preferredOrder.map((mapId, index) => [mapId, index]))
  return maps
    .map((map, originalIndex) => ({ map: selectBattleStartMap(map), originalIndex }))
    .sort((left, right) => {
      const leftRank = ranks.get(left.map.map_id) ?? Number.POSITIVE_INFINITY
      const rightRank = ranks.get(right.map.map_id) ?? Number.POSITIVE_INFINITY
      if (leftRank !== rightRank) return leftRank < rightRank ? -1 : 1
      return left.originalIndex - right.originalIndex
    })
    .map(({ map }) => map)
}

function selectBattleStartMap(map: BattleMap): BattleStartMap {
  return {
    map_id: map.map_id,
    name_key: map.name_key,
    width: map.width,
    height: map.height,
    asset_path: map.asset_path,
    min_agent_contract_version: map.min_agent_contract_version,
    is_enabled: map.is_enabled
  }
}

async function resolveTargetPublicId(
  appKey: string,
  selection: BattleStartSelection,
  signal: AbortSignal
): Promise<string> {
  const targetName = selection.targetName.trim()
  const targets = await searchBattleTargets(
    appKey,
    selection.mode,
    targetName,
    selection.locale,
    signal
  )
  const targetPublicId = targets.find(target => target.name.trim() === targetName)?.public_id
  if (targetPublicId === undefined) {
    throw new BattlesNewApiError(404, 'BATTLE_START_TARGET_NOT_FOUND')
  }
  return targetPublicId
}
