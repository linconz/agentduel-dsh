import { DeathmodeApiError } from '@agentduel/deathmode/recent-battles'
import { AgentDuelIntegrationError } from '../api/client.js'

export function toDeathmodeError(error: unknown): DeathmodeApiError {
  if (error instanceof DeathmodeApiError) return error
  if (error instanceof AgentDuelIntegrationError) return new DeathmodeApiError(error.status, error.code, error.message)
  return new DeathmodeApiError(0, null, error instanceof Error ? error.message : '请求失败')
}
