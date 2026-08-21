import { describe, expect, it } from 'vitest'
import type { DashboardCharacterSummary } from '../api/client.js'
import { mapCharacterListItem } from './character-mappers.js'

const character: DashboardCharacterSummary = {
  public_id: 'character-1',
  slot_no: 2,
  name: '测试角色',
  status: 'active',
  class_id: 'mage',
  code_source: 'custom',
  active_code: {
    version_no: 7,
    ai_model: 'GPT-5.5',
    agent_contract_version: '0.1.0'
  },
  ranked_rating: 912,
  battle_counts: { practice: 4, ranked: 5 },
  ranked_results: { wins: 5, draws: 1, losses: 3 },
  latest_submission: { version_no: 8, status: 'compiling' },
  battle_readiness: {
    practice: { can_request: false, blocking_reason: 'compiling' },
    ranked: { can_request: false, blocking_reason: 'compiling' }
  },
  created_at: '2026-08-01T00:00:00.000Z',
}

describe('角色列表数据映射', () => {
  it('直接映射摘要中的角色版本、排位数据和提交状态', () => {
    expect(mapCharacterListItem(character)).toMatchObject({
      public_id: 'character-1',
      active_code: { version_no: 7, ai_model: 'GPT-5.5' },
      ranked_results: { wins: 5, draws: 1, losses: 3 },
      latest_submission: { version_no: 8, status: 'compiling' }
    })
  })

  it('默认 Agent 保留空活动版本，已编译提交不重复显示为待处理项', () => {
    expect(mapCharacterListItem({
      ...character,
      code_source: 'default',
      active_code: null,
      latest_submission: { version_no: 7, status: 'compiled' }
    })).toMatchObject({ active_code: null, latest_submission: null })
  })
})
