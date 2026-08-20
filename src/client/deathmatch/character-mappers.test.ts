import { describe, expect, it } from 'vitest'
import type { Character, VersionSummary } from '../api/client.js'
import { mapCharacterListItem } from './character-mappers.js'

const character: Character = {
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

const version: VersionSummary = {
  version_no: 7,
  ai_model: 'GPT-5.5',
  change_summary: null
}

describe('角色列表数据映射', () => {
  it('映射角色版本、排位数据，并且不伪造提交状态', () => {
    expect(mapCharacterListItem(character, version)).toMatchObject({
      public_id: 'character-1',
      active_code: { version_no: 7, ai_model: 'GPT-5.5' },
      ranked_results: { wins: 5, draws: 1, losses: 3 },
      latest_submission: null
    })
  })

  it('公开版本读取失败时降级为空版本', () => {
    expect(mapCharacterListItem(character, null).active_code).toBeNull()
  })
})
