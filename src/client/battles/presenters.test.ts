import type { BattleHrefSource } from '@agentduel/battles-new'
import { describe, expect, it } from 'vitest'
import { getReplayParticipantDetailHref, getStartAgainSearch } from './presenters.js'

describe('getStartAgainSearch', () => {
  it('预填死斗玩法、战斗类型和本人角色', () => {
    expect(getStartAgainSearch(battle({
      game_mode_id: 'deathmatch',
      battle_type: 'practice',
      participants: [participant('mine'), participant('opponent', 'blue')]
    }), 'mine')).toBe(
      'mode=deathmatch&battle_type=practice&challenger_character_public_id=mine'
    )
  })

  it('预填夺旗玩法、战斗类型和本人团队', () => {
    expect(getStartAgainSearch(battle({
      game_mode_id: 'captureTheFlag',
      battle_type: 'ranked',
      participants: [participant('opponent'), participant('my-team', 'blue')]
    }), 'my-team')).toBe(
      'mode=captureTheFlag&battle_type=ranked&challenger_team_public_id=my-team'
    )
  })

  it('接口不允许或无法确认本人参战对象时不显示', () => {
    expect(getStartAgainSearch(battle({ can_start_again: false }), 'mine')).toBeNull()
    expect(getStartAgainSearch(battle(), null)).toBeNull()
  })
})

describe('getReplayParticipantDetailHref', () => {
  it('按参与者类型和视角生成 DSH 内部详情链接', () => {
    expect(getReplayParticipantDetailHref(
      { kind: 'character', public_id: 'character/1' },
      'owned'
    )).toBe('#agentduel/characters/character%2F1')
    expect(getReplayParticipantDetailHref(
      { kind: 'character', public_id: 'character/2' },
      'public'
    )).toBe('#agentduel/characters/public/character%2F2')
    expect(getReplayParticipantDetailHref(
      { kind: 'team', public_id: 'team/1' },
      'owned'
    )).toBe('#agentduel/teams/team%2F1')
    expect(getReplayParticipantDetailHref(
      { kind: 'team', public_id: 'team/2' },
      'public'
    )).toBe('#agentduel/teams/public/team%2F2')
  })
})

function battle(overrides: Partial<BattleHrefSource> = {}): BattleHrefSource {
  return {
    public_id: 'battle-1',
    game_mode_id: 'deathmatch',
    battle_type: 'ranked',
    participants: [participant('mine'), participant('opponent', 'blue')],
    winner_side: 'red',
    can_start_again: true,
    ...overrides
  }
}

function participant(publicId: string, side: 'red' | 'blue' = 'red') {
  return { public_id: publicId, name: publicId, side }
}
