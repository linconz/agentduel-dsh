import { BattlesNewApiError } from '@agentduel/battles-new'
import { AgentDuelIntegrationError } from '../api/client.js'

export function toBattlesNewError(error: unknown): BattlesNewApiError {
  if (error instanceof BattlesNewApiError) return error
  if (error instanceof AgentDuelIntegrationError) {
    return new BattlesNewApiError(error.status, error.code, error.retryAfterSeconds)
  }
  return new BattlesNewApiError(0, null, null)
}
