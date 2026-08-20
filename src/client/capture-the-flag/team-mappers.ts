import type { CaptureTheFlagTeamListItem } from '@agentduel/capturetheflag/team-list'
import type { Team, VersionSummary } from '../api/client.js'
import { rankedResults } from '../shared/ranked-results.js'

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

export function toCaptureTheFlagTeam(team: Team) {
  return {
    public_id: team.public_id,
    name: team.name,
    description: team.description,
    status: team.status,
    remediation: team.remediation,
    units: team.units
  }
}
