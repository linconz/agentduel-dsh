import { AgentDuelTeamList } from '@agentduel/capturetheflag/team-list'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { OwnedEntitiesPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'
import { mapTeamListItem } from './team-mappers.js'

export function TeamListPage({ appKey, navigation, ownedEntities }: OwnedEntitiesPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(
    async (signal) => await ownedEntities.getTeamList(appKey, signal),
    [appKey, ownedEntities],
    () => ownedEntities.peekTeamList(appKey)
  )
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
        teams={state.value.teams.map(team => mapTeamListItem(
          team,
          state.value.versions.get(team.public_id) ?? null
        ))}
      />
    </div>
  )
}
