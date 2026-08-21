import { describe, expect, it } from 'vitest'
import { ONBOARDING_GUIDE_LABEL, onboardingGuideContent } from './guide-page.js'

describe('新用户引导说明页', () => {
  it('左上角使用 GUIDE 标识', () => {
    expect(ONBOARDING_GUIDE_LABEL).toBe('GUIDE')
  })

  it.each([
    ['create-character' as const, '接下来创建一个死斗模式的角色', '开始创建'],
    ['start-battle' as const, '接下来开启一场死斗模式的战斗', '开始对战'],
    ['optimize-code' as const, '你已经参与了一场战斗，但是还没有编写自己的 Agent 对战代码', 'Agent 代码优化']
  ])('为 %s 使用确定的说明和操作文案', (kind, message, action) => {
    expect(onboardingGuideContent(kind)).toEqual({ message, action })
  })
})
