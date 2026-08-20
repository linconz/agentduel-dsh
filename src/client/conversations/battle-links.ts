import type { AgentConversationRecord } from './service.js'

export function getRecordedConversationBattleSearch(
  record: AgentConversationRecord
): string | null {
  const characterPublicId = record.characterPublicId?.trim()
  if (characterPublicId) {
    return new URLSearchParams({
      mode: 'deathmatch',
      battle_type: 'practice',
      challenger_character_public_id: characterPublicId
    }).toString()
  }
  const teamPublicId = record.teamPublicId?.trim()
  if (!teamPublicId) return null
  return new URLSearchParams({
    mode: 'captureTheFlag',
    battle_type: 'practice',
    challenger_team_public_id: teamPublicId
  }).toString()
}

export function getConversationBattleSearch(
  record: AgentConversationRecord,
  href: string
): string | null {
  let url: URL
  try {
    url = new URL(href, 'https://dsh.local')
  } catch {
    return null
  }
  if (
    url.protocol !== 'https:'
    || (url.hostname !== 'agentduel.app' && url.hostname !== 'www.agentduel.app')
    || url.pathname.replace(/\/+$/, '') !== '/battles/new'
  ) return null

  const linkedCharacterPublicId = url.searchParams.get('challenger_character_public_id')?.trim() || null
  const linkedTeamPublicId = url.searchParams.get('challenger_team_public_id')?.trim() || null
  const recordedCharacterPublicId = record.characterPublicId?.trim() || null
  const recordedTeamPublicId = record.teamPublicId?.trim() || null
  const params = new URLSearchParams(url.search)
  params.set('battle_type', params.get('battle_type') || 'practice')

  if (recordedCharacterPublicId !== null || (recordedTeamPublicId === null && linkedCharacterPublicId !== null)) {
    const characterPublicId = recordedCharacterPublicId ?? linkedCharacterPublicId
    if (
      characterPublicId === null
      || linkedTeamPublicId !== null
      || (linkedCharacterPublicId !== null && linkedCharacterPublicId !== characterPublicId)
    ) return null
    params.set('mode', 'deathmatch')
    params.set('challenger_character_public_id', characterPublicId)
    params.delete('challenger_team_public_id')
    return params.toString()
  }

  const teamPublicId = recordedTeamPublicId ?? linkedTeamPublicId
  if (
    teamPublicId === null
    || linkedCharacterPublicId !== null
    || (linkedTeamPublicId !== null && linkedTeamPublicId !== teamPublicId)
  ) return null
  params.set('mode', 'captureTheFlag')
  params.set('challenger_team_public_id', teamPublicId)
  params.delete('challenger_character_public_id')
  return params.toString()
}
