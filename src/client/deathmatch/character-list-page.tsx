import { AgentDuelCharacterList } from '@agentduel/deathmode/character-list'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'
import { mapCharacterListItem } from './character-mappers.js'

export function CharacterListPage({
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

  if (state.status !== 'ready') return <ModuleLoadState label="角色列表" state={state} onRetry={reload} />
  return (
    <div className="agentduel-mode-list-shell">
      <AgentDuelCharacterList
        characters={state.value.characters.map(mapCharacterListItem)}
        createCharacterHref={routeHref({ kind: 'character-create' })}
        getCharacterHref={(publicId: string) => routeHref({ kind: 'character-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
    </div>
  )
}
