import { AgentDuelBreadcrumbs, buildTeamOptimizationPrompt } from '@agentduel/component'
import {
  AgentDuelTeamOwnerBadges,
  AgentDuelTeamOwnerBasic,
  AgentDuelTeamOwnerCodeVersions,
  AgentDuelTeamOwnerStatus,
  type TeamDetailCodeVersions
} from '@agentduel/capturetheflag/team-detail'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import { BattleRecords } from '../battles/battle-records.js'
import { AgentCodeOptimization } from '../conversations/code-optimization.js'
import type { AgentConversationService } from '../conversations/service.js'
import {
  fetchOwnedTeam,
  fetchPublicTeamVersion,
  updateTeamBadgeDisplay,
  WEBSITE_BASE_URL,
  type BattleType,
  type OwnedPublicBadge,
  type OwnedTeam,
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

interface TeamDetailData {
  team: OwnedTeam
  version: VersionSummary | null
}

type TeamDetailPageProps = WriteDetailPageProps
  & Pick<PropsRuntime<'conversation'>, 'useSessions' | 'useWorkspaces'>
  & {
    conversations: AgentConversationService
    onConversationSubmitted: (sessionId: SessionId) => void
  }

export function TeamDetailPage({
  appKey,
  conversations,
  navigation,
  onConversationSubmitted,
  publicId,
  runTurnstile,
  useSessions,
  useWorkspaces
}: TeamDetailPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => {
    const team = await fetchOwnedTeam(appKey, publicId, signal)
    const version = await loadOptionalVersion(
      team.status === 'active',
      () => fetchPublicTeamVersion(appKey, publicId, signal)
    )
    return { team, version } satisfies TeamDetailData
  }, [appKey, publicId])
  useUnauthorizedEffect(state.error, navigation)
  const Link = useModuleLink(navigation)
  const scope = useRequestScope()
  const [battleType, setBattleType] = useState<BattleType>('practice')
  const [savedBadges, setSavedBadges] = useState<OwnedPublicBadge[] | null>(null)

  useEffect(() => {
    if (state.status === 'ready') setSavedBadges(state.value.team.badges)
  }, [state])

  if (state.status !== 'ready') return <ModuleLoadState label="团队详情" state={state} onRetry={reload} />
  const { team, version } = state.value
  const prompt = teamPrompt(team)

  return (
    <div className="agentduel-owner-detail-shell">
      <div className="agentduel-capturetheflag agentduel-detail-breadcrumb">
        <AgentDuelBreadcrumbs
          ariaLabel="团队详情导航"
          items={[
            { href: routeHref({ kind: 'team-list' }), label: '备战室' },
            { href: routeHref({ kind: 'team-list' }), label: '夺旗模式' },
            { label: team.name }
          ]}
          linkComponent={Link}
        />
      </div>
      <AgentDuelTeamOwnerBasic
        activeBattleType={battleType}
        canStartBattle={team.status === 'active' && team.code_source === 'custom'}
        editHref={routeHref({ kind: 'team-edit', publicId })}
        team={team}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onBattleTypeChange={setBattleType}
        onStartBattle={() => navigation.navigate({
          kind: 'battle-new',
          search: new URLSearchParams({
            mode: 'captureTheFlag',
            battle_type: battleType,
            challenger_team_public_id: team.public_id
          }).toString()
        })}
      />
      <AgentDuelTeamOwnerBadges
        badges={savedBadges ?? team.badges}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onSaveDisplay={async (equippedBadgeKeys: readonly string[], hiddenBadgeKeys: readonly string[]) => {
          try {
            const settings = await scope.run(async (signal) => await withTurnstile(
              runTurnstile,
              signal,
              async (token) => await updateTeamBadgeDisplay(appKey, publicId, {
                equipped_badge_keys: [...equippedBadgeKeys],
                hidden_badge_keys: [...hiddenBadgeKeys]
              }, token, signal)
            ))
            setSavedBadges((current) => applyBadgeDisplaySettings(current ?? team.badges, settings))
          } catch (error) {
            handleBadgeDisplaySaveError(error, navigation, reload)
            throw error
          }
        }}
      />
      <AgentDuelTeamOwnerStatus
        team={team}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
      <AgentCodeOptimization
        resource={{ kind: 'team', publicId: team.public_id }}
        initialPrompt={prompt}
        service={conversations}
        useSessions={useSessions}
        useWorkspaces={useWorkspaces}
        onSubmitted={onConversationSubmitted}
      />
      <AgentDuelTeamOwnerCodeVersions
        codeVersions={toTeamCodeVersions(team, version)}
        error={null}
        settingVersionId={null}
        status="ready"
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onRetry={() => {}}
        onSetCurrentVersion={() => {}}
      />
      <BattleRecords mode="captureTheFlag" view="owned" appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}

export function teamPrompt(team: OwnedTeam): string {
  return buildTeamOptimizationPrompt({
    apiKey: team.api_key,
    guideOrigin: WEBSITE_BASE_URL,
    units: team.units,
    messages: {
      apiKey: (apiKey: string) => `这是我的 api key: ${apiKey}`,
      currentComposition: (composition: string) => `目标：2v2 夺旗，当前队伍职业组合：${composition}`,
      followGuide: (url: string) => `请完整阅读 ${url}\n并严格按文档编写我的代码。`
    }
  })
}

function toTeamCodeVersions(team: OwnedTeam, version: VersionSummary | null): TeamDetailCodeVersions | null {
  if (version === null) return null
  return {
    compiled_versions: [{
      public_id: `${team.public_id}:v${version.version_no}`,
      version_no: version.version_no,
      status: 'compiled',
      diagnostics: [],
      ai_model: version.ai_model,
      change_summary: version.change_summary,
      completed_at: team.updated_at,
      created_at: team.updated_at,
      is_current: true,
      is_available: true
    }],
    latest_submission: null,
    latest_problem_submission: null
  }
}
