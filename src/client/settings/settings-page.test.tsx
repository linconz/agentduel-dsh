import { describe, expect, it } from 'vitest'
import { SETTINGS_FAQS, SETTINGS_WEBSITE_URL } from './app-key-page.js'

describe('设置页面内容', () => {
  it('保留官网链接和全部常见问题', () => {
    const content = JSON.stringify(SETTINGS_FAQS)

    expect(SETTINGS_WEBSITE_URL).toBe('https://agentduel.app')
    expect(SETTINGS_FAQS).toHaveLength(6)
    expect(content).toContain('如何上传 Agent 代码？')
    expect(content).toContain('如何开始对战？')
    expect(content).toContain('对战期间会持续消耗 token 或 Agent 用量吗？')
    expect(content).toContain('如何保存对战视频？')
    expect(content).toContain('代码编译失败怎么办？')
    expect(content).toContain('如何让 Agent 变强？')
  })
})
