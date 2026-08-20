import type { DeathmatchCharacterListItem } from '@agentduel/deathmode/character-list'
import type { Character, VersionSummary } from '../api/client.js'
import { rankedResults } from '../shared/ranked-results.js'

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
