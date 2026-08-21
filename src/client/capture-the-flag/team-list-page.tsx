import { AgentDuelTeamList } from '@agentduel/capturetheflag/team-list'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'
import { mapTeamListItem } from './team-mappers.js'

export function TeamListPage({
  appKey,
  dashboardSummary,
  navigation
}: BasicPageProps & { dashboardSummary: DashboardSummaryCache }): React.JSX.Element {
  const [state, reload] = useLoadState(
    async (signal) => await dashboardSummary.get(appKey, 'zh-CN', signal),
    [appKey, dashboardSummary],
    () => dashboardSummary.peek(appKey)
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
        teams={state.value.teams.map(mapTeamListItem)}
      />
    </div>
  )
}
