import { AgentDuelBreadcrumbs, buildAgentOptimizationPrompt } from '@agentduel/component'
import {
  AgentDuelCharacterOwnerBadges,
  AgentDuelCharacterOwnerBasic,
  AgentDuelCharacterOwnerCodeVersions,
  AgentDuelCharacterOwnerStatus,
  type CharacterDetailCodeVersions
} from '@agentduel/deathmode/character-detail'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import { BattleRecords } from '../battles/battle-records.js'
import { AgentCodeOptimization } from '../conversations/code-optimization.js'
import type { AgentConversationService } from '../conversations/service.js'
import {
  fetchOwnedCharacter,
  fetchPublicCharacterVersion,
  updateCharacterBadgeDisplay,
  WEBSITE_BASE_URL,
  type BattleType,
  type CharacterClassId,
  type OwnedCharacter,
  type OwnedPublicBadge,
  type VersionSummary
} from '../api/client.js'
import {
  applyBadgeDisplaySettings,
  handleBadgeDisplaySaveError,
  loadOptionalVersion
} from '../shared/detail-support.js'
import {
  ModuleLoadState,
  useLoadState,
  useUnauthorizedEffect
} from '../shared/load-state.js'
import { useModuleLink } from '../shared/module-link.js'
import type { WriteDetailPageProps } from '../shared/page-types.js'
import { useRequestScope, withTurnstile } from '../shared/request-scope.js'
import { routeHref } from '../shell/routes.js'

interface CharacterDetailData {
  character: OwnedCharacter
  version: VersionSummary | null
}

const CHARACTER_CLASS_NAMES: Record<CharacterClassId, string> = {
  warrior: '战士',
  mage: '法师',
  hunter: '猎人'
}

type CharacterDetailPageProps = WriteDetailPageProps
  & Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'>
  & {
    conversations: AgentConversationService
    highlightAgentOptimization: boolean
    onAgentOptimizationHighlightComplete: () => void
    onConversationSubmitted: (sessionId: SessionId) => void
  }

export function CharacterDetailPage({
  appKey,
  conversations,
  highlightAgentOptimization,
  navigation,
  onAgentOptimizationHighlightComplete,
  onConversationSubmitted,
  publicId,
  runTurnstile,
  useSessions,
  useWorkspaces
}: CharacterDetailPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => {
    const character = await fetchOwnedCharacter(appKey, publicId, signal)
    const version = await loadOptionalVersion(
      character.status === 'active',
      () => fetchPublicCharacterVersion(appKey, publicId, signal)
    )
    return { character, version } satisfies CharacterDetailData
  }, [appKey, publicId])
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)
  const scope = useRequestScope()
  const [battleType, setBattleType] = useState<BattleType>('practice')
  const [savedBadges, setSavedBadges] = useState<OwnedPublicBadge[] | null>(null)

  useEffect(() => {
    if (state.status === 'ready') setSavedBadges(state.value.character.badges)
  }, [state])

  if (state.status !== 'ready') return <ModuleLoadState label="角色详情" state={state} onRetry={reload} />
  const { character, version } = state.value
  const prompt = characterPrompt(character)

  return (
    <div className="agentduel-owner-detail-shell">
      <div className="agentduel-deathmode agentduel-detail-breadcrumb">
        <AgentDuelBreadcrumbs
          ariaLabel="角色详情导航"
          items={[
            { href: routeHref({ kind: 'character-list' }), label: '备战室' },
            { href: routeHref({ kind: 'character-list' }), label: '死斗模式' },
            { label: character.name }
          ]}
          linkComponent={Link}
        />
      </div>
      <AgentDuelCharacterOwnerBasic
        activeBattleType={battleType}
        canStartBattle={character.status === 'active'}
        character={character}
        editHref={routeHref({ kind: 'character-edit', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onBattleTypeChange={setBattleType}
        onStartBattle={() => navigation.navigate({
          kind: 'battle-new',
          search: new URLSearchParams({
            mode: 'deathmatch',
            battle_type: battleType,
            challenger_character_public_id: character.public_id
          }).toString()
        })}
      />
      <AgentDuelCharacterOwnerBadges
        badges={savedBadges ?? character.badges}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onSaveDisplay={async (equippedBadgeKeys: readonly string[], hiddenBadgeKeys: readonly string[]) => {
          try {
            const settings = await scope.run(async (signal) => await withTurnstile(
              runTurnstile,
              signal,
              async (token) => await updateCharacterBadgeDisplay(appKey, publicId, {
                equipped_badge_keys: [...equippedBadgeKeys],
                hidden_badge_keys: [...hiddenBadgeKeys]
              }, token, signal)
            ))
            setSavedBadges((current) => applyBadgeDisplaySettings(current ?? character.badges, settings))
          } catch (error) {
            handleBadgeDisplaySaveError(error, navigation, reload)
            throw error
          }
        }}
      />
      <AgentDuelCharacterOwnerStatus
        character={character}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <AgentCodeOptimization
        highlight={highlightAgentOptimization}
        resource={{ kind: 'character', publicId: character.public_id }}
        initialPrompt={prompt}
        service={conversations}
        useSessions={useSessions}
        useWorkspaces={useWorkspaces}
        onHighlightComplete={onAgentOptimizationHighlightComplete}
        onSubmitted={onConversationSubmitted}
      />
      <AgentDuelCharacterOwnerCodeVersions
        codeVersions={toCharacterCodeVersions(character, version)}
        error={null}
        settingVersionId={null}
        status="ready"
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onRetry={() => {}}
        onSetCurrentVersion={() => {}}
      />
      <BattleRecords mode="deathmatch" view="owned" appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}

export function characterPrompt(character: OwnedCharacter): string {
  const battleUrl = new URL('https://agentduel.app/battles/new')
  battleUrl.search = new URLSearchParams({
    mode: 'deathmatch',
    battle_type: 'practice',
    challenger_character_public_id: character.public_id
  }).toString()
  return buildAgentOptimizationPrompt({
      apiKey: character.api_key,
      characterClassId: character.class_id,
      characterClassName: CHARACTER_CLASS_NAMES[character.class_id],
      guideOrigin: WEBSITE_BASE_URL,
      messages: {
        apiKey: (apiKey: string) => `这是我的 api key: ${apiKey}`,
        currentClass: (classId: CharacterClassId) => `目标：1v1 死斗，当前角色职业：${classId}`,
        followGuide: (url: string) => `请完整阅读 ${url}\n并严格按文档编写我的代码。`
      }
    })
}

function toCharacterCodeVersions(
  character: OwnedCharacter,
  version: VersionSummary | null
): CharacterDetailCodeVersions | null {
  if (version === null) return null
  return {
    compiled_versions: [{
      public_id: `${character.public_id}:v${version.version_no}`,
      version_no: version.version_no,
      status: 'compiled',
      diagnostics: [],
      ai_model: version.ai_model,
      change_summary: version.change_summary,
      completed_at: character.updated_at,
      created_at: character.updated_at,
      is_current: true,
      is_available: true
    }],
    latest_submission: null
  }
}
