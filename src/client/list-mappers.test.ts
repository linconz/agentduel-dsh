import { describe, expect, it } from 'vitest'
import type { Character, Team, VersionSummary } from './agentduel-api.js'
import { mapCharacterListItem, mapTeamListItem } from './list-mappers.js'

const baseCharacter: Character = {
  public_id: 'character-1',
  slot_no: 2,
  name: '测试角色',
  description: null,
  status: 'active',
  remediation: null,
  class_id: 'mage',
  api_key: 'hidden',
  code_source: 'custom',
  ranked_rating: 912,
  ranked_matches: 9,
  ranked_wins: 5,
  ranked_losses: 3,
  ranked_draws: 1,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-02T00:00:00.000Z'
}

const baseTeam: Team = {
  public_id: 'team-1',
  slot_no: 1,
  name: '测试团队',
  description: null,
  status: 'active',
  remediation: null,
  logo_url: null,
  units: [{ slot_no: 1, class_id: 'warrior' }],
  api_key: 'hidden',
  code_source: 'custom',
  ranked_rating: 1040,
  ranked_matches: 4,
  ranked_wins: 2,
  ranked_losses: 1,
  ranked_draws: 1,
  created_at: '2026-08-03T00:00:00.000Z',
  updated_at: '2026-08-04T00:00:00.000Z'
}

const version: VersionSummary = {
  version_no: 7,
  ai_model: 'GPT-5.5',
  change_summary: null
}

describe('列表数据映射', () => {
  it('映射角色版本、排位数据，并且不伪造提交状态', () => {
    expect(mapCharacterListItem(baseCharacter, version)).toMatchObject({
      public_id: 'character-1',
      active_code: { version_no: 7, ai_model: 'GPT-5.5' },
      ranked_results: { wins: 5, draws: 1, losses: 3 },
      latest_submission: null
    })
  })

  it('公开版本读取失败时降级为空版本', () => {
    expect(mapCharacterListItem(baseCharacter, null).active_code).toBeNull()
    expect(mapTeamListItem(baseTeam, null).active_code).toBeNull()
  })

  it('保留团队单位与内容整改状态', () => {
    const team: Team = {
      ...baseTeam,
      status: 'description_violation',
      remediation: {
        violation_type: 'description_violation',
        marked_at: '2026-08-05T00:00:00.000Z',
        submitted_at: null
      }
    }
    expect(mapTeamListItem(team, version)).toMatchObject({
      status: 'description_violation',
      units: [{ slot_no: 1, class_id: 'warrior' }],
      ranked_results: { wins: 2, draws: 1, losses: 1 }
    })
  })
})
