import type { OnboardingStep } from './state.js'

const GUIDE_CONTENT: Record<OnboardingStep['kind'], { message: string; action: string }> = {
  'create-character': {
    message: '接下来创建一个死斗模式的角色',
    action: '开始创建'
  },
  'start-battle': {
    message: '接下来开启一场死斗模式的战斗',
    action: '开始对战'
  },
  'optimize-code': {
    message: '你已经参与了一场战斗，但是还没有编写自己的 Agent 对战代码',
    action: 'Agent 代码优化'
  }
}

export const ONBOARDING_GUIDE_LABEL = 'GUIDE'

export function onboardingGuideContent(kind: OnboardingStep['kind']): { message: string; action: string } {
  return GUIDE_CONTENT[kind]
}

export function OnboardingGuidePage({
  onContinue,
  onSkip,
  step
}: {
  onContinue: () => void
  onSkip: () => void
  step: OnboardingStep
}): React.JSX.Element {
  const content = onboardingGuideContent(step.kind)
  return (
    <section className="agentduel-onboarding-page" aria-label="AgentDuel 新用户引导">
      <article className="agentduel-onboarding-card">
        <div className="agentduel-onboarding-header">
          <p className="agentduel-onboarding-kicker">{ONBOARDING_GUIDE_LABEL}</p>
          <button className="agentduel-onboarding-skip" type="button" onClick={onSkip}>跳过引导</button>
        </div>
        <h1>{content.message}</h1>
        <button className="agentduel-primary-button agentduel-onboarding-action" type="button" onClick={onContinue}>
          {content.action}
        </button>
      </article>
    </section>
  )
}
