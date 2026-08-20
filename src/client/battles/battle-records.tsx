import {
  AgentDuelTeamGuestBattleRecords,
  AgentDuelTeamOwnerBattleRecords
} from '@agentduel/capturetheflag/team-detail'
import type { CaptureTheFlagBattle } from '@agentduel/capturetheflag/recent-battles'
import {
  AgentDuelCharacterGuestBattleRecords,
  AgentDuelCharacterOwnerBattleRecords
} from '@agentduel/deathmode/character-detail'
import type { DeathmatchBattle } from '@agentduel/deathmode/recent-battles'
import { useCallback } from 'react'
import {
  WEBSITE_BASE_URL,
  fetchBattleHistory,
  fetchPublicBattleHistory,
  type GameModeId
} from '../api/client.js'
import { useModuleLink } from '../shared/module-link.js'
import type { BasicPageProps } from '../shared/page-types.js'
import { routeHref } from '../shell/routes.js'
import { mapBattlePage, useDetailBattleRecords } from './battle-records-state.js'
import { getRevengeHref, toCaptureTheFlagBattle, toDeathmatchBattle } from './presenters.js'

export type BattleRecordsProps = BasicPageProps & {
  mode: GameModeId
  view: 'owned' | 'public'
  publicId: string
}

export function BattleRecords(props: BattleRecordsProps): React.JSX.Element {
  if (props.mode === 'deathmatch') {
    return props.view === 'owned'
      ? <CharacterOwnerBattleRecords {...props} />
      : <CharacterPublicBattleRecords {...props} />
  }
  return props.view === 'owned'
    ? <TeamOwnerBattleRecords {...props} />
    : <TeamPublicBattleRecords {...props} />
}

function CharacterOwnerBattleRecords({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const Link = useModuleLink(navigation)
  const loadPage = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    const page = await fetchBattleHistory(appKey, 'characters', publicId, { cursor }, signal)
    return mapBattlePage(page, toDeathmatchBattle)
  }, [appKey, publicId])
  const records = useDetailBattleRecords(loadPage)

  return (
    <AgentDuelCharacterOwnerBattleRecords
      assetBaseUrl={WEBSITE_BASE_URL}
      battles={records.battles}
      error={records.error}
      getCharacterHref={(participantPublicId: string) => participantPublicId === publicId
        ? routeHref({ kind: 'character-detail', publicId: participantPublicId })
        : routeHref({ kind: 'character-public-detail', publicId: participantPublicId })}
      getReplayHref={getDeathmatchReplayHref}
      getRevengeHref={(battle: DeathmatchBattle) => getRevengeHref(battle, publicId)}
      hasMore={records.nextCursor !== null}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      moreHref={routeHref({ kind: 'deathmatch-battles' })}
      ownerCharacterPublicId={publicId}
      status={records.status}
      onLoadMore={records.loadMore}
      onRetry={records.retry}
    />
  )
}

function TeamOwnerBattleRecords({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const Link = useModuleLink(navigation)
  const loadPage = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    const page = await fetchBattleHistory(appKey, 'teams', publicId, { cursor }, signal)
    return mapBattlePage(page, toCaptureTheFlagBattle)
  }, [appKey, publicId])
  const records = useDetailBattleRecords(loadPage)

  return (
    <AgentDuelTeamOwnerBattleRecords
      assetBaseUrl={WEBSITE_BASE_URL}
      battles={records.battles}
      error={records.error}
      getReplayHref={getCaptureTheFlagReplayHref}
      getRevengeHref={(battle: CaptureTheFlagBattle) => getRevengeHref(battle, publicId)}
      getTeamHref={(participantPublicId: string) => participantPublicId === publicId
        ? routeHref({ kind: 'team-detail', publicId: participantPublicId })
        : routeHref({ kind: 'team-public-detail', publicId: participantPublicId })}
      hasMore={records.nextCursor !== null}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      moreHref={routeHref({ kind: 'capture-the-flag-battles' })}
      ownerTeamPublicId={publicId}
      status={records.status}
      onLoadMore={records.loadMore}
      onRetry={records.retry}
    />
  )
}

function CharacterPublicBattleRecords({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const Link = useModuleLink(navigation)
  const loadPage = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    const page = await fetchPublicBattleHistory(appKey, 'characters', publicId, { cursor }, signal)
    return mapBattlePage(page, toDeathmatchBattle)
  }, [appKey, publicId])
  const records = useDetailBattleRecords(loadPage)

  return (
    <AgentDuelCharacterGuestBattleRecords
      assetBaseUrl={WEBSITE_BASE_URL}
      battles={records.battles}
      error={records.error}
      getCharacterHref={(participantPublicId: string) => routeHref({ kind: 'character-public-detail', publicId: participantPublicId })}
      getReplayHref={getDeathmatchReplayHref}
      hasMore={records.nextCursor !== null}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      ownerCharacterPublicId={publicId}
      status={records.status}
      onLoadMore={records.loadMore}
      onRetry={records.retry}
    />
  )
}

function TeamPublicBattleRecords({ appKey, navigation, publicId }: BasicPageProps & { publicId: string }): React.JSX.Element {
  const Link = useModuleLink(navigation)
  const loadPage = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    const page = await fetchPublicBattleHistory(appKey, 'teams', publicId, { cursor }, signal)
    return mapBattlePage(page, toCaptureTheFlagBattle)
  }, [appKey, publicId])
  const records = useDetailBattleRecords(loadPage)

  return (
    <AgentDuelTeamGuestBattleRecords
      assetBaseUrl={WEBSITE_BASE_URL}
      battles={records.battles}
      error={records.error}
      getReplayHref={getCaptureTheFlagReplayHref}
      getTeamHref={(participantPublicId: string) => routeHref({ kind: 'team-public-detail', publicId: participantPublicId })}
      hasMore={records.nextCursor !== null}
      i18nMode="bundled"
      linkComponent={Link}
      locale="zh-CN"
      ownerTeamPublicId={publicId}
      status={records.status}
      onLoadMore={records.loadMore}
      onRetry={records.retry}
    />
  )
}

function getDeathmatchReplayHref(battle: DeathmatchBattle): string | null {
  return battle.replay_available || battle.status === 'pending' || battle.status === 'running'
    ? routeHref({ kind: 'replay', publicId: battle.public_id })
    : null
}

function getCaptureTheFlagReplayHref(battle: CaptureTheFlagBattle): string | null {
  return battle.replay_available || battle.status === 'pending' || battle.status === 'running'
    ? routeHref({ kind: 'replay', publicId: battle.public_id })
    : null
}
