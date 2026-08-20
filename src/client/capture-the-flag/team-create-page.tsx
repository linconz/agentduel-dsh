import {
  AgentDuelTeamCreate,
  type CaptureTheFlagTeam,
  type TeamCreateDataSource,
  type TeamCreateInput
} from '@agentduel/capturetheflag/team-create'
import { useMemo } from 'react'
import { CONFIGURATION_SLOT_LIMIT, WEBSITE_BASE_URL, createTeam, fetchTeams } from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { WritePageProps } from '../shared/page-types.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toCaptureTheFlagTeam } from './team-mappers.js'
import { toCaptureTheFlagError } from './errors.js'

export function TeamCreatePage({ appKey, navigation, runTurnstile }: WritePageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamCreateDataSource>(() => ({
    async loadContext() {
      return await scope.run(async (signal) => {
        const teams = await fetchTeams(appKey, signal)
        return { teamCount: teams.length, maxTeamSlots: CONFIGURATION_SLOT_LIMIT }
      }).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async createTeam(input: TeamCreateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => (
        toCaptureTheFlagTeam(await createTeam(appKey, input, token, signal))
      ))).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async resolveErrorMessage(error: unknown) {
      return error instanceof Error ? error.message : null
    }
  }), [appKey, runTurnstile, scope])
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
