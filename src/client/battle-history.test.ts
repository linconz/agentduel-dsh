import { describe, expect, it, vi } from 'vitest'
import type { Battle, BattlePage } from './agentduel-api.js'
import { MergedBattleHistory } from './battle-history.js'

function battle(
  publicId: string,
  createdAt: string,
  options: {
    owner?: string
    battleType?: 'practice' | 'ranked'
    challengeRole?: 'challenger' | 'target' | null
    winnerSide?: 'red' | 'blue' | 'draw' | null
  } = {}
): Battle {
  const owner = options.owner ?? 'owned-a'
  return {
    public_id: publicId,
    share_path: null,
    purpose: 'pvp',
    battle_type: options.battleType ?? 'practice',
    challenge_role: options.challengeRole ?? 'challenger',
    game_mode_id: 'deathmatch',
    map_id: 'arena',
    status: 'done',
    seed: publicId,
    participants: [
      {
        side: 'red',
        kind: 'character',
        public_id: owner,
        name: owner,
        description: null,
        class_id: 'mage',
        code_source: 'custom',
        ai_model: null,
        rating_before: null,
        rating_after: null,
        rating_delta: null,
        k_factor: null
      },
      {
        side: 'blue',
        kind: 'character',
        public_id: `target-${publicId}`,
        name: '对手',
        description: null,
        class_id: 'warrior',
        code_source: 'default',
        ai_model: null,
        rating_before: null,
        rating_after: null,
        rating_delta: null,
        k_factor: null
      }
    ],
    winner_side: options.winnerSide ?? 'red',
    finish_reason: null,
    red_duration_ms: null,
    blue_duration_ms: null,
    engine_version: null,
    replay_available: false,
    created_at: createdAt,
    started_at: null,
    finished_at: null
  }
}

describe('账户级最近对战归并', () => {
  it('跨资源倒序归并、去重并延续各自游标', async () => {
    const pages = new Map<string, BattlePage>([
      ['owned-a:', {
        battles: [
          battle('battle-5', '2026-08-05T00:00:00.000Z'),
          battle('battle-3', '2026-08-03T00:00:00.000Z')
        ],
        next_cursor: 'a-next'
      }],
      ['owned-b:', {
        battles: [
          battle('battle-4', '2026-08-04T00:00:00.000Z', { owner: 'owned-b' }),
          battle('battle-3', '2026-08-03T00:00:00.000Z')
        ],
        next_cursor: null
      }],
      ['owned-a:a-next', {
        battles: [battle('battle-1', '2026-08-01T00:00:00.000Z')],
        next_cursor: null
      }]
    ])
    const loader = vi.fn(async (publicId: string, cursor: string | null) => (
      pages.get(`${publicId}:${cursor ?? ''}`) ?? { battles: [], next_cursor: null }
    ))
    const history = new MergedBattleHistory(['owned-a', 'owned-b'], loader)

    const first = await history.load({ battleTypes: [], challengeRoles: [], results: [], limit: 2 })
    expect(first.battles.map(item => item.public_id)).toEqual(['battle-5', 'battle-4'])
    expect(first.next_cursor).toMatch(/^agentduel-history-/)

    const second = await history.load({
      battleTypes: [],
      challengeRoles: [],
      results: [],
      cursor: first.next_cursor,
      limit: 3
    })
    expect(second.battles.map(item => item.public_id)).toEqual(['battle-3', 'battle-1'])
    expect(second.next_cursor).toBeNull()
    expect(loader).toHaveBeenCalledWith('owned-a', 'a-next', undefined)
  })

  it('把单一战斗类型下推，并在归并时筛选身份与胜负', async () => {
    const loader = vi.fn(async (): Promise<BattlePage> => ({
      battles: [
        battle('win', '2026-08-03T00:00:00.000Z', {
          battleType: 'ranked', challengeRole: 'target', winnerSide: 'red'
        }),
        battle('loss', '2026-08-02T00:00:00.000Z', {
          battleType: 'ranked', challengeRole: 'target', winnerSide: 'blue'
        }),
        battle('wrong-role', '2026-08-01T00:00:00.000Z', {
          battleType: 'ranked', challengeRole: 'challenger', winnerSide: 'red'
        })
      ],
      next_cursor: null
    }))
    const history = new MergedBattleHistory(['owned-a'], loader)
    const page = await history.load({
      battleTypes: ['ranked'],
      challengeRoles: ['target'],
      results: ['win'],
      limit: 10
    })

    expect(page.battles.map(item => item.public_id)).toEqual(['win'])
    expect(loader).toHaveBeenCalledWith('owned-a', null, 'ranked')
  })

  it('筛选变化时以无游标请求建立新会话', async () => {
    const loader = vi.fn(async (): Promise<BattlePage> => ({
      battles: [battle('only', '2026-08-01T00:00:00.000Z')],
      next_cursor: null
    }))
    const history = new MergedBattleHistory(['owned-a'], loader)
    await history.load({ battleTypes: ['practice'], challengeRoles: [], results: [], limit: 1 })
    await history.load({ battleTypes: ['ranked'], challengeRoles: [], results: [], limit: 1 })
    expect(loader).toHaveBeenNthCalledWith(1, 'owned-a', null, 'practice')
    expect(loader).toHaveBeenNthCalledWith(2, 'owned-a', null, 'ranked')
  })
})
