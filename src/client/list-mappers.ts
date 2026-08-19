import type { CaptureTheFlagTeamListItem } from '@agentduel/capturetheflag/team-list'
import type { DeathmatchCharacterListItem } from '@agentduel/deathmode/character-list'
import type { Character, Team, VersionSummary } from './agentduel-api.js'

export function mapCharacterListItem(
  character: Character,
  version: VersionSummary | null
): DeathmatchCharacterListItem {
  return {
    public_id: character.public_id,
    name: character.name,
    status: character.status,
    class_id: character.class_id,
    created_at: character.created_at,
    active_code: version === null
      ? null
      : { version_no: version.version_no, ai_model: version.ai_model },
    ranked_rating: character.ranked_rating,
    ranked_results: rankedResults(character),
    latest_submission: null
  }
}

export function mapTeamListItem(
  team: Team,
  version: VersionSummary | null
): CaptureTheFlagTeamListItem {
  return {
    public_id: team.public_id,
    name: team.name,
    status: team.status,
    units: team.units,
    created_at: team.created_at,
    active_code: version === null
      ? null
      : { version_no: version.version_no, ai_model: version.ai_model },
    ranked_rating: team.ranked_rating,
    ranked_results: rankedResults(team),
    latest_submission: null
  }
}

export function rankedResults(
  item: Pick<Character | Team, 'ranked_wins' | 'ranked_draws' | 'ranked_losses'>
): { wins: number; draws: number; losses: number } {
  return {
    wins: item.ranked_wins,
    draws: item.ranked_draws,
    losses: item.ranked_losses
  }
}
