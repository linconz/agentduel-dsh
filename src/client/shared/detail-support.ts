import {
  AgentDuelIntegrationError,
  isInvalidAppKey,
  type BadgeDisplaySettings,
  type OwnedPublicBadge,
  type VersionSummary
} from '../api/client.js'
import type { AgentDuelPageNavigation } from '../shell/routes.js'

export const UNSUPPORTED_WRITE_MESSAGE = '当前 DSH Integrations API 不支持此操作，请前往 AgentDuel 官网完成。'

export async function loadOptionalVersion(
  shouldLoad: boolean,
  loader: () => Promise<VersionSummary | null>
): Promise<VersionSummary | null> {
  if (!shouldLoad) return null
  try {
    return await loader()
  } catch (error) {
    if (isInvalidAppKey(error)) throw error
    return null
  }
}

export function applyBadgeDisplaySettings(
  badges: readonly OwnedPublicBadge[],
  settings: BadgeDisplaySettings
): OwnedPublicBadge[] {
  const badgesByKey = new Map(badges.map((badge) => [badge.key, badge]))
  const configuredKeys = new Set([...settings.equipped_badge_keys, ...settings.hidden_badge_keys])
  const unspecified = badges.filter((badge) => !configuredKeys.has(badge.key))
  const configured = (keys: readonly string[], isHidden: boolean): OwnedPublicBadge[] => keys.flatMap((key) => {
    const badge = badgesByKey.get(key)
    return badge ? [{ ...badge, is_hidden: isHidden }] : []
  })
  return [
    ...unspecified.map((badge) => ({ ...badge, is_hidden: false })),
    ...configured(settings.equipped_badge_keys, false),
    ...configured(settings.hidden_badge_keys, true)
  ]
}

export function handleBadgeDisplaySaveError(
  error: unknown,
  navigation: AgentDuelPageNavigation,
  reload: () => void
): void {
  if (isInvalidAppKey(error)) navigation.invalidateAppKey()
  if (
    error instanceof AgentDuelIntegrationError
    && ['INVALID_BADGE_DISPLAY_SELECTION', 'CHARACTER_NOT_FOUND', 'TEAM_NOT_FOUND'].includes(error.code ?? '')
  ) reload()
}
