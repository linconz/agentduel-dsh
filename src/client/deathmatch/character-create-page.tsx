import {
  AgentDuelCharacterCreate,
  type CharacterCreateDataSource,
  type CharacterCreateInput,
  type DeathmatchCharacter
} from '@agentduel/deathmode/character-create'
import { useMemo } from 'react'
import {
  CONFIGURATION_SLOT_LIMIT,
  WEBSITE_BASE_URL,
  createCharacter,
  fetchCharacters,
  fetchClasses
} from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { WritePageProps } from '../shared/page-types.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toDeathmodeCharacter } from './character-mappers.js'
import { toDeathmodeError } from './errors.js'

export function CharacterCreatePage({ appKey, navigation, runTurnstile }: WritePageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CharacterCreateDataSource>(() => ({
    async loadContext() {
      return await scope.run(async (signal) => {
        const [characters, enabledClasses] = await Promise.all([
          fetchCharacters(appKey, signal),
          fetchClasses(appKey, signal)
        ])
        return { characterCount: characters.length, maxCharacterSlots: CONFIGURATION_SLOT_LIMIT, enabledClasses }
      }).catch((error) => { throw toDeathmodeError(error) })
    },
    async createCharacter(input: CharacterCreateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => {
        const character = await createCharacter(appKey, { name: input.name, class_id: input.classId }, token, signal)
        return toDeathmodeCharacter(character)
      })).catch((error) => { throw toDeathmodeError(error) })
    },
    async resolveErrorMessage(error: unknown) {
      return error instanceof Error ? error.message : null
    }
  }), [appKey, runTurnstile, scope])

  return (
    <AgentDuelCharacterCreate
      assetBaseUrl={WEBSITE_BASE_URL}
      backToDashboardHref={routeHref({ kind: 'character-list' })}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onCharacterCreated={(character: DeathmatchCharacter) => navigation.navigate({ kind: 'character-edit', publicId: character.public_id })}
      onUnauthorized={navigation.invalidateAppKey}
    />
  )
}
