import type { DashboardCharacterSummary, DashboardSummary } from '../api/client.js'
import type { AgentDuelFeatureRoute } from '../shell/routes.js'

export const ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY = 'agentduel.onboarding.skipped_accounts.v1'

export type OnboardingStep =
  | { kind: 'create-character' }
  | { kind: 'start-battle'; publicId: string }
  | { kind: 'optimize-code'; publicId: string }

interface OnboardingStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function selectOnboardingStep(summary: DashboardSummary): OnboardingStep | null {
  if (summary.characters.length === 0) {
    return summary.teams.length === 0 ? { kind: 'create-character' } : null
  }

  const characters = [...summary.characters].sort((left, right) => left.slot_no - right.slot_no)
  const hasBattle = characters.some(character => battleCount(character) > 0)
  if (!hasBattle) {
    const character = characters.find(item => item.battle_readiness.practice.can_request)
    return character === undefined
      ? null
      : { kind: 'start-battle', publicId: character.public_id }
  }

  if (characters.some(character => character.code_source === 'custom')) return null
  const character = characters.find(item => battleCount(item) > 0 && item.code_source === 'default')
  return character === undefined
    ? null
    : { kind: 'optimize-code', publicId: character.public_id }
}

export function selectVisibleOnboardingStep(
  summary: DashboardSummary,
  startedStep: OnboardingStep['kind'] | null,
  skipped: boolean
): OnboardingStep | null {
  if (skipped) return null
  const step = selectOnboardingStep(summary)
  return step?.kind === startedStep ? null : step
}

export function canPresentOnboardingStep(
  step: OnboardingStep,
  route: AgentDuelFeatureRoute
): boolean {
  if (step.kind !== 'optimize-code') return true
  return route.kind === 'character-list'
    || route.kind === 'team-list'
    || route.kind === 'deathmatch-battles'
    || route.kind === 'capture-the-flag-battles'
}

export function onboardingDestination(step: OnboardingStep): AgentDuelFeatureRoute {
  if (step.kind === 'create-character') return { kind: 'character-create' }
  if (step.kind === 'start-battle') {
    return {
      kind: 'battle-new',
      search: new URLSearchParams({
        mode: 'deathmatch',
        battle_type: 'practice',
        challenger_character_public_id: step.publicId
      }).toString()
    }
  }
  return { kind: 'character-detail', publicId: step.publicId }
}

export function isOnboardingSkipped(
  accountPublicId: string,
  storage: OnboardingStorage | null = browserStorage()
): boolean {
  return readSkippedAccounts(storage).includes(accountPublicId)
}

export function saveOnboardingSkipped(
  accountPublicId: string,
  storage: OnboardingStorage | null = browserStorage()
): boolean {
  if (storage === null) return false
  try {
    const accounts = readSkippedAccounts(storage)
    if (!accounts.includes(accountPublicId)) accounts.push(accountPublicId)
    storage.setItem(ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
    return true
  } catch {
    return false
  }
}

function battleCount(character: DashboardCharacterSummary): number {
  return character.battle_counts.practice + character.battle_counts.ranked
}

function readSkippedAccounts(storage: OnboardingStorage | null): string[] {
  if (storage === null) return []
  try {
    const raw = storage.getItem(ONBOARDING_SKIPPED_ACCOUNTS_STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((value): value is string => typeof value === 'string' && value !== ''))]
  } catch {
    return []
  }
}

function browserStorage(): OnboardingStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
