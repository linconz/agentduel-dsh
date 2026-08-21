import {
  AgentDuelTeamEdit,
  type TeamEditDataSource,
  type TeamUpdateInput
} from '@agentduel/capturetheflag/team-edit'
import { useMemo } from 'react'
import { fetchOwnedTeam, updateTeam } from '../api/client.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import { useModuleLink } from '../shared/module-link.js'
import type { OwnedEntitiesWriteDetailPageProps } from '../shared/page-types.js'
import { refreshOwnedEntitiesAfterSuccess } from '../shared/owned-entities-cache.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toCaptureTheFlagTeam } from './team-mappers.js'
import { toCaptureTheFlagError } from './errors.js'

export function TeamEditPage({
  appKey,
  dashboardSummary,
  navigation,
  ownedEntities,
  publicId,
  runTurnstile
}: OwnedEntitiesWriteDetailPageProps & { dashboardSummary: DashboardSummaryCache }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamEditDataSource>(() => ({
    async loadTeam(teamPublicId: string) {
      return await scope.run(async (signal) => toCaptureTheFlagTeam(
        await fetchOwnedTeam(appKey, teamPublicId, signal)
      )).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async updateTeam(teamPublicId: string, input: TeamUpdateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => {
        const team = await refreshOwnedEntitiesAfterSuccess(ownedEntities, appKey, async () => (
          await updateTeam(appKey, teamPublicId, input, token, signal)
        ))
        dashboardSummary.refresh(appKey, 'zh-CN')
        return toCaptureTheFlagTeam(team)
      })).catch((error) => { throw toCaptureTheFlagError(error) })
    }
  }), [appKey, dashboardSummary, ownedEntities, runTurnstile, scope])
  return (
    <AgentDuelTeamEdit
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onTeamSaved={() => navigation.navigate({ kind: 'team-detail', publicId })}
      onUnauthorized={navigation.invalidateAppKey}
      teamDetailHref={(teamPublicId: string) => routeHref({ kind: 'team-detail', publicId: teamPublicId })}
      teamPublicId={publicId}
    />
  )
}
