import { AgentDuelCharacterList, type DeathmatchCharacterListItem } from '@agentduel/deathmode/character-list'
import { fetchCharacters, fetchPublicCharacterVersion, isInvalidAppKey, type VersionSummary } from '../api/client.js'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { linkedAbortController } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { mapCharacterListItem } from './character-mappers.js'

export function CharacterListPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => await loadCharacterListItems(appKey, signal), [appKey])
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="角色列表" state={state} onRetry={reload} />
  return (
    <div className="agentduel-mode-list-shell">
      <AgentDuelCharacterList
        characters={state.value}
        createCharacterHref={routeHref({ kind: 'character-create' })}
        getCharacterHref={(publicId: string) => routeHref({ kind: 'character-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
    </div>
  )
}

async function loadCharacterListItems(appKey: string, signal: AbortSignal): Promise<DeathmatchCharacterListItem[]> {
  const characters = await fetchCharacters(appKey, signal)
  const enrichmentController = linkedAbortController(signal)
  const versions = await Promise.all(characters.map(async (character): Promise<VersionSummary | null> => {
    if (character.status !== 'active') return null
    try {
      return await fetchPublicCharacterVersion(appKey, character.public_id, enrichmentController.signal)
    } catch (error) {
      if (isInvalidAppKey(error)) {
        enrichmentController.abort()
        throw error
      }
      return null
    }
  }))
  return characters.map((character, index) => mapCharacterListItem(character, versions[index] ?? null))
}
