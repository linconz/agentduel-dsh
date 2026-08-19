import {
  AgentDuelBattlesNew,
  BattlesNewApiError,
  type BattleActiveCodeSummary,
  type BattleStartCreatedBattle,
  type BattleStartMode,
  type BattleStartSelection,
  type BattleReadiness,
  type BattlesNewDataSource,
  type BattlesNewLinkProps
} from '@agentduel/battles-new'
import {
  AgentDuelCaptureTheFlagRecentBattles,
  CaptureTheFlagApiError,
  type CaptureTheFlagBattle,
  type CaptureTheFlagBattleRecordsQuery,
  type CaptureTheFlagRecentBattlesDataSource
} from '@agentduel/capturetheflag/recent-battles'
import {
  AgentDuelTeamCreate,
  type CaptureTheFlagTeam,
  type TeamCreateInput,
  type TeamCreateDataSource
} from '@agentduel/capturetheflag/team-create'
import {
  AgentDuelTeamEdit,
  type TeamEditDataSource,
  type TeamUpdateInput
} from '@agentduel/capturetheflag/team-edit'
import {
  AgentDuelTeamList,
  type CaptureTheFlagTeamListItem
} from '@agentduel/capturetheflag/team-list'
import {
  AgentDuelCharacterCreate,
  DeathmodeApiError,
  type CharacterCreateDataSource,
  type CharacterCreateInput,
  type DeathmatchCharacter
} from '@agentduel/deathmode/character-create'
import {
  AgentDuelCharacterEdit,
  type CharacterEditDataSource,
  type CharacterUpdateInput
} from '@agentduel/deathmode/character-edit'
import {
  AgentDuelCharacterList,
  type DeathmatchCharacterListItem
} from '@agentduel/deathmode/character-list'
import {
  AgentDuelDeathmatchRecentBattles,
  type DeathmatchBattle,
  type DeathmatchBattleRecordsQuery,
  type DeathmatchRecentBattlesDataSource
} from '@agentduel/deathmode/recent-battles'
import {
  AgentDuelReplayPlayer,
  UnsupportedReplayVersionError,
  type NormalizedReplayResult
} from '@agentduel/replay-player'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import battlesNewStyles from '@agentduel/battles-new/styles.css?inline'
import captureTheFlagStyles from '@agentduel/capturetheflag/styles.css?inline'
import deathmodeStyles from '@agentduel/deathmode/styles.css?inline'
import replayPlayerStyles from '@agentduel/replay-player/styles.css?inline'
import {
  AgentDuelIntegrationError,
  CONFIGURATION_SLOT_LIMIT,
  WEBSITE_BASE_URL,
  abortableDelay,
  createBattleRequestBody,
  createCharacter,
  createTeam,
  fetchBattleDetails,
  fetchBattleHistory,
  fetchCharacters,
  fetchClasses,
  fetchMaps,
  fetchOwnedCharacter,
  fetchOwnedTeam,
  fetchPublicCharacterVersion,
  fetchPublicTeamVersion,
  fetchReplayResult,
  fetchTeams,
  isInvalidAppKey,
  normalizeBattleSharePath,
  searchBattleTargets,
  startBattle,
  updateCharacter,
  updateTeam,
  type Battle,
  type BattleMap,
  type Character,
  type GameModeId,
  type Team,
  type VersionSummary
} from './agentduel-api.js'
import { MergedBattleHistory, type HistoryQuery } from './battle-history.js'
import { mapCharacterListItem, mapTeamListItem, rankedResults } from './list-mappers.js'
import type { TurnstileChallenge } from './turnstile.js'

const INTERNAL_HREF_PREFIX = '#agentduel/'

export const agentDuelPackageStyles = [
  battlesNewStyles,
  captureTheFlagStyles,
  deathmodeStyles,
  replayPlayerStyles
].join('\n')

export type AgentDuelRoute =
  | { kind: 'none' }
  | { kind: 'app-key' }
  | { kind: 'agent-conversation-new' }
  | { kind: 'character-list' }
  | { kind: 'character-create' }
  | { kind: 'character-detail'; publicId: string }
  | { kind: 'character-edit'; publicId: string }
  | { kind: 'deathmatch-battles' }
  | { kind: 'team-list' }
  | { kind: 'team-create' }
  | { kind: 'team-detail'; publicId: string }
  | { kind: 'team-edit'; publicId: string }
  | { kind: 'capture-the-flag-battles' }
  | { kind: 'battle-new'; search: string }
  | { kind: 'replay'; publicId: string }

export interface AgentDuelPageNavigation {
  navigate: (route: AgentDuelRoute) => void
  invalidateAppKey: () => void
}

export type RunTurnstile = (signal: AbortSignal) => Promise<TurnstileChallenge>

type AgentDuelFeatureRoute = Exclude<
  AgentDuelRoute,
  { kind: 'none' | 'app-key' | 'agent-conversation-new' }
>

export function routeHref(route: AgentDuelFeatureRoute): string {
  switch (route.kind) {
    case 'character-list': return `${INTERNAL_HREF_PREFIX}characters`
    case 'character-create': return `${INTERNAL_HREF_PREFIX}characters/new`
    case 'character-detail': return `${INTERNAL_HREF_PREFIX}characters/${encodeURIComponent(route.publicId)}`
    case 'character-edit': return `${INTERNAL_HREF_PREFIX}characters/${encodeURIComponent(route.publicId)}/edit`
    case 'deathmatch-battles': return `${INTERNAL_HREF_PREFIX}deathmatch/battles`
    case 'team-list': return `${INTERNAL_HREF_PREFIX}teams`
    case 'team-create': return `${INTERNAL_HREF_PREFIX}teams/new`
    case 'team-detail': return `${INTERNAL_HREF_PREFIX}teams/${encodeURIComponent(route.publicId)}`
    case 'team-edit': return `${INTERNAL_HREF_PREFIX}teams/${encodeURIComponent(route.publicId)}/edit`
    case 'capture-the-flag-battles': return `${INTERNAL_HREF_PREFIX}capture-the-flag/battles`
    case 'battle-new': return `${INTERNAL_HREF_PREFIX}battles/new${route.search ? `?${route.search.replace(/^\?/, '')}` : ''}`
    case 'replay': return `${INTERNAL_HREF_PREFIX}battles/replay/${encodeURIComponent(route.publicId)}`
  }
}

export function parseAgentDuelHref(href: string): AgentDuelRoute | null {
  if (!href.startsWith(INTERNAL_HREF_PREFIX)) return null
  const raw = href.slice(INTERNAL_HREF_PREFIX.length)
  const [pathname = '', search = ''] = raw.split('?', 2)
  if (pathname === 'characters') return { kind: 'character-list' }
  if (pathname === 'characters/new') return { kind: 'character-create' }
  if (pathname === 'deathmatch/battles') return { kind: 'deathmatch-battles' }
  if (pathname === 'teams') return { kind: 'team-list' }
  if (pathname === 'teams/new') return { kind: 'team-create' }
  if (pathname === 'capture-the-flag/battles') return { kind: 'capture-the-flag-battles' }
  if (pathname === 'battles/new') return { kind: 'battle-new', search }
  const characterEditMatch = /^characters\/(.+)\/edit$/.exec(pathname)
  if (characterEditMatch?.[1]) return { kind: 'character-edit', publicId: decodeURIComponent(characterEditMatch[1]) }
  const characterMatch = /^characters\/(.+)$/.exec(pathname)
  if (characterMatch?.[1]) return { kind: 'character-detail', publicId: decodeURIComponent(characterMatch[1]) }
  const teamEditMatch = /^teams\/(.+)\/edit$/.exec(pathname)
  if (teamEditMatch?.[1]) return { kind: 'team-edit', publicId: decodeURIComponent(teamEditMatch[1]) }
  const teamMatch = /^teams\/(.+)$/.exec(pathname)
  if (teamMatch?.[1]) return { kind: 'team-detail', publicId: decodeURIComponent(teamMatch[1]) }
  const replayMatch = /^battles\/replay\/(.+)$/.exec(pathname)
  if (replayMatch?.[1]) return { kind: 'replay', publicId: decodeURIComponent(replayMatch[1]) }
  return null
}

export function AgentDuelFeaturePage({
  appKey,
  navigation,
  route,
  runTurnstile
}: {
  appKey: string
  navigation: AgentDuelPageNavigation
  route: AgentDuelFeatureRoute
  runTurnstile: RunTurnstile
}): React.JSX.Element {
  const key = route.kind === 'character-detail' || route.kind === 'character-edit'
    || route.kind === 'team-detail' || route.kind === 'team-edit' || route.kind === 'replay'
    ? `${route.kind}:${route.publicId}`
    : route.kind === 'battle-new' ? `${route.kind}:${route.search}` : route.kind

  return (
    <div className="agentduel-module-host" key={key}>
      {route.kind === 'character-list' ? <CharacterListPage appKey={appKey} navigation={navigation} /> : null}
      {route.kind === 'character-create' ? <CharacterCreatePage appKey={appKey} navigation={navigation} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'character-detail' ? <CharacterDetailPage appKey={appKey} navigation={navigation} publicId={route.publicId} /> : null}
      {route.kind === 'character-edit' ? <CharacterEditPage appKey={appKey} navigation={navigation} publicId={route.publicId} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'deathmatch-battles' ? <DeathmatchBattlesPage appKey={appKey} navigation={navigation} /> : null}
      {route.kind === 'team-list' ? <TeamListPage appKey={appKey} navigation={navigation} /> : null}
      {route.kind === 'team-create' ? <TeamCreatePage appKey={appKey} navigation={navigation} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'team-detail' ? <TeamDetailPage appKey={appKey} navigation={navigation} publicId={route.publicId} /> : null}
      {route.kind === 'team-edit' ? <TeamEditPage appKey={appKey} navigation={navigation} publicId={route.publicId} runTurnstile={runTurnstile} /> : null}
      {route.kind === 'capture-the-flag-battles' ? <CaptureTheFlagBattlesPage appKey={appKey} navigation={navigation} /> : null}
      {route.kind === 'battle-new' ? <BattleNewPage appKey={appKey} navigation={navigation} runTurnstile={runTurnstile} search={route.search} /> : null}
      {route.kind === 'replay' ? <ReplayPage appKey={appKey} navigation={navigation} publicId={route.publicId} /> : null}
    </div>
  )
}

function CharacterListPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => await loadCharacterListItems(appKey, signal), [appKey])
  const rootRef = useRef<HTMLDivElement>(null)
  useUnauthorizedEffect(state.error, navigation)
  useListCopyCorrection(rootRef, state.status === 'ready' ? '按角色槽位顺序展示；版本与模型信息来自当前公开资料。' : null)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="角色列表" state={state} onRetry={reload} />
  return (
    <div ref={rootRef} className="agentduel-mode-list-shell">
      <AgentDuelCharacterList
        characters={state.value}
        createCharacterHref={routeHref({ kind: 'character-create' })}
        dashboardHref={routeHref({ kind: 'character-list' })}
        getCharacterHref={(publicId: string) => routeHref({ kind: 'character-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
      />
    </div>
  )
}

function TeamListPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const [state, reload] = useLoadState(async (signal) => await loadTeamListItems(appKey, signal), [appKey])
  const rootRef = useRef<HTMLDivElement>(null)
  useUnauthorizedEffect(state.error, navigation)
  useListCopyCorrection(rootRef, state.status === 'ready' ? '按团队槽位顺序展示；没有可执行 Agent 的团队仍会保留在列表中。' : null)
  const Link = useModuleLink(navigation)

  if (state.status !== 'ready') return <ModuleLoadState label="团队列表" state={state} onRetry={reload} />
  return (
    <div ref={rootRef} className="agentduel-mode-list-shell">
      <AgentDuelTeamList
        createTeamHref={routeHref({ kind: 'team-create' })}
        dashboardHref={routeHref({ kind: 'team-list' })}
        getTeamHref={(publicId: string) => routeHref({ kind: 'team-detail', publicId })}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        teams={state.value}
      />
    </div>
  )
}

interface CharacterDetailData {
  character: Character
  version: VersionSummary | null
}

interface TeamDetailData {
  team: Team
  version: VersionSummary | null
}

function CharacterDetailPage({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
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

  if (state.status !== 'ready') return <ModuleLoadState label="角色详情" state={state} onRetry={reload} />
  const { character, version } = state.value
  const battleSearch = new URLSearchParams({
    mode: 'deathmatch',
    challenger_character_public_id: character.public_id
  }).toString()

  return (
    <div className="agentduel-entity-detail agentduel-entity-detail--deathmatch">
      <header className="agentduel-entity-hero">
        <div>
          <Link className="agentduel-entity-back" href={routeHref({ kind: 'character-list' })}>返回角色列表</Link>
          <p className="agentduel-entity-kicker">死斗模式 · 角色详情</p>
          <h1>{character.name}</h1>
          <p className="agentduel-entity-summary">{character.description?.trim() || '尚未填写角色介绍。'}</p>
        </div>
        <div className="agentduel-entity-actions">
          <Link className="agentduel-entity-action" href={routeHref({ kind: 'character-edit', publicId })}>编辑资料</Link>
          <Link className="agentduel-entity-action is-primary" href={routeHref({ kind: 'battle-new', search: battleSearch })}>使用该角色对战</Link>
        </div>
      </header>

      <EntityMetrics
        codeLabel={characterCodeLabel(character, version)}
        draws={character.ranked_draws}
        losses={character.ranked_losses}
        rating={character.ranked_rating}
        statusLabel={contentStatusLabel(character)}
        wins={character.ranked_wins}
      />

      <section className="agentduel-entity-profile" aria-labelledby="agentduel-character-profile-title">
        <div>
          <p className="agentduel-entity-kicker">profile</p>
          <h2 id="agentduel-character-profile-title">角色资料</h2>
        </div>
        <dl>
          <div><dt>职业</dt><dd>{classLabel(character.class_id)}</dd></div>
          <div><dt>槽位</dt><dd>第 {character.slot_no} 位</dd></div>
          <div><dt>创建日期</dt><dd>{formatDate(character.created_at)}</dd></div>
          <div><dt>Agent 来源</dt><dd>{character.code_source === 'default' ? '默认 Agent' : '自定义 Agent'}</dd></div>
        </dl>
      </section>

      <CharacterDetailBattles appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}

function TeamDetailPage({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
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

  if (state.status !== 'ready') return <ModuleLoadState label="团队详情" state={state} onRetry={reload} />
  const { team, version } = state.value
  const battleSearch = new URLSearchParams({
    mode: 'captureTheFlag',
    challenger_team_public_id: team.public_id
  }).toString()

  return (
    <div className="agentduel-entity-detail agentduel-entity-detail--capture-the-flag">
      <header className="agentduel-entity-hero">
        <div>
          <Link className="agentduel-entity-back" href={routeHref({ kind: 'team-list' })}>返回团队列表</Link>
          <p className="agentduel-entity-kicker">夺旗模式 · 团队详情</p>
          <h1>{team.name}</h1>
          <p className="agentduel-entity-summary">{team.description?.trim() || '尚未填写团队介绍。'}</p>
        </div>
        <div className="agentduel-entity-actions">
          <Link className="agentduel-entity-action" href={routeHref({ kind: 'team-edit', publicId })}>编辑资料</Link>
          <Link className="agentduel-entity-action is-primary" href={routeHref({ kind: 'battle-new', search: battleSearch })}>使用该团队对战</Link>
        </div>
      </header>

      <EntityMetrics
        codeLabel={teamCodeLabel(team, version)}
        draws={team.ranked_draws}
        losses={team.ranked_losses}
        rating={team.ranked_rating}
        statusLabel={contentStatusLabel(team)}
        wins={team.ranked_wins}
      />

      <section className="agentduel-entity-profile" aria-labelledby="agentduel-team-profile-title">
        <div>
          <p className="agentduel-entity-kicker">profile</p>
          <h2 id="agentduel-team-profile-title">团队资料</h2>
        </div>
        <dl>
          <div><dt>阵容</dt><dd>{team.units.map((unit) => classLabel(unit.class_id)).join(' / ')}</dd></div>
          <div><dt>槽位</dt><dd>第 {team.slot_no} 位</dd></div>
          <div><dt>创建日期</dt><dd>{formatDate(team.created_at)}</dd></div>
          <div><dt>Agent 来源</dt><dd>{team.code_source === 'none' ? '尚无可执行代码' : '自定义 Agent'}</dd></div>
        </dl>
      </section>

      <TeamDetailBattles appKey={appKey} navigation={navigation} publicId={publicId} />
    </div>
  )
}

function EntityMetrics({
  codeLabel,
  draws,
  losses,
  rating,
  statusLabel,
  wins
}: {
  codeLabel: string
  draws: number
  losses: number
  rating: number
  statusLabel: string
  wins: number
}): React.JSX.Element {
  return (
    <dl className="agentduel-entity-metrics">
      <div><dt>当前排位积分</dt><dd>{rating}</dd></div>
      <div><dt>排位胜 / 平 / 负</dt><dd>{wins} / {draws} / {losses}</dd></div>
      <div><dt>当前代码版本</dt><dd>{codeLabel}</dd></div>
      <div><dt>内容状态</dt><dd>{statusLabel}</dd></div>
    </dl>
  )
}

function CharacterDetailBattles({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<DeathmatchRecentBattlesDataSource>(() => {
    const history = new MergedBattleHistory(
      [publicId],
      async (ownedPublicId, cursor, battleType) => await scope.run((signal) => (
        fetchBattleHistory(appKey, 'characters', ownedPublicId, { cursor, battleType }, signal)
      ))
    )
    return {
      async loadContext() {
        return { ownedCharacterPublicIds: [publicId] }
      },
      async loadBattles(query: DeathmatchBattleRecordsQuery) {
        try {
          const page = await history.load(query as HistoryQuery)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toDeathmatchBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toDeathmodeError(error) }
      }
    }
  }, [appKey, publicId, scope])

  return (
    <section className="agentduel-entity-battles" aria-label="该角色的最近战斗">
      <AgentDuelDeathmatchRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dashboardHref={routeHref({ kind: 'character-list' })}
        dataSource={dataSource}
        getCharacterHref={(participantPublicId: string, view: 'owned' | 'public') => view === 'owned'
          ? routeHref({ kind: 'character-detail', publicId: participantPublicId })
          : null}
        getReplayHref={(battle: DeathmatchBattle) => battle.replay_available || battle.status === 'pending' || battle.status === 'running'
          ? routeHref({ kind: 'replay', publicId: battle.public_id })
          : null}
        getRevengeHref={(battle: DeathmatchBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </section>
  )
}

function TeamDetailBattles({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CaptureTheFlagRecentBattlesDataSource>(() => {
    const history = new MergedBattleHistory(
      [publicId],
      async (ownedPublicId, cursor, battleType) => await scope.run((signal) => (
        fetchBattleHistory(appKey, 'teams', ownedPublicId, { cursor, battleType }, signal)
      ))
    )
    return {
      async loadContext() {
        return { ownedTeamPublicIds: [publicId] }
      },
      async loadBattles(query: CaptureTheFlagBattleRecordsQuery) {
        try {
          const page = await history.load(query as HistoryQuery)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toCaptureTheFlagBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toCaptureTheFlagError(error) }
      }
    }
  }, [appKey, publicId, scope])

  return (
    <section className="agentduel-entity-battles" aria-label="该团队的最近战斗">
      <AgentDuelCaptureTheFlagRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dashboardHref={routeHref({ kind: 'team-list' })}
        dataSource={dataSource}
        getReplayHref={(battle: CaptureTheFlagBattle) => battle.replay_available || battle.status === 'pending' || battle.status === 'running'
          ? routeHref({ kind: 'replay', publicId: battle.public_id })
          : null}
        getRevengeHref={(battle: CaptureTheFlagBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        getTeamHref={(participantPublicId: string, view: 'owned' | 'public') => view === 'owned'
          ? routeHref({ kind: 'team-detail', publicId: participantPublicId })
          : null}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </section>
  )
}

function CharacterCreatePage({ appKey, navigation, runTurnstile }: WritePageProps): React.JSX.Element {
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

function CharacterEditPage({ appKey, navigation, publicId, runTurnstile }: WriteDetailPageProps): React.JSX.Element {
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
      dashboardHref={routeHref({ kind: 'character-list' })}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onCharacterSaved={() => navigation.navigate({ kind: 'character-detail', publicId })}
      onUnauthorized={navigation.invalidateAppKey}
    />
  )
}

function TeamCreatePage({ appKey, navigation, runTurnstile }: WritePageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamCreateDataSource>(() => ({
    async loadContext() {
      return await scope.run(async (signal) => {
        const teams = await fetchTeams(appKey, signal)
        return { teamCount: teams.length, maxTeamSlots: CONFIGURATION_SLOT_LIMIT }
      }).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async createTeam(input: TeamCreateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => (
        toCaptureTheFlagTeam(await createTeam(appKey, input, token, signal))
      ))).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async resolveErrorMessage(error: unknown) {
      return error instanceof Error ? error.message : null
    }
  }), [appKey, runTurnstile, scope])
  return (
    <AgentDuelTeamCreate
      assetBaseUrl={WEBSITE_BASE_URL}
      backToDashboardHref={routeHref({ kind: 'team-list' })}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onTeamCreated={(team: CaptureTheFlagTeam) => navigation.navigate({ kind: 'team-edit', publicId: team.public_id })}
      onUnauthorized={navigation.invalidateAppKey}
    />
  )
}

function TeamEditPage({ appKey, navigation, publicId, runTurnstile }: WriteDetailPageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<TeamEditDataSource>(() => ({
    async loadTeam(teamPublicId: string) {
      return await scope.run(async (signal) => toCaptureTheFlagTeam(
        await fetchOwnedTeam(appKey, teamPublicId, signal)
      )).catch((error) => { throw toCaptureTheFlagError(error) })
    },
    async updateTeam(teamPublicId: string, input: TeamUpdateInput) {
      return await scope.run(async (signal) => await withTurnstile(runTurnstile, signal, async (token) => (
        toCaptureTheFlagTeam(await updateTeam(appKey, teamPublicId, input, token, signal))
      ))).catch((error) => { throw toCaptureTheFlagError(error) })
    }
  }), [appKey, runTurnstile, scope])
  return (
    <AgentDuelTeamEdit
      dashboardHref={routeHref({ kind: 'team-list' })}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      onTeamSaved={() => navigation.navigate({ kind: 'team-detail', publicId })}
      onUnauthorized={navigation.invalidateAppKey}
      teamDetailHref={(teamPublicId: string) => routeHref({ kind: 'team-detail', publicId: teamPublicId })}
      teamPublicId={publicId}
    />
  )
}

function DeathmatchBattlesPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<DeathmatchRecentBattlesDataSource>(() => {
    let charactersPromise: Promise<Character[]> | undefined
    let historyPromise: Promise<MergedBattleHistory> | undefined
    const loadCharacters = (): Promise<Character[]> => (
      charactersPromise ??= scope.run((signal) => fetchCharacters(appKey, signal))
    )
    const loadHistory = (): Promise<MergedBattleHistory> => (
      historyPromise ??= loadCharacters().then((characters) => new MergedBattleHistory(
        characters.map((character) => character.public_id),
        async (publicId, cursor, battleType) => await scope.run((signal) => (
          fetchBattleHistory(appKey, 'characters', publicId, { cursor, battleType }, signal)
        ))
      ))
    )
    return {
      async loadContext() {
        try {
          const characters = await loadCharacters()
          return { ownedCharacterPublicIds: characters.map((character) => character.public_id) }
        } catch (error) { throw toDeathmodeError(error) }
      },
      async loadBattles(query: DeathmatchBattleRecordsQuery) {
        try {
          const history = await loadHistory()
          const page = await history.load(query as HistoryQuery)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toDeathmatchBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toDeathmodeError(error) }
      }
    }
  }, [appKey, scope])

  return (
    <div className="agentduel-recent-battles-shell">
      <AgentDuelDeathmatchRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dashboardHref={routeHref({ kind: 'character-list' })}
        dataSource={dataSource}
        getCharacterHref={(publicId: string, view: 'owned' | 'public') => view === 'owned' ? routeHref({ kind: 'character-detail', publicId }) : null}
        getReplayHref={(battle: DeathmatchBattle) => battle.replay_available || battle.status === 'pending' || battle.status === 'running'
          ? routeHref({ kind: 'replay', publicId: battle.public_id })
          : null}
        getRevengeHref={(battle: DeathmatchBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </div>
  )
}

function CaptureTheFlagBattlesPage({ appKey, navigation }: BasicPageProps): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<CaptureTheFlagRecentBattlesDataSource>(() => {
    let teamsPromise: Promise<Team[]> | undefined
    let historyPromise: Promise<MergedBattleHistory> | undefined
    const loadTeams = (): Promise<Team[]> => (
      teamsPromise ??= scope.run((signal) => fetchTeams(appKey, signal))
    )
    const loadHistory = (): Promise<MergedBattleHistory> => (
      historyPromise ??= loadTeams().then((teams) => new MergedBattleHistory(
        teams.map((team) => team.public_id),
        async (publicId, cursor, battleType) => await scope.run((signal) => (
          fetchBattleHistory(appKey, 'teams', publicId, { cursor, battleType }, signal)
        ))
      ))
    )
    return {
      async loadContext() {
        try {
          const teams = await loadTeams()
          return { ownedTeamPublicIds: teams.map((team) => team.public_id) }
        } catch (error) { throw toCaptureTheFlagError(error) }
      },
      async loadBattles(query: CaptureTheFlagBattleRecordsQuery) {
        try {
          const history = await loadHistory()
          const page = await history.load(query as HistoryQuery)
          return {
            battles: page.battles.flatMap((battle) => {
              const mapped = toCaptureTheFlagBattle(battle)
              return mapped ? [mapped] : []
            }),
            next_cursor: page.next_cursor
          }
        } catch (error) { throw toCaptureTheFlagError(error) }
      }
    }
  }, [appKey, scope])
  return (
    <div className="agentduel-recent-battles-shell">
      <AgentDuelCaptureTheFlagRecentBattles
        assetBaseUrl={WEBSITE_BASE_URL}
        dashboardHref={routeHref({ kind: 'team-list' })}
        dataSource={dataSource}
        getReplayHref={(battle: CaptureTheFlagBattle) => battle.replay_available || battle.status === 'pending' || battle.status === 'running'
          ? routeHref({ kind: 'replay', publicId: battle.public_id })
          : null}
        getRevengeHref={(battle: CaptureTheFlagBattle, ownPublicId: string) => getRevengeHref(battle, ownPublicId)}
        getTeamHref={(publicId: string, view: 'owned' | 'public') => view === 'owned' ? routeHref({ kind: 'team-detail', publicId }) : null}
        i18nMode="bundled"
        linkComponent={Link}
        locale="zh-CN"
        onUnauthorized={navigation.invalidateAppKey}
      />
    </div>
  )
}

function BattleNewPage({ appKey, navigation, runTurnstile, search }: WritePageProps & { search: string }): React.JSX.Element {
  const scope = useRequestScope()
  const Link = useModuleLink(navigation)
  const dataSource = useMemo<BattlesNewDataSource>(() => ({
    async loadParticipants() {
      try {
        return await scope.run(async (signal) => {
          const [characters, teams] = await Promise.all([fetchCharacters(appKey, signal), fetchTeams(appKey, signal)])
          return {
            characters: await Promise.all(characters.map(async (character) => ({
              public_id: character.public_id,
              name: character.name,
              code_source: character.code_source,
              active_code: await loadCharacterActiveCode(appKey, character, signal),
              ranked_results: rankedResults(character),
              battle_readiness: battleReadiness(character.status === 'active', null)
            }))),
            teams: await Promise.all(teams.map(async (team) => ({
              public_id: team.public_id,
              name: team.name,
              code_source: team.code_source,
              active_code: await loadTeamActiveCode(appKey, team, signal),
              ranked_results: rankedResults(team),
              battle_readiness: battleReadiness(team.status === 'active', team.code_source === 'none' ? 'team_code_required' : null)
            })))
          }
        })
      } catch (error) { throw toBattlesNewError(error) }
    },
    async loadMaps() {
      try {
        return await scope.run(async (signal) => {
          const [deathmatch, captureTheFlag] = await Promise.all([
            fetchMaps(appKey, 'deathmatch', undefined, signal),
            fetchMaps(appKey, 'captureTheFlag', undefined, signal)
          ])
          return { deathmatch: deathmatch.map(toBattleStartMap), captureTheFlag: captureTheFlag.map(toBattleStartMap) }
        })
      } catch (error) { throw toBattlesNewError(error) }
    },
    async startBattle(selection: BattleStartSelection) {
      try {
        return await scope.run(async (signal) => {
          let targetPublicId = selection.targetPublicId?.trim() || null
          if (selection.battleType === 'practice' && selection.opponentSelection === 'specified' && !targetPublicId) {
            const targetName = selection.targetName.trim()
            const targets = await searchBattleTargets(appKey, selection.mode, targetName, signal)
            targetPublicId = targets.find((target) => target.name.trim() === targetName)?.public_id ?? null
            if (!targetPublicId) throw new BattlesNewApiError(404, 'BATTLE_START_TARGET_NOT_FOUND')
          }
          const battle = await withTurnstile(runTurnstile, signal, async (token) => await startBattle(appKey, {
            mode: selection.mode,
            battleType: selection.battleType,
            challengerPublicId: selection.challengerPublicId,
            targetPublicId,
            revengeOfBattlePublicId: selection.revengeOfBattlePublicId,
            mapId: selection.mapId
          }, token, signal))
          return { public_id: battle.public_id }
        })
      } catch (error) { throw toBattlesNewError(error) }
    }
  }), [appKey, runTurnstile, scope])

  return (
    <AgentDuelBattlesNew
      assetBaseUrl={WEBSITE_BASE_URL}
      dataSource={dataSource}
      i18nMode="bundled"
      linkComponent={Link as (props: BattlesNewLinkProps) => ReactNode}
      locale="zh-CN"
      onBattleCreated={(battle: BattleStartCreatedBattle) => navigation.navigate({ kind: 'replay', publicId: battle.public_id })}
      onModeChange={(mode: BattleStartMode) => navigation.navigate({ kind: 'battle-new', search: `mode=${mode}` })}
      onUnauthorized={navigation.invalidateAppKey}
      preparationRoomHrefs={{
        deathmatch: routeHref({ kind: 'character-list' }),
        captureTheFlag: routeHref({ kind: 'team-list' })
      }}
      rulesUrl="https://www.agentduel.app/document#document-rules"
      searchParams={search}
    />
  )
}

function ReplayPage({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  type ReplayState =
    | { status: 'loading' | 'waiting'; battle: Battle | null }
    | { status: 'ready'; battle: Battle; replay: NormalizedReplayResult; ownPublicId: string | null }
    | { status: 'unavailable' | 'expired' | 'error'; battle: Battle | null; message: string }
  const [state, setState] = useState<ReplayState>({ status: 'loading', battle: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    void (async () => {
      try {
        let battle: Battle | null = null
        const delays = [0, 1000, 2000, 4000, 8000, 1000, 2000, 4000, 8000]
        for (let attempt = 0; attempt < delays.length; attempt += 1) {
          const delay = delays[attempt] ?? 0
          if (delay > 0) await abortableDelay(delay, controller.signal)
          battle = await fetchBattleDetails(appKey, publicId, controller.signal)
          if (disposed) return
          if (battle.status !== 'pending' && battle.status !== 'running') break
          setState({ status: 'waiting', battle })
        }
        if (!battle) throw new Error('没有读取到战斗信息')
        if (battle.status === 'pending' || battle.status === 'running') {
          setState({ status: 'expired', battle, message: '战斗仍在处理中，请稍后重新加载。' })
          return
        }
        if (battle.status !== 'done' || !battle.replay_url) {
          setState({ status: 'unavailable', battle, message: '这场战斗当前没有可用回放。' })
          return
        }
        const [replay, characters, teams] = await Promise.all([
          fetchReplayResult(battle.replay_url, controller.signal),
          fetchCharacters(appKey, controller.signal),
          fetchTeams(appKey, controller.signal)
        ])
        if (disposed) return
        const ownedIds = new Set([...characters, ...teams].map((item) => item.public_id))
        const ownPublicId = battle.participants.find((participant) => ownedIds.has(participant.public_id))?.public_id ?? null
        setState({ status: 'ready', battle: normalizeBattleSharePath(battle), replay, ownPublicId })
      } catch (error) {
        if (disposed || controller.signal.aborted) return
        if (isInvalidAppKey(error)) {
          navigation.invalidateAppKey()
          return
        }
        const message = error instanceof UnsupportedReplayVersionError
          ? '该回放版本暂不受播放器支持。'
          : error instanceof AgentDuelIntegrationError && error.status === 404
            ? '找不到这场战斗。'
            : '战斗回放暂时无法加载。'
        setState({ status: 'error', battle: null, message })
      }
    })()
    return () => {
      disposed = true
      controller.abort()
    }
  }, [appKey, navigation, publicId, reloadKey])

  if (state.status === 'ready') {
    return (
      <AgentDuelReplayPlayer
        battle={state.battle}
        i18nMode="bundled"
        locale="zh-CN"
        ownParticipantPublicId={state.ownPublicId}
        replayResult={state.replay}
      />
    )
  }
  const isWaiting = state.status === 'loading' || state.status === 'waiting'
  return (
    <section className="agentduel-module-state" role={isWaiting ? 'status' : 'alert'}>
      <div>
        <p className="agentduel-module-kicker">battle replay</p>
        <h1>{isWaiting ? '正在准备战斗回放' : '无法播放回放'}</h1>
        <p>{isWaiting ? '战斗完成并生成回放后会自动开始播放。' : 'message' in state ? state.message : ''}</p>
        {!isWaiting ? (
          <div className="agentduel-module-actions">
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>重新加载</button>
            <button type="button" onClick={() => navigation.navigate(
              state.battle?.game_mode_id === 'captureTheFlag'
                ? { kind: 'capture-the-flag-battles' }
                : { kind: 'deathmatch-battles' }
            )}>返回最近战斗</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface BasicPageProps {
  appKey: string
  navigation: AgentDuelPageNavigation
}

interface WritePageProps extends BasicPageProps {
  runTurnstile: RunTurnstile
}

interface WriteDetailPageProps extends WritePageProps {
  publicId: string
}

type LoadState<T> =
  | { status: 'loading'; value: null; error: null }
  | { status: 'ready'; value: T; error: null }
  | { status: 'error'; value: null; error: unknown }

function useLoadState<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: readonly unknown[]): [LoadState<T>, () => void] {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<LoadState<T>>({ status: 'loading', value: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', value: null, error: null })
    void loader(controller.signal).then(
      (value) => { if (!controller.signal.aborted) setState({ status: 'ready', value, error: null }) },
      (error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', value: null, error }) }
    )
    return () => controller.abort()
  // 调用方传入稳定的加载函数依赖，避免把每次渲染的新函数作为依赖。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey])
  return [state, () => setReloadKey((value) => value + 1)]
}

function ModuleLoadState<T>({ label, onRetry, state }: { label: string; onRetry: () => void; state: LoadState<T> }): React.JSX.Element {
  if (state.status === 'loading') {
    return <section className="agentduel-module-state" role="status"><div>正在加载{label}…</div></section>
  }
  return (
    <section className="agentduel-module-state" role="alert">
      <div>
        <p className="agentduel-module-kicker">AgentDuel</p>
        <h1>{label}暂时无法加载</h1>
        <p>请检查网络连接后重新尝试。</p>
        <button type="button" onClick={onRetry}>重新加载</button>
      </div>
    </section>
  )
}

function useUnauthorizedEffect(error: unknown, navigation: AgentDuelPageNavigation): void {
  useEffect(() => {
    if (isInvalidAppKey(error)) navigation.invalidateAppKey()
  }, [error, navigation])
}

function useListCopyCorrection(rootRef: React.RefObject<HTMLDivElement>, copy: string | null): void {
  useLayoutEffect(() => {
    if (!copy) return
    const paragraph = rootRef.current?.querySelector('.mode-list-heading > div > p:last-child')
    if (paragraph) paragraph.textContent = copy
  }, [copy, rootRef])
}

function useModuleLink(navigation: AgentDuelPageNavigation) {
  return useMemo(() => function ModuleLink({
    children,
    className,
    href,
    'aria-label': ariaLabel
  }: { children: ReactNode; className?: string; href: string; 'aria-label'?: string }): React.JSX.Element {
    const route = parseAgentDuelHref(href)
    const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>): void => {
      if (!route || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigation.navigate(route)
    }
    return (
      <a
        aria-label={ariaLabel}
        className={className}
        href={href}
        onClick={handleClick}
        {...(!route && /^https?:/.test(href) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
      >{children}</a>
    )
  }, [navigation])
}

class RequestScope {
  private readonly controllers = new Set<AbortController>()
  private disposed = false

  async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.disposed) throw new DOMException('页面已关闭', 'AbortError')
    const controller = new AbortController()
    this.controllers.add(controller)
    try {
      return await operation(controller.signal)
    } finally {
      this.controllers.delete(controller)
    }
  }

  dispose(): void {
    this.disposed = true
    for (const controller of this.controllers) controller.abort()
    this.controllers.clear()
  }
}

function useRequestScope(): RequestScope {
  const scope = useMemo(() => new RequestScope(), [])
  useEffect(() => () => scope.dispose(), [scope])
  return scope
}

async function withTurnstile<T>(
  runTurnstile: RunTurnstile,
  signal: AbortSignal,
  operation: (token: string) => Promise<T>
): Promise<T> {
  const challenge = await runTurnstile(signal)
  try {
    return await operation(challenge.token)
  } finally {
    challenge.release()
  }
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

async function loadTeamListItems(appKey: string, signal: AbortSignal): Promise<CaptureTheFlagTeamListItem[]> {
  const teams = await fetchTeams(appKey, signal)
  const enrichmentController = linkedAbortController(signal)
  const versions = await Promise.all(teams.map(async (team): Promise<VersionSummary | null> => {
    if (team.status !== 'active') return null
    try {
      return await fetchPublicTeamVersion(appKey, team.public_id, enrichmentController.signal)
    } catch (error) {
      if (isInvalidAppKey(error)) {
        enrichmentController.abort()
        throw error
      }
      return null
    }
  }))
  return teams.map((team, index) => mapTeamListItem(team, versions[index] ?? null))
}

function linkedAbortController(parent: AbortSignal): AbortController {
  const controller = new AbortController()
  if (parent.aborted) controller.abort()
  else parent.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal })
  return controller
}

async function loadOptionalVersion(
  shouldLoad: boolean,
  loader: () => Promise<VersionSummary | null>
): Promise<VersionSummary | null> {
  if (!shouldLoad) return null
  try {
    return await loader()
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

function characterCodeLabel(character: Character, version: VersionSummary | null): string {
  if (version) return `v${version.version_no} · ${version.ai_model?.trim() || '模型未标注'}`
  return character.code_source === 'default' ? '默认 Agent' : '自定义 Agent'
}

function teamCodeLabel(team: Team, version: VersionSummary | null): string {
  if (version) return `v${version.version_no} · ${version.ai_model?.trim() || '模型未标注'}`
  return team.code_source === 'none' ? '尚无可执行代码' : '自定义 Agent'
}

function contentStatusLabel(item: Pick<Character | Team, 'status' | 'remediation'>): string {
  if (item.status === 'active') return '正常'
  if (item.status === 'suspended') return '已停用'
  if (item.remediation?.submitted_at) return '等待审核'
  if (item.status === 'name_violation') return '需要修改名称'
  if (item.status === 'description_violation') return '需要修改介绍'
  return '需要修改资料'
}

function classLabel(classId: Character['class_id']): string {
  if (classId === 'warrior') return '战士'
  if (classId === 'mage') return '法师'
  return '猎人'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value))
}

function toDeathmodeCharacter(character: Character) {
  return {
    public_id: character.public_id,
    name: character.name,
    description: character.description,
    status: character.status,
    remediation: character.remediation,
    class_id: character.class_id
  }
}

function toCaptureTheFlagTeam(team: Team) {
  return {
    public_id: team.public_id,
    name: team.name,
    description: team.description,
    status: team.status,
    remediation: team.remediation,
    units: team.units
  }
}

function toDeathmatchBattle(battle: Battle): DeathmatchBattle | null {
  if (battle.game_mode_id !== 'deathmatch' || !battle.participants.every((participant) => participant.kind === 'character')) return null
  return {
    public_id: battle.public_id,
    share_path: battle.share_path,
    battle_type: battle.battle_type,
    match_source: battle.match_source,
    viewer_match_role: battle.viewer_match_role,
    challenge_role: battle.challenge_role,
    can_revenge: battle.can_revenge,
    revenge_target: battle.revenge_target,
    game_mode_id: 'deathmatch',
    map_id: battle.map_id,
    status: battle.status,
    participants: battle.participants.map((participant) => ({
      side: participant.side,
      kind: 'character' as const,
      public_id: participant.public_id,
      name: participant.name,
      name_redacted: participant.name_redacted,
      rating_delta: participant.rating_delta
    })),
    winner_side: battle.winner_side,
    replay_available: battle.replay_available,
    created_at: battle.created_at
  }
}

function toCaptureTheFlagBattle(battle: Battle): CaptureTheFlagBattle | null {
  if (battle.game_mode_id !== 'captureTheFlag' || !battle.participants.every((participant) => participant.kind === 'team')) return null
  return {
    public_id: battle.public_id,
    share_path: battle.share_path,
    battle_type: battle.battle_type,
    match_source: battle.match_source,
    viewer_match_role: battle.viewer_match_role,
    challenge_role: battle.challenge_role,
    can_revenge: battle.can_revenge,
    revenge_target: battle.revenge_target,
    game_mode_id: 'captureTheFlag',
    map_id: battle.map_id,
    status: battle.status,
    participants: battle.participants.map((participant) => ({
      side: participant.side,
      kind: 'team' as const,
      public_id: participant.public_id,
      name: participant.name,
      name_redacted: participant.name_redacted,
      units: participant.units,
      rating_delta: participant.rating_delta
    })),
    winner_side: battle.winner_side,
    replay_available: battle.replay_available,
    created_at: battle.created_at
  }
}

function getRevengeHref(
  battle: DeathmatchBattle | CaptureTheFlagBattle,
  ownPublicId: string
): string | null {
  if (!battle.can_revenge || !battle.revenge_target) return null
  const params = new URLSearchParams({
    mode: battle.game_mode_id,
    battle_type: 'practice',
    opponent: 'specified',
    target_name: battle.revenge_target.name,
    revenge_of_battle_public_id: battle.public_id
  })
  if (battle.game_mode_id === 'deathmatch') {
    params.set('challenger_character_public_id', ownPublicId)
    params.set('target_character_public_id', battle.revenge_target.public_id)
  } else {
    params.set('challenger_team_public_id', ownPublicId)
    params.set('target_team_public_id', battle.revenge_target.public_id)
  }
  return routeHref({ kind: 'battle-new', search: params.toString() })
}

async function loadCharacterActiveCode(appKey: string, character: Character, signal: AbortSignal): Promise<BattleActiveCodeSummary | null> {
  if (character.status !== 'active' || character.code_source === 'default') return null
  try {
    const [version, maps] = await Promise.all([
      fetchPublicCharacterVersion(appKey, character.public_id, signal),
      fetchMaps(appKey, 'deathmatch', character.public_id, signal)
    ])
    const contract = maps.find((map) => map.participant_agent_contract_version)?.participant_agent_contract_version ?? null
    return version && contract ? { version_no: version.version_no, agent_contract_version: contract } : null
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

async function loadTeamActiveCode(appKey: string, team: Team, signal: AbortSignal): Promise<BattleActiveCodeSummary | null> {
  if (team.status !== 'active' || team.code_source === 'none') return null
  try {
    const [version, maps] = await Promise.all([
      fetchPublicTeamVersion(appKey, team.public_id, signal),
      fetchMaps(appKey, 'captureTheFlag', team.public_id, signal)
    ])
    const contract = maps.find((map) => map.participant_agent_contract_version)?.participant_agent_contract_version ?? null
    return version && contract ? { version_no: version.version_no, agent_contract_version: contract } : null
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

function battleReadiness(active: boolean, explicitReason: 'team_code_required' | null): { practice: BattleReadiness; ranked: BattleReadiness } {
  const blockingReason = explicitReason ?? (active ? null : 'content_restricted')
  const readiness: BattleReadiness = { can_request: blockingReason === null, blocking_reason: blockingReason }
  return { practice: readiness, ranked: readiness }
}

function toBattleStartMap(map: BattleMap) {
  return {
    map_id: map.map_id,
    name_key: map.name_key,
    width: map.width,
    height: map.height,
    asset_path: map.asset_path,
    min_agent_contract_version: map.min_agent_contract_version,
    is_enabled: map.is_enabled
  }
}

function toDeathmodeError(error: unknown): DeathmodeApiError {
  if (error instanceof DeathmodeApiError) return error
  if (error instanceof AgentDuelIntegrationError) return new DeathmodeApiError(error.status, error.code, error.message)
  return new DeathmodeApiError(0, null, error instanceof Error ? error.message : '请求失败')
}

function toCaptureTheFlagError(error: unknown): CaptureTheFlagApiError {
  if (error instanceof CaptureTheFlagApiError) return error
  if (error instanceof AgentDuelIntegrationError) return new CaptureTheFlagApiError(error.status, error.code, error.message)
  return new CaptureTheFlagApiError(0, null, error instanceof Error ? error.message : '请求失败')
}

function toBattlesNewError(error: unknown): BattlesNewApiError {
  if (error instanceof BattlesNewApiError) return error
  if (error instanceof AgentDuelIntegrationError) {
    return new BattlesNewApiError(error.status, error.code, error.retryAfterSeconds)
  }
  return new BattlesNewApiError(0, null, null)
}
