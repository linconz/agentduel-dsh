import type { CaptureTheFlagBattle } from '@agentduel/capturetheflag/recent-battles'
import type { DeathmatchBattle } from '@agentduel/deathmode/recent-battles'
import type { Battle } from '../api/client.js'
import { routeHref } from '../shell/routes.js'

export function toDeathmatchBattle(battle: Battle): DeathmatchBattle | null {
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

export function toCaptureTheFlagBattle(battle: Battle): CaptureTheFlagBattle | null {
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

export function getRevengeHref(
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
