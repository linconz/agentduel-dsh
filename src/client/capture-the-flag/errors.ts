import { CaptureTheFlagApiError } from '@agentduel/capturetheflag/recent-battles'
import { AgentDuelIntegrationError } from '../api/client.js'

export function toCaptureTheFlagError(error: unknown): CaptureTheFlagApiError {
  if (error instanceof CaptureTheFlagApiError) return error
  if (error instanceof AgentDuelIntegrationError) return new CaptureTheFlagApiError(error.status, error.code, error.message)
  return new CaptureTheFlagApiError(0, null, error instanceof Error ? error.message : '请求失败')
}
