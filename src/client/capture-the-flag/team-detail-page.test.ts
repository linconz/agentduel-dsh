import { describe, expect, it } from 'vitest'
import type { OwnedTeam } from '../api/client.js'
import { teamPrompt } from './team-detail-page.js'

describe('团队详情页提示词', () => {
  it('按槽位排序生成团队优化提示词', () => {
    const prompt = teamPrompt({
      api_key: 'team_key',
      units: [
        { slot_no: 2, class_id: 'hunter' },
        { slot_no: 1, class_id: 'warrior' }
      ]
    } as OwnedTeam)

    expect(prompt).toBe([
      '这是我的 api key: team_key',
      '目标：2v2 夺旗，当前队伍职业组合：slot 1: warrior, slot 2: hunter',
      '请完整阅读 https://www.agentduel.app/AGENT_CODE_GUIDE.md',
      '并严格按文档编写我的代码。'
    ].join('\n'))
  })
})
