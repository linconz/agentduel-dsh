import { AgentDuelCharacterList } from '@agentduel/deathmode/character-list'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { OwnedEntitiesPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'
import { mapCharacterListItem } from './character-mappers.js'

export function CharacterListPage({ appKey, navigation, ownedEntities }: OwnedEntitiesPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(
    async (signal) => await ownedEntities.getCharacterList(appKey, signal),
    [appKey, ownedEntities],
    () => ownedEntities.peekCharacterList(appKey)
  )
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="角色列表" state={state} onRetry={reload} />
  return (
    <div className="agentduel-mode-list-shell">
      <AgentDuelCharacterList
        characters={state.value.characters.map(character => mapCharacterListItem(
          character,
          state.value.versions.get(character.public_id) ?? null
        ))}
        createCharacterHref={routeHref({ kind: 'character-create' })}
        getCharacterHref={(publicId: string) => routeHref({ kind: 'character-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
    </div>
  )
}
