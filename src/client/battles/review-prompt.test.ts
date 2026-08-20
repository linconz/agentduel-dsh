import { describe, expect, it } from 'vitest'
import type { Battle, Character, Team } from '../api/client.js'
import {
  battleReviewContextUrl,
  battleReviewOptimization
} from './review-prompt.js'

describe('对战回放优化提示词', () => {
  it('使用公共组件结构为我方角色生成带复盘接口的失败提示词', () => {
    const optimization = battleReviewOptimization(
      battle({ share_path: '/b/replay-1', winner_side: 'red' }),
      [{ public_id: 'mine', api_key: 'character_secret' } as Character],
      []
    )

    expect(optimization).toEqual({
      resource: { kind: 'character', publicId: 'mine' },
      prompt: [
        '这是我的api key: character_secret',
        '请阅读指引文档 https://www.agentduel.app/AGENT_CODE_GUIDE.md',
        '然后阅读这个接口: https://api.agentduel.app/api/battles/review-context?share_path=%2Fb%2Freplay-1，理解接口返回的 battle_type、game_mode_id、map_id、map_asset_path、map_snapshot、participants、own_participant 和 replay_url 对局结构',
        '再读取接口返回的 replay_url 对局结果，分析我方(蓝方)失败或失分原因',
        '最后帮我优化Agent code，让它下次对战取得更好的成绩，并使用上面的 api key 提交代码'
      ].join('\n')
    })
  })

  it('按参与方类型查找我方团队并生成平局分析提示词', () => {
    const source = battle({
      participants: [{ side: 'red', kind: 'team', public_id: 'team-1' } as Battle['participants'][number]],
      share_path: 'https://www.agentduel.app/b/team-replay',
      winner_side: 'draw'
    })
    const optimization = battleReviewOptimization(
      source,
      [],
      [{ public_id: 'team-1', api_key: 'team_secret' } as Team]
    )

    expect(optimization?.resource).toEqual({ kind: 'team', publicId: 'team-1' })
    expect(optimization?.prompt).toContain('分析我方(红方)平局原因、失分点和可优化点')
  })

  it('没有分享路径或我方参与者时不创建优化区域', () => {
    expect(battleReviewContextUrl(null)).toBeNull()
    expect(battleReviewOptimization(battle({ share_path: null }), [], [])).toBeNull()
  })
})

function battle(overrides: Partial<Battle>): Battle {
  return {
    public_id: 'battle-1',
    share_path: '/b/replay-1',
    purpose: 'pvp',
    battle_type: 'practice',
    game_mode_id: 'deathmatch',
    map_id: 'map-1',
    status: 'done',
    seed: 'seed',
    participants: [{
      side: 'blue',
      kind: 'character',
      public_id: 'mine'
    } as Battle['participants'][number]],
    winner_side: 'blue',
    finish_reason: null,
    red_duration_ms: null,
    blue_duration_ms: null,
    engine_version: null,
    replay_available: true,
    created_at: '2026-08-20T00:00:00.000Z',
    started_at: null,
    finished_at: null,
    ...overrides
  }
}
