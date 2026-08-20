import { describe, expect, it } from 'vitest'
import { styles } from './styles.js'

describe('插件页面样式', () => {
  it('展开的左侧菜单使用白色圆角卡片和轻阴影', () => {
    expect(styles).toContain('.agentduel-root--expanded')
    expect(styles).toContain('border: 1px solid #e5e7eb')
    expect(styles).toContain('border-radius: 12px')
    expect(styles).toContain('background: #fff')
    expect(styles).toContain('box-shadow: 0 4px 14px rgb(0 0 0 / 8%)')
    expect(styles).toMatch(/\.agentduel-trigger \{[\s\S]*?border-radius: 0;/)
    expect(styles).toMatch(/\.agentduel-item \{[\s\S]*?border-radius: 0;/)
    expect(styles).toMatch(/\.agentduel-conversation-row \{[\s\S]*?border-radius: 0;/)
  })

  it('收起状态的入口悬停时使用白色圆角卡片', () => {
    expect(styles).toMatch(
      /\.agentduel-root:not\(\.agentduel-root--expanded\):not\(\.agentduel-root--rail\) \.agentduel-trigger \{[\s\S]*?padding: 0 9px 0 7px;[\s\S]*?border: 1px solid transparent;/
    )
    expect(styles).toMatch(
      /\.agentduel-root:not\(\.agentduel-root--expanded\):not\(\.agentduel-root--rail\) \.agentduel-trigger:hover \{[\s\S]*?border-color: #e5e7eb;[\s\S]*?border-radius: 12px;[\s\S]*?background: #fff;[\s\S]*?box-shadow: 0 4px 14px rgb\(0 0 0 \/ 8%\);/
    )
  })

  it('AgentDuel 展开状态使用实心三角形提示', () => {
    expect(styles).toMatch(/\.agentduel-trigger-indicator \{[\s\S]*?fill: currentColor;/)
    expect(styles).not.toContain(".agentduel-trigger[aria-expanded='true'] .agentduel-trigger-indicator")
  })

  it('战斗回放使用更宽页面并同时展示地图和日志', () => {
    expect(styles).toContain('width: min(100%, 1280px)')
    expect(styles).toContain('container: agentduel-replay / inline-size')
    expect(styles).toContain('grid-template-columns: minmax(0, var(--replay-map-target-width)) minmax(320px, 1fr)')
    expect(styles).toContain('.battle-replay-log-column:not(.is-open)')
    expect(styles).toContain('.battle-replay-log-toggle')
    expect(styles).toContain('@container agentduel-replay (max-width: 1174px)')
    expect(styles).toContain('@container agentduel-replay (max-width: 860px)')
    expect(styles).toContain('--replay-map-target-width: calc(100cqi - 32px)')
  })

  it('角色优化表单在提示词右侧纵向排列模型和提交按钮', () => {
    expect(styles).toContain('grid-template-columns: minmax(0, 500px) minmax(220px, 360px)')
    expect(styles).toContain('.agentduel-character-agent-prompt-field')
    expect(styles).toContain('max-width: 500px')
    expect(styles).toContain('@media (max-width: 820px)')
  })

  it('回放主栏使用播放器工具插槽承载代码优化区域', () => {
    expect(styles).toContain('.replay-participant-tools > .agentduel-character-agent-optimization')
    expect(styles).toContain('@container agentduel-replay (max-width: 820px)')
    expect(styles).toContain('.replay-participant-tools .agentduel-character-agent-form')
  })

  it('观战回放提供切换下一场的播放器工具按钮', () => {
    expect(styles).toContain('.agentduel-spectate-next-button')
  })

  it('代码优化列表为每条记录提供独立删除操作', () => {
    expect(styles).toContain('.agentduel-conversation-delete')
    expect(styles).toContain('.agentduel-conversation-open')
  })

  it('设置页面依次承载品牌信息、App Key 和问答并适配移动端', () => {
    expect(styles).toContain('.agentduel-settings-card')
    expect(styles).toContain('.agentduel-settings-logo .agentduel-logo')
    expect(styles).toContain('.agentduel-settings-key')
    expect(styles).toContain('.agentduel-settings-faq-item')
    expect(styles).toMatch(/@media \(max-width: 560px\) \{[\s\S]*?\.agentduel-settings-page \{[\s\S]*?padding: 14px;/)
  })

  it('未配置 App Key 时将整个配置内容列水平居中', () => {
    expect(styles).toMatch(/\.agentduel-settings-key--empty > \.agentduel-settings-section-header,[\s\S]*?\.agentduel-settings-key--empty > \.agentduel-key-form \{[\s\S]*?width: min\(100%, 520px\);[\s\S]*?margin-inline: auto;/)
  })

  it('获取 App Key 按钮每秒在纯白和淡黄之间直接切换', () => {
    expect(styles).toMatch(/\.agentduel-get-key-button \{[\s\S]*?animation: agentduel-get-key-flash 2s steps\(1, end\) infinite;/)
    expect(styles).toMatch(/@keyframes agentduel-get-key-flash \{[\s\S]*?0% \{[\s\S]*?background: #fff;[\s\S]*?50% \{[\s\S]*?background: #fff4c2;/)
  })
})
