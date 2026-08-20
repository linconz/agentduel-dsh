import {
  AgentDuelCharacterEdit,
  type CharacterEditDataSource,
  type CharacterUpdateInput
} from '@agentduel/deathmode/character-edit'
import { useMemo } from 'react'
import { fetchOwnedCharacter, updateCharacter } from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { WriteDetailPageProps } from '../shared/page-types.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toDeathmodeCharacter } from './character-mappers.js'
import { toDeathmodeError } from './errors.js'

export function CharacterEditPage({ appKey, navigation, publicId, runTurnstile }: WriteDetailPageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CharacterEditDataSource>(() => ({
    async loadCharacter(characterPublicId: string) {
      return await scope.run(async (signal) => toDeathmodeCharacter(
        await fetchOwnedCharacter(appKey, characterPublicId, signal)
      )).catch((error) => { throw toDeathmodeError(error) })
    },
    async updateCharacter(characterPublicId: string, input: CharacterUpdateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => (
        toDeathmodeCharacter(await updateCharacter(appKey, characterPublicId, input, token, signal))
      ))).catch((error) => { throw toDeathmodeError(error) })
    }
  }), [appKey, runTurnstile, scope])
  return (
    <AgentDuelCharacterEdit
      characterDetailHref={(characterPublicId: string) => routeHref({ kind: 'character-detail', publicId: characterPublicId })}
      characterPublicId={publicId}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onCharacterSaved={() => navigation.navigate({ kind: 'character-detail', publicId })}
      onUnauthorized={navigation.invalidateAppKey}
    />
  )
}
