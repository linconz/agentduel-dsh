import {
  AgentDuelTeamEdit,
  type TeamEditDataSource,
  type TeamUpdateInput
} from '@agentduel/capturetheflag/team-edit'
import { useMemo } from 'react'
import { fetchOwnedTeam, updateTeam } from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { WriteDetailPageProps } from '../shared/page-types.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toCaptureTheFlagTeam } from './team-mappers.js'
import { toCaptureTheFlagError } from './errors.js'

export function TeamEditPage({ appKey, navigation, publicId, runTurnstile }: WriteDetailPageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamEditDataSource>(() => ({
    async loadTeam(teamPublicId: string) {
      return await scope.run(async (signal) => toCaptureTheFlagTeam(
        await fetchOwnedTeam(appKey, teamPublicId, signal)
      )).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async updateTeam(teamPublicId: string, input: TeamUpdateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => (
        toCaptureTheFlagTeam(await updateTeam(appKey, teamPublicId, input, token, signal))
      ))).catch((error) => { throw toCaptureTheFlagError(error) })
    }
  }), [appKey, runTurnstile, scope])
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
