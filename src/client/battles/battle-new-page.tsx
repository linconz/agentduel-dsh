import {
  AgentDuelBattlesNew,
  BattlesNewApiError,
  type BattleActiveCodeSummary,
  type BattleReadiness,
  type BattleStartCreatedBattle,
  type BattleStartMode,
  type BattleStartSelection,
  type BattlesNewDataSource,
  type BattlesNewLinkProps
} from '@agentduel/battles-new'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  WEBSITE_BASE_URL,
  fetchMaps,
  fetchPublicCharacterVersion,
  fetchPublicTeamVersion,
  isInvalidAppKey,
  searchBattleTargets,
  startBattle,
  type BattleMap,
  type Character,
  type Team
} from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { OwnedEntitiesWritePageProps } from '../shared/page-types.js'
import { rankedResults } from '../shared/ranked-results.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toBattlesNewError } from './errors.js'
import { clearRecentBattlesAfterSuccess, type RecentBattlesCache } from './recent-battles-cache.js'

export function BattleNewPage({
  appKey,
  navigation,
  ownedEntities,
  recentBattles,
  runTurnstile,
  search
}: OwnedEntitiesWritePageProps & { recentBattles: RecentBattlesCache; search: string }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<BattlesNewDataSource>(() => ({
    async loadParticipants() {
      try {
        return await scope.run(async (signal) => {
          const [characters, teams] = await Promise.all([
            ownedEntities.getCharacters(appKey, signal),
            ownedEntities.getTeams(appKey, signal)
          ])
          return {
            characters: await Promise.all(characters.map(async (character) => ({
              public_id: character.public_id,
              name: character.name,
              code_source: character.code_source,
              active_code: await loadCharacterActiveCode(appKey, character, signal),
              ranked_results: rankedResults(character),
              battle_readiness: battleReadiness(character.status === 'active', null)
            }))),
            teams: await Promise.all(teams.map(async (team) => ({
              public_id: team.public_id,
              name: team.name,
              code_source: team.code_source,
              active_code: await loadTeamActiveCode(appKey, team, signal),
              ranked_results: rankedResults(team),
              battle_readiness: battleReadiness(team.status === 'active', team.code_source === 'none' ? 'team_code_required' : null)
            })))
          }
        })
      } catch (error) { throw toBattlesNewError(error) }
    },
    async loadMaps() {
      try {
        return await scope.run(async (signal) => {
          const [deathmatch, captureTheFlag] = await Promise.all([
            fetchMaps(appKey, 'deathmatch', undefined, signal),
            fetchMaps(appKey, 'captureTheFlag', undefined, signal)
          ])
          return { deathmatch: deathmatch.map(toBattleStartMap), captureTheFlag: captureTheFlag.map(toBattleStartMap) }
        })
      } catch (error) { throw toBattlesNewError(error) }
    },
    async startBattle(selection: BattleStartSelection) {
      try {
        return await scope.run(async (signal) => {
          let targetPublicId = selection.targetPublicId?.trim() || null
          if (selection.battleType === 'practice' && selection.opponentSelection === 'specified' && !targetPublicId) {
            const targetName = selection.targetName.trim()
            const targets = await searchBattleTargets(appKey, selection.mode, targetName, signal)
            targetPublicId = targets.find((target) => target.name.trim() === targetName)?.public_id ?? null
            if (!targetPublicId) throw new BattlesNewApiError(404, 'BATTLE_START_TARGET_NOT_FOUND')
          }
          const battle = await clearRecentBattlesAfterSuccess(recentBattles, appKey, async () => (
            await withTurnstile(runTurnstile, signal, async (token) => await startBattle(appKey, {
              mode: selection.mode,
              battleType: selection.battleType,
              challengerPublicId: selection.challengerPublicId,
              targetPublicId,
              revengeOfBattlePublicId: selection.revengeOfBattlePublicId,
              mapId: selection.mapId
            }, token, signal))
          ))
          return { public_id: battle.public_id }
        })
      } catch (error) { throw toBattlesNewError(error) }
    }
  }), [appKey, ownedEntities, recentBattles, runTurnstile, scope])

  return (
    <AgentDuelBattlesNew
      assetBaseUrl={WEBSITE_BASE_URL}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link as (props: BattlesNewLinkProps) => ReactNode}
      locale="zh-CN"
      onBattleCreated={(battle: BattleStartCreatedBattle) => navigation.navigate({ kind: 'replay', publicId: battle.public_id })}
      onModeChange={(mode: BattleStartMode) => navigation.navigate({ kind: 'battle-new', search: `mode=${mode}` })}
      onUnauthorized={navigation.invalidateAppKey}
      preparationRoomHrefs={{
        deathmatch: routeHref({ kind: 'character-list' }),
        captureTheFlag: routeHref({ kind: 'team-list' })
      }}
      rulesUrl="https://www.agentduel.app/document#document-rules"
      searchParams={search}
    />
  )
}

async function loadCharacterActiveCode(appKey: string, character: Character, signal: AbortSignal): Promise<BattleActiveCodeSummary | null> {
  if (character.status !== 'active' || character.code_source === 'default') return null
  try {
    const [version, maps] = await Promise.all([
      fetchPublicCharacterVersion(appKey, character.public_id, signal),
      fetchMaps(appKey, 'deathmatch', character.public_id, signal)
    ])
    const contract = maps.find((map) => map.participant_agent_contract_version)?.participant_agent_contract_version ?? null
    return version && contract ? { version_no: version.version_no, agent_contract_version: contract } : null
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

async function loadTeamActiveCode(appKey: string, team: Team, signal: AbortSignal): Promise<BattleActiveCodeSummary | null> {
  if (team.status !== 'active' || team.code_source === 'none') return null
  try {
    const [version, maps] = await Promise.all([
      fetchPublicTeamVersion(appKey, team.public_id, signal),
      fetchMaps(appKey, 'captureTheFlag', team.public_id, signal)
    ])
    const contract = maps.find((map) => map.participant_agent_contract_version)?.participant_agent_contract_version ?? null
    return version && contract ? { version_no: version.version_no, agent_contract_version: contract } : null
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

function battleReadiness(active: boolean, explicitReason: 'team_code_required' | null): { practice: BattleReadiness; ranked: BattleReadiness } {
  const blockingReason = explicitReason ?? (active ? null : 'content_restricted')
  const readiness: BattleReadiness = { can_request: blockingReason === null, blocking_reason: blockingReason }
  return { practice: readiness, ranked: readiness }
}

function toBattleStartMap(map: BattleMap) {
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
