import { AgentDuelTeamList, type CaptureTheFlagTeamListItem } from '@agentduel/capturetheflag/team-list'
import { fetchPublicTeamVersion, fetchTeams, isInvalidAppKey, type VersionSummary } from '../api/client.js'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { linkedAbortController } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { mapTeamListItem } from './team-mappers.js'

export function TeamListPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => await loadTeamListItems(appKey, signal), [appKey])
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="团队列表" state={state} onRetry={reload} />
  return (
    <div className="agentduel-mode-list-shell">
      <AgentDuelTeamList
        createTeamHref={routeHref({ kind: 'team-create' })}
        getTeamHref={(publicId: string) => routeHref({ kind: 'team-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        teams={state.value}
      />
    </div>
  )
}

async function loadTeamListItems(appKey: string, signal: AbortSignal): Promise<CaptureTheFlagTeamListItem[]> {
  const teams = await fetchTeams(appKey, signal)
  const enrichmentController = linkedAbortController(signal)
  const versions = await Promise.all(teams.map(async (team): Promise<VersionSummary | null> => {
    if (team.status !== 'active') return null
    try {
      return await fetchPublicTeamVersion(appKey, team.public_id, enrichmentController.signal)
    } catch (error) {
      if (isInvalidAppKey(error)) {
        enrichmentController.abort()
        throw error
      }
      return null
    }
  }))
  return teams.map((team, index) => mapTeamListItem(team, versions[index] ?? null))
}
