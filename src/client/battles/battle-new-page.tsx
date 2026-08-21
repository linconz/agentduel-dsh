import {
  AgentDuelBattlesNew,
  type BattleStartCreatedBattle,
  type BattleStartMode,
  type BattlesNewLinkProps
} from '@agentduel/battles-new'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { WEBSITE_BASE_URL } from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { WritePageProps } from '../shared/page-types.js'
import { useRequestScope } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { createBattleNewDataSource } from './battle-new-data-source.js'
import type { BattleMapsCache } from './battle-maps-cache.js'
import type { RecentBattlesCache } from './recent-battles-cache.js'

export function BattleNewPage({
  appKey,
  battleMaps,
  dashboardSummary,
  navigation,
  recentBattles,
  runTurnstile,
  search
}: WritePageProps & {
  battleMaps: BattleMapsCache
  dashboardSummary: DashboardSummaryCache
  recentBattles: RecentBattlesCache
  search: string
}): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo(() => createBattleNewDataSource({
    appKey,
    battleMaps,
    dashboardSummary,
    recentBattles,
    requestScope: scope,
    runTurnstile
  }), [appKey, battleMaps, dashboardSummary, recentBattles, runTurnstile, scope])

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
