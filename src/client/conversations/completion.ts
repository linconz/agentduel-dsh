import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** 只有最新回合由模型正常完成时，才允许进入对战。 */
export function didLatestTurnCompleteNormally(snapshot: ConversationSnapshot | undefined): boolean {
  if (snapshot === undefined || snapshot.running || snapshot.blank) return false
  const latestTurnNumber = snapshot.chat.timeline.turnOrder.at(-1)
  if (latestTurnNumber === undefined) return false
  const latestTurn = snapshot.chat.timeline.turns.get(latestTurnNumber)
  return latestTurn?.end?.data.reason.kind === 'completed'
}

/** AgentDuel 功能页打开时，不展示只属于 DSH 对话页的对战入口。 */
export function canOfferBattleFromConversation(
  snapshot: ConversationSnapshot | undefined,
  agentDuelPageOpen: boolean
): boolean {
  return !agentDuelPageOpen && didLatestTurnCompleteNormally(snapshot)
}
