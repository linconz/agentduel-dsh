import { describe, expect, it } from 'vitest'
import type { DashboardTeamSummary } from '../api/client.js'
import { mapTeamListItem } from './team-mappers.js'

const team: DashboardTeamSummary = {
  public_id: 'team-1',
  slot_no: 1,
  name: '测试团队',
  status: 'active',
  units: [{ slot_no: 1, class_id: 'warrior' }],
  code_source: 'custom',
  active_code: {
    version_no: 7,
    ai_model: 'GPT-5.5',
    agent_contract_version: '0.1.0'
  },
  ranked_rating: 1040,
  ranked_results: { wins: 2, draws: 1, losses: 1 },
  latest_submission: null,
  battle_readiness: {
    practice: { can_request: true, blocking_reason: null },
    ranked: { can_request: true, blocking_reason: null }
  },
  created_at: '2026-08-03T00:00:00.000Z',
}

describe('团队列表数据映射', () => {
  it('摘要没有活动版本时保留空版本', () => {
    expect(mapTeamListItem({ ...team, active_code: null }).active_code).toBeNull()
  })

  it('保留团队单位与内容整改状态', () => {
    const restrictedTeam: DashboardTeamSummary = {
      ...team,
      status: 'description_violation'
    }
    expect(mapTeamListItem(restrictedTeam)).toMatchObject({
      status: 'description_violation',
      units: [{ slot_no: 1, class_id: 'warrior' }],
      ranked_results: { wins: 2, draws: 1, losses: 1 }
    })
  })
})
