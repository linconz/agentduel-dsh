import { describe, expect, it } from 'vitest'
import type { DashboardCharacterSummary, DashboardSummary } from '../api/client.js'
import {
  ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY,
  canPresentOnboardingStep,
  isOnboardingSkipped,
  onboardingDestination,
  saveOnboardingSkipped,
  selectOnboardingStep,
  selectVisibleOnboardingStep
} from './state.js'

describe('新用户引导状态', () => {
  it('空账号进入创建角色，只有团队的账号不进入死斗引导', () => {
    expect(selectOnboardingStep(summary({ characters: [], teams: [] }))).toEqual({ kind: 'create-character' })
    expect(selectOnboardingStep(summary({ characters: [], teams: [team()] }))).toBeNull()
  })

  it('无对战时选择槽位最靠前且可开始练习战的角色', () => {
    expect(selectOnboardingStep(summary({
      characters: [
        character({ public_id: 'blocked', slot_no: 1, canRequestPractice: false }),
        character({ public_id: 'available-later', slot_no: 3 }),
        character({ public_id: 'available-first', slot_no: 2 })
      ]
    }))).toEqual({ kind: 'start-battle', publicId: 'available-first' })
  })

  it('无对战且没有可用角色时不进入无法完成的对战引导', () => {
    expect(selectOnboardingStep(summary({
      characters: [character({ canRequestPractice: false })]
    }))).toBeNull()
  })

  it('练习或排位任一有记录后选择槽位最靠前的默认代码参战角色', () => {
    expect(selectOnboardingStep(summary({
      characters: [
        character({ public_id: 'ranked-later', slot_no: 3, rankedBattles: 1 }),
        character({ public_id: 'never-battled', slot_no: 1 }),
        character({ public_id: 'practice-first', slot_no: 2, practiceBattles: 1 })
      ]
    }))).toEqual({ kind: 'optimize-code', publicId: 'practice-first' })
  })

  it('任一死斗角色已经使用自定义代码时完成引导', () => {
    expect(selectOnboardingStep(summary({
      characters: [
        character({ public_id: 'default', practiceBattles: 1 }),
        character({ public_id: 'custom', codeSource: 'custom' })
      ]
    }))).toBeNull()
  })

  it('生成三个步骤的精确目标路由且不改变角色详情 URL 协议', () => {
    expect(onboardingDestination({ kind: 'create-character' })).toEqual({ kind: 'character-create' })
    const battleRoute = onboardingDestination({ kind: 'start-battle', publicId: 'character/1' })
    expect(battleRoute.kind).toBe('battle-new')
    if (battleRoute.kind !== 'battle-new') throw new Error('开始对战路由类型错误')
    expect(Object.fromEntries(new URLSearchParams(battleRoute.search))).toEqual({
      mode: 'deathmatch',
      battle_type: 'practice',
      challenger_character_public_id: 'character/1'
    })
    expect(onboardingDestination({ kind: 'optimize-code', publicId: 'character/1' })).toEqual({
      kind: 'character-detail',
      publicId: 'character/1'
    })
  })

  it('当前步骤开始后不重复拦截，摘要进入下一阶段时连续展示新说明', () => {
    const empty = summary({ characters: [], teams: [] })
    expect(selectVisibleOnboardingStep(empty, null, false)).toEqual({ kind: 'create-character' })
    expect(selectVisibleOnboardingStep(empty, 'create-character', false)).toBeNull()

    const created = summary({ characters: [character({ public_id: 'created' })] })
    expect(selectVisibleOnboardingStep(created, 'create-character', false)).toEqual({
      kind: 'start-battle',
      publicId: 'created'
    })
    expect(selectVisibleOnboardingStep(created, 'start-battle', false)).toBeNull()

    const battled = summary({ characters: [character({ public_id: 'created', practiceBattles: 1 })] })
    expect(selectVisibleOnboardingStep(battled, 'start-battle', false)).toEqual({
      kind: 'optimize-code',
      publicId: 'created'
    })
    expect(selectVisibleOnboardingStep(battled, null, true)).toBeNull()
  })

  it('代码优化说明只在用户之后打开列表页面时展示', () => {
    const step = { kind: 'optimize-code', publicId: 'character-1' } as const
    expect(canPresentOnboardingStep(step, { kind: 'character-list' })).toBe(true)
    expect(canPresentOnboardingStep(step, { kind: 'team-list' })).toBe(true)
    expect(canPresentOnboardingStep(step, { kind: 'deathmatch-battles' })).toBe(true)
    expect(canPresentOnboardingStep(step, { kind: 'capture-the-flag-battles' })).toBe(true)
    expect(canPresentOnboardingStep(step, { kind: 'replay', publicId: 'battle-1' })).toBe(false)
    expect(canPresentOnboardingStep(step, { kind: 'battle-new', search: '' })).toBe(false)
    expect(canPresentOnboardingStep(step, { kind: 'character-detail', publicId: 'character-1' })).toBe(false)
  })
})

describe('新用户引导跳过存储', () => {
  it('按账号独立保存、去重并切换账号判断', () => {
    const storage = memoryStorage()
    expect(saveOnboardingSkipped('account-1', storage)).toBe(true)
    expect(saveOnboardingSkipped('account-1', storage)).toBe(true)
    expect(isOnboardingSkipped('account-1', storage)).toBe(true)
    expect(isOnboardingSkipped('account-2', storage)).toBe(false)
    expect(JSON.parse(storage.getItem(ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY) ?? 'null')).toEqual(['account-1'])
  })

  it('损坏数据按空集合处理并能被新值修复', () => {
    const storage = memoryStorage('{not-json')
    expect(isOnboardingSkipped('account-1', storage)).toBe(false)
    expect(saveOnboardingSkipped('account-1', storage)).toBe(true)
    expect(isOnboardingSkipped('account-1', storage)).toBe(true)
  })

  it('本地存储不可用时安全降级', () => {
    const unavailable = {
      getItem: () => { throw new Error('disabled') },
      setItem: () => { throw new Error('disabled') }
    }
    expect(isOnboardingSkipped('account-1', unavailable)).toBe(false)
    expect(saveOnboardingSkipped('account-1', unavailable)).toBe(false)
    expect(saveOnboardingSkipped('account-1', null)).toBe(false)
  })
})

function summary({
  characters = [character()],
  teams = []
}: {
  characters?: DashboardCharacterSummary[]
  teams?: DashboardSummary['teams']
} = {}): DashboardSummary {
  return {
    user: { public_id: 'account-1' },
    characters,
    teams
  }
}

function team(): DashboardSummary['teams'][number] {
  return {
    public_id: 'team-1',
    slot_no: 1,
    name: '团队',
    status: 'active',
    units: [{ slot_no: 1, class_id: 'warrior' }],
    code_source: 'custom',
    created_at: '2026-08-01T00:00:00.000Z',
    active_code: { version_no: 1, ai_model: null, agent_contract_version: '0.1.0' },
    ranked_rating: 800,
    battle_counts: { practice: 0, ranked: 0 },
    ranked_results: { wins: 0, draws: 0, losses: 0 },
    latest_submission: null,
    battle_readiness: {
      practice: { can_request: true, blocking_reason: null },
      ranked: { can_request: true, blocking_reason: null }
    }
  }
}

function character({
  public_id = 'character-1',
  slot_no = 1,
  practiceBattles = 0,
  rankedBattles = 0,
  codeSource = 'default',
  canRequestPractice = true
}: {
  public_id?: string
  slot_no?: number
  practiceBattles?: number
  rankedBattles?: number
  codeSource?: 'default' | 'custom'
  canRequestPractice?: boolean
} = {}): DashboardCharacterSummary {
  return {
    public_id,
    slot_no,
    name: public_id,
    status: 'active',
    class_id: 'mage',
    code_source: codeSource,
    created_at: '2026-08-01T00:00:00.000Z',
    active_code: codeSource === 'custom'
      ? { version_no: 1, ai_model: null, agent_contract_version: '0.1.0' }
      : null,
    ranked_rating: 800,
    battle_counts: { practice: practiceBattles, ranked: rankedBattles },
    ranked_results: { wins: 0, draws: 0, losses: 0 },
    latest_submission: null,
    battle_readiness: {
      practice: {
        can_request: canRequestPractice,
        blocking_reason: canRequestPractice ? null : 'active_battle'
      },
      ranked: { can_request: true, blocking_reason: null }
    }
  }
}

function memoryStorage(initial?: string): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
} {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set(ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY, initial)
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) }
  }
}
