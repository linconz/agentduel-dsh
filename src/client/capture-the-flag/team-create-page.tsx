import {
  AgentDuelTeamCreate,
  type CaptureTheFlagTeam,
  type TeamCreateDataSource,
  type TeamCreateInput
} from '@agentduel/capturetheflag/team-create'
import { useMemo } from 'react'
import { CONFIGURATION_SLOT_LIMIT, WEBSITE_BASE_URL, createTeam } from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { OwnedEntitiesWritePageProps } from '../shared/page-types.js'
import { refreshOwnedEntitiesAfterSuccess } from '../shared/owned-entities-cache.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toCaptureTheFlagTeam } from './team-mappers.js'
import { toCaptureTheFlagError } from './errors.js'

export function TeamCreatePage({
  appKey,
  dashboardSummary,
  navigation,
  ownedEntities,
  runTurnstile
}: OwnedEntitiesWritePageProps & { dashboardSummary: DashboardSummaryCache }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamCreateDataSource>(() => ({
    async loadContext() {
      return await scope.run(async (signal) => {
        const teams = await ownedEntities.getTeams(appKey, signal)
        return { teamCount: teams.length, maxTeamSlots: CONFIGURATION_SLOT_LIMIT }
      }).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async createTeam(input: TeamCreateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => {
        const team = await refreshOwnedEntitiesAfterSuccess(ownedEntities, appKey, async () => (
          await createTeam(appKey, input, token, signal)
        ))
        dashboardSummary.refresh(appKey, 'zh-CN')
        return toCaptureTheFlagTeam(team)
      })).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async resolveErrorMessage(error: unknown) {
      return error instanceof Error ? error.message : null
    }
  }), [appKey, dashboardSummary, ownedEntities, runTurnstile, scope])
  return (
    <AgentDuelTeamCreate
      assetBaseUrl={WEBSITE_BASE_URL}
      backToDashboardHref={routeHref({ kind: 'team-list' })}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onTeamCreated={(team: CaptureTheFlagTeam) => navigation.navigate({ kind: 'team-edit', publicId: team.public_id })}
      onUnauthorized={navigation.invalidateAppKey}
    />
  )
}
