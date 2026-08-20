import { AgentDuelBreadcrumbs } from '@agentduel/component'
import {
  AgentDuelTeamGuestBadges,
  AgentDuelTeamGuestBasic,
  AgentDuelTeamGuestCurrentVersion
} from '@agentduel/capturetheflag/team-detail'
import { fetchPublicTeam } from '../api/client.js'
import { BattleRecords } from '../battles/battle-records.js'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'

export function TeamPublicDetailPage({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const [state, reload] = useLoadState(
    async (signal) => await fetchPublicTeam(appKey, publicId, signal),
    [appKey, publicId]
  )
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="公开团队详情" state={state} onRetry={reload} />
  const team = state.value
  const challengeHref = routeHref({
    kind: 'battle-new',
    search: new URLSearchParams({
      mode: 'captureTheFlag',
      battle_type: 'practice',
      opponent: 'specified',
      target_team_public_id: publicId,
      target_name: team.name
    }).toString()
  })

  return (
    <div className="agentduel-owner-detail-shell">
      <div className="agentduel-capturetheflag agentduel-detail-breadcrumb">
        <AgentDuelBreadcrumbs
          ariaLabel="公开团队详情导航"
          items={[
            { href: routeHref({ kind: 'team-list' }), label: '备战室' },
            { href: routeHref({ kind: 'team-list' }), label: '夺旗模式' },
            { label: team.name }
          ]}
          linkComponent={Link}
        />
      </div>
      <AgentDuelTeamGuestBasic
        challengeHref={challengeHref}
        team={team}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        showRating
      />
      <AgentDuelTeamGuestBadges
        badges={team.badges}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <AgentDuelTeamGuestCurrentVersion
        version={team.team_version}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <BattleRecords mode="captureTheFlag" view="public" appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}
