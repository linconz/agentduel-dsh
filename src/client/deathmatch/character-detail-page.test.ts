import { describe, expect, it } from 'vitest'
import type { OwnedCharacter } from '../api/client.js'
import { characterPrompt } from './character-detail-page.js'

describe('角色详情页提示词', () => {
  it('使用公共组件结构生成角色优化提示词，并保留对战链接', () => {
    const prompt = characterPrompt({
      api_key: 'character_key',
      class_id: 'mage',
      public_id: 'character/1'
    } as OwnedCharacter)

    expect(prompt).toBe([
      '这是我的 api key: character_key',
      '目标：1v1 死斗，当前角色职业：mage',
      '请完整阅读 https://www.agentduel.app/AGENT_CODE_GUIDE.md',
      '并严格按文档编写我的代码。'
    ].join('\n'))
  })
})
