import type {
  CaptureTheFlagTeamListItem,
  TeamListLatestSubmission
} from '@agentduel/capturetheflag/team-list'
import type {
  DashboardLatestSubmissionSummary,
  DashboardTeamSummary,
  Team
} from '../api/client.js'

export function mapTeamListItem(
  team: DashboardTeamSummary
): CaptureTheFlagTeamListItem {
  return {
    public_id: team.public_id,
    name: team.name,
    status: team.status,
    units: team.units,
    created_at: team.created_at,
    active_code: team.active_code === null
      ? null
      : {
          version_no: team.active_code.version_no,
          ai_model: team.active_code.ai_model
        },
    ranked_rating: team.ranked_rating,
    ranked_results: team.ranked_results,
    latest_submission: mapLatestSubmission(team.latest_submission)
  }
}

function mapLatestSubmission(
  submission: DashboardLatestSubmissionSummary | null
): TeamListLatestSubmission | null {
  if (submission === null || submission.status === 'compiled') return null
  return { version_no: submission.version_no, status: submission.status }
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
