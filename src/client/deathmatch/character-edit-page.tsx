import {
  AgentDuelCharacterEdit,
  type CharacterEditDataSource,
  type CharacterUpdateInput
} from '@agentduel/deathmode/character-edit'
import { useMemo } from 'react'
import { fetchOwnedCharacter, updateCharacter } from '../api/client.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import { useModuleLink } from '../shared/module-link.js'
import type { OwnedEntitiesWriteDetailPageProps } from '../shared/page-types.js'
import { refreshOwnedEntitiesAfterSuccess } from '../shared/owned-entities-cache.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'
import { toDeathmodeCharacter } from './character-mappers.js'
import { toDeathmodeError } from './errors.js'

export function CharacterEditPage({
  appKey,
  dashboardSummary,
  navigation,
  ownedEntities,
  publicId,
  runTurnstile
}: OwnedEntitiesWriteDetailPageProps & { dashboardSummary: DashboardSummaryCache }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CharacterEditDataSource>(() => ({
    async loadCharacter(characterPublicId: string) {
      return await scope.run(async (signal) => toDeathmodeCharacter(
        await fetchOwnedCharacter(appKey, characterPublicId, signal)
      )).catch((error) => { throw toDeathmodeError(error) })
    },
    async updateCharacter(characterPublicId: string, input: CharacterUpdateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => {
        const character = await refreshOwnedEntitiesAfterSuccess(ownedEntities, appKey, async () => (
          await updateCharacter(appKey, characterPublicId, input, token, signal)
        ))
        dashboardSummary.refresh(appKey, 'zh-CN')
        return toDeathmodeCharacter(character)
      })).catch((error) => { throw toDeathmodeError(error) })
    }
  }), [appKey, dashboardSummary, ownedEntities, runTurnstile, scope])
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
