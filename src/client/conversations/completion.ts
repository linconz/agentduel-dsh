import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'

/** 只有最新回合由模型正常完成时，才允许进入对战。 */
export function didLatestTurnCompleteNormally(
  session: SessionSnapshot | undefined,
  chat: ChatSnapshot | undefined
): boolean {
  if (session === undefined || chat === undefined || session.running || session.blank) return false
  const latestTurnNumber = chat.timeline.turnOrder.at(-1)
  if (latestTurnNumber === undefined) return false
  const latestTurn = chat.timeline.turns.get(latestTurnNumber)
  return latestTurn?.end?.data.reason.kind === 'completed'
}

/** AgentDuel 功能页打开时，不展示只属于 DSH 对话页的对战入口。 */
export function canOfferBattleFromConversation(
  session: SessionSnapshot | undefined,
  chat: ChatSnapshot | undefined,
  agentDuelPageOpen: boolean
): boolean {
  return !agentDuelPageOpen && didLatestTurnCompleteNormally(session, chat)
}
