import type { AgentDuelPageNavigation } from '../shell/routes.js'
import type { TurnstileChallenge } from './turnstile.js'

export type RunTurnstile = (signal: AbortSignal) => Promise<TurnstileChallenge>

export interface BasicPageProps {
  appKey: string
  navigation: AgentDuelPageNavigation
}

export interface WritePageProps extends BasicPageProps {
  runTurnstile: RunTurnstile
}

export interface WriteDetailPageProps extends WritePageProps {
  publicId: string
}
