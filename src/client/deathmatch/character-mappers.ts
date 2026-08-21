import type {
  CharacterListLatestSubmission,
  DeathmatchCharacterListItem
} from '@agentduel/deathmode/character-list'
import type {
  Character,
  DashboardCharacterSummary,
  DashboardLatestSubmissionSummary
} from '../api/client.js'

export function mapCharacterListItem(
  character: DashboardCharacterSummary
): DeathmatchCharacterListItem {
  return {
    public_id: character.public_id,
    name: character.name,
    status: character.status,
    class_id: character.class_id,
    created_at: character.created_at,
    active_code: character.active_code === null
      ? null
      : {
          version_no: character.active_code.version_no,
          ai_model: character.active_code.ai_model
        },
    ranked_rating: character.ranked_rating,
    ranked_results: character.ranked_results,
    latest_submission: mapLatestSubmission(character.latest_submission)
  }
}

function mapLatestSubmission(
  submission: DashboardLatestSubmissionSummary | null
): CharacterListLatestSubmission | null {
  if (submission === null || submission.status === 'compiled') return null
  return { version_no: submission.version_no, status: submission.status }
}

export function toDeathmodeCharacter(character: Character) {
  return {
    public_id: character.public_id,
    name: character.name,
    description: character.description,
    status: character.status,
    remediation: character.remediation,
    class_id: character.class_id
  }
}
