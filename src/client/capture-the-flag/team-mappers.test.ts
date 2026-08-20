import { describe, expect, it } from 'vitest'
import type { Team, VersionSummary } from '../api/client.js'
import { mapTeamListItem } from './team-mappers.js'

const team: Team = {
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

describe('团队列表数据映射', () => {
  it('公开版本读取失败时降级为空版本', () => {
    expect(mapTeamListItem(team, null).active_code).toBeNull()
  })

  it('保留团队单位与内容整改状态', () => {
    const restrictedTeam: Team = {
      ...team,
      status: 'description_violation',
      remediation: {
        violation_type: 'description_violation',
        marked_at: '2026-08-05T00:00:00.000Z',
        submitted_at: null
      }
    }
    expect(mapTeamListItem(restrictedTeam, version)).toMatchObject({
      status: 'description_violation',
      units: [{ slot_no: 1, class_id: 'warrior' }],
      ranked_results: { wins: 2, draws: 1, losses: 1 }
    })
  })
})
