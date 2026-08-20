import {
  buildBattleReviewPrompt,
  type BattleReviewPromptAnalysis
} from '@agentduel/component'
import {
  API_BASE_URL,
  WEBSITE_BASE_URL,
  type Battle,
  type BattleParticipant,
  type Character,
  type Team
} from '../api/client.js'
import type { AgentOptimizationResource } from '../conversations/code-optimization.js'

export interface BattleReviewOptimization {
  resource: AgentOptimizationResource
  prompt: string
}

export function battleReviewOptimization(
  battle: Battle,
  characters: readonly Character[],
  teams: readonly Team[]
): BattleReviewOptimization | null {
  const ownedParticipant = findOwnedParticipant(battle, characters, teams)
  const reviewContextUrl = battleReviewContextUrl(battle.share_path)
  if (ownedParticipant === null || reviewContextUrl === null) return null

  const owner = ownedParticipant.kind === 'character'
    ? characters.find(character => character.public_id === ownedParticipant.public_id)
    : teams.find(team => team.public_id === ownedParticipant.public_id)
  if (owner === undefined) return null

  return {
    resource: { kind: ownedParticipant.kind, publicId: ownedParticipant.public_id },
    prompt: buildBattleReviewPrompt({
      apiKey: owner.api_key,
      ownSide: ownedParticipant.side,
      winnerSide: battle.winner_side,
      guideOrigin: WEBSITE_BASE_URL,
      reviewContextUrl,
      messages: {
        apiKey: (apiKey: string) => `这是我的api key: ${apiKey}`,
        readEntryGuide: (url: string) => `请阅读指引文档 ${url}`,
        readReviewContext: (url: string) => `然后阅读这个接口: ${url}，理解接口返回的 battle_type、game_mode_id、map_id、map_asset_path、map_snapshot、participants、own_participant 和 replay_url 对局结构`,
        analyzeReplay: ({ ownSide, result }: BattleReviewPromptAnalysis) => analyzeReplayMessage(ownSide, result),
        optimizeAndSubmit: '最后帮我优化Agent code，让它下次对战取得更好的成绩，并使用上面的 api key 提交代码'
      }
    })
  }
}

export function battleReviewContextUrl(sharePath: string | null): string | null {
  if (!sharePath) return null
  const normalizedSharePath = new URL(sharePath, WEBSITE_BASE_URL).pathname
  const url = new URL('/api/battles/review-context', API_BASE_URL)
  url.searchParams.set('share_path', normalizedSharePath)
  return url.toString()
}

function findOwnedParticipant(
  battle: Battle,
  characters: readonly Character[],
  teams: readonly Team[]
): BattleParticipant | null {
  return battle.participants.find(participant => (
    participant.kind === 'character'
      ? characters.some(character => character.public_id === participant.public_id)
      : teams.some(team => team.public_id === participant.public_id)
  )) ?? null
}

function analyzeReplayMessage(
  ownSide: 'red' | 'blue',
  result: 'win' | 'loss' | 'draw' | 'unknown'
): string {
  const sideName = ownSide === 'blue' ? '蓝方' : '红方'
  switch (result) {
    case 'win':
      return `再读取接口返回的 replay_url 对局结果，分析我方(${sideName})获胜原因、暴露的问题和可优化点`
    case 'loss':
      return `再读取接口返回的 replay_url 对局结果，分析我方(${sideName})失败或失分原因`
    case 'draw':
      return `再读取接口返回的 replay_url 对局结果，分析我方(${sideName})平局原因、失分点和可优化点`
    case 'unknown':
      return `再读取接口返回的 replay_url 对局结果，分析我方(${sideName})本局表现和可优化点`
  }
}
