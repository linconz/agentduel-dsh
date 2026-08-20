import { AgentDuelBreadcrumbs } from '@agentduel/component'
import {
  AgentDuelCharacterGuestBadges,
  AgentDuelCharacterGuestBasic,
  AgentDuelCharacterGuestCurrentVersion
} from '@agentduel/deathmode/character-detail'
import { fetchPublicCharacter } from '../api/client.js'
import { BattleRecords } from '../battles/battle-records.js'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'

export function CharacterPublicDetailPage({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const [state, reload] = useLoadState(
    async (signal) => await fetchPublicCharacter(appKey, publicId, signal),
    [appKey, publicId]
  )
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="公开角色详情" state={state} onRetry={reload} />
  const character = state.value
  const challengeHref = routeHref({
    kind: 'battle-new',
    search: new URLSearchParams({
      mode: 'deathmatch',
      battle_type: 'practice',
      opponent: 'specified',
      target_character_public_id: publicId,
      target_name: character.name
    }).toString()
  })

  return (
    <div className="agentduel-owner-detail-shell">
      <div className="agentduel-deathmode agentduel-detail-breadcrumb">
        <AgentDuelBreadcrumbs
          ariaLabel="公开角色详情导航"
          items={[
            { href: routeHref({ kind: 'character-list' }), label: '备战室' },
            { href: routeHref({ kind: 'character-list' }), label: '死斗模式' },
            { label: character.name }
          ]}
          linkComponent={Link}
        />
      </div>
      <AgentDuelCharacterGuestBasic
        challengeHref={challengeHref}
        character={character}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        showRating
      />
      <AgentDuelCharacterGuestBadges
        badges={character.badges}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <AgentDuelCharacterGuestCurrentVersion
        version={character.character_version}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <BattleRecords mode="deathmatch" view="public" appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}
