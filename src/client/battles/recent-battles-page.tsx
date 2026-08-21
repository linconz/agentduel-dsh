import {
  AgentDuelCaptureTheFlagRecentBattles,
  type CaptureTheFlagBattle,
  type CaptureTheFlagBattleRecordsQuery,
  type CaptureTheFlagRecentBattlesDataSource
} from '@agentduel/capturetheflag/recent-battles'
import {
  AgentDuelDeathmatchRecentBattles,
  type DeathmatchBattle,
  type DeathmatchBattleRecordsQuery,
  type DeathmatchRecentBattlesDataSource
} from '@agentduel/deathmode/recent-battles'
import { useMemo } from 'react'
import {
  WEBSITE_BASE_URL,
  type BattlePage,
  type DashboardSummary,
  type GameModeId
} from '../api/client.js'
import { toCaptureTheFlagError } from '../capture-the-flag/errors.js'
import { toDeathmodeError } from '../deathmatch/errors.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { useRequestScope, type RequestScope } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { getRevengeHref, toCaptureTheFlagBattle, toDeathmatchBattle } from './presenters.js'
import type { RecentBattlesCache, RecentBattlesQuery } from './recent-battles-cache.js'

type RecentModePageProps = BasicPageProps & {
  dashboardSummary: DashboardSummaryCache
  recentBattles: RecentBattlesCache
}

export type RecentBattlesPageProps = RecentModePageProps & { mode: GameModeId }

export function RecentBattlesPage(props: RecentBattlesPageProps): React.JSX.Element {
  return props.mode === 'deathmatch'
    ? <DeathmatchRecentBattles {...props} />
    : <CaptureTheFlagRecentBattles {...props} />
}

function DeathmatchRecentBattles({ appKey, dashboardSummary, navigation, recentBattles }: RecentModePageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<DeathmatchRecentBattlesDataSource>(() => {
    let summaryPromise: Promise<DashboardSummary> | undefined
    const loadSummary = (): Promise<DashboardSummary> => (
      summaryPromise ??= scope.run((signal) => dashboardSummary.get(appKey, 'zh-CN', signal))
    )
    const loadBattlePage = createAccountBattlePageLoader(appKey, 'deathmatch', scope, recentBattles)
    return {
      async loadContext() {
        try {
          const summary = await loadSummary()
          return { ownedCharacterPublicIds: summary.characters.map((character) => character.public_id) }
        } catch (error) { throw toDeathmodeError(error) }
      },
      async loadBattles(query: DeathmatchBattleRecordsQuery) {
        try {
          const page = await loadBattlePage(query)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toDeathmatchBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toDeathmodeError(error) }
      }
    }
  }, [appKey, dashboardSummary, recentBattles, scope])

  return (
    <div className="agentduel-recent-battles-shell">
      <AgentDuelDeathmatchRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dataSource={dataSource}
        getCharacterHref={(publicId: string, view: 'owned' | 'public') => view === 'owned'
          ? routeHref({ kind: 'character-detail', publicId })
          : routeHref({ kind: 'character-public-detail', publicId })}
        getReplayHref={getDeathmatchReplayHref}
        getRevengeHref={(battle: DeathmatchBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </div>
  )
}

function CaptureTheFlagRecentBattles({ appKey, dashboardSummary, navigation, recentBattles }: RecentModePageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CaptureTheFlagRecentBattlesDataSource>(() => {
    let summaryPromise: Promise<DashboardSummary> | undefined
    const loadSummary = (): Promise<DashboardSummary> => (
      summaryPromise ??= scope.run((signal) => dashboardSummary.get(appKey, 'zh-CN', signal))
    )
    const loadBattlePage = createAccountBattlePageLoader(appKey, 'captureTheFlag', scope, recentBattles)
    return {
      async loadContext() {
        try {
          const summary = await loadSummary()
          return { ownedTeamPublicIds: summary.teams.map((team) => team.public_id) }
        } catch (error) { throw toCaptureTheFlagError(error) }
      },
      async loadBattles(query: CaptureTheFlagBattleRecordsQuery) {
        try {
          const page = await loadBattlePage(query)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toCaptureTheFlagBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toCaptureTheFlagError(error) }
      }
    }
  }, [appKey, dashboardSummary, recentBattles, scope])

  return (
    <div className="agentduel-recent-battles-shell">
      <AgentDuelCaptureTheFlagRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dataSource={dataSource}
        getReplayHref={getCaptureTheFlagReplayHref}
        getRevengeHref={(battle: CaptureTheFlagBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        getTeamHref={(publicId: string, view: 'owned' | 'public') => view === 'owned'
          ? routeHref({ kind: 'team-detail', publicId })
          : routeHref({ kind: 'team-public-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </div>
  )
}

export function createAccountBattlePageLoader(
  appKey: string,
  gameModeId: GameModeId,
  scope: RequestScope,
  recentBattles: RecentBattlesCache
): (query: RecentBattlesQuery) => Promise<BattlePage> {
  return async (query) => await scope.run(async (signal) => (
    await recentBattles.getBattlePage(appKey, gameModeId, query, signal)
  ))
}

function getDeathmatchReplayHref(battle: DeathmatchBattle): string | null {
  return battle.replay_available || battle.status === 'pending' || battle.status === 'running'
    ? routeHref({ kind: 'replay', publicId: battle.public_id })
    : null
}

function getCaptureTheFlagReplayHref(battle: CaptureTheFlagBattle): string | null {
  return battle.replay_available || battle.status === 'pending' || battle.status === 'running'
    ? routeHref({ kind: 'replay', publicId: battle.public_id })
    : null
}
