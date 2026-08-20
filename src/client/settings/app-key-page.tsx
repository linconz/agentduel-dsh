import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'
import { AGENTDUEL_PLUGIN_VERSION } from '../api/client.js'
import type { RunTurnstile } from '../shared/page-types.js'
import { TurnstileVerificationError } from '../shared/turnstile.js'
import { AgentDuelLogo } from '../shell/logo.js'
import type { AgentDuelModel } from '../shell/model.js'
import { AppKeyCheckError, checkAppKey, isAppKey, maskAppKey } from './app-key.js'

export const SETTINGS_WEBSITE_URL = 'https://agentduel.app'

export const SETTINGS_FAQS = [
  {
    question: '如何上传 Agent 代码？',
    answer: 'AgentDuel DSH 插件已经帮你集成了提示词，你只需要在角色或者团队详情页填写你的策略（是蹲在草丛、激进进攻还是猥琐防守），然后在 Agent 代码优化区域通过 DeepSeek Harness 进行一键优化。'
  },
  {
    question: '如何开始对战？',
    answer: '有可用角色或队伍后，进入开始对战页面，选择玩法、参赛对象和练习或排位。提交后，页面会等待战斗结果并自动跳转到战斗回放页。'
  },
  {
    question: '对战期间会持续消耗 token 或 Agent 用量吗？',
    answer: '不会持续消耗 token。对战运行的是已经提交并编译通过的 Agent 代码，规则引擎不会在战斗期间持续调用你的 AI。只有在修改或复盘代码时，才会产生 AI 的用量。'
  },
  {
    question: '如何保存对战视频？',
    answer: '打开战斗回放后，使用战斗回放界面的保存对战视频按钮，浏览器会在本地导出 MP4。'
  },
  {
    question: '代码编译失败怎么办？',
    answer: '回到角色或队伍详情页查看代码版本和诊断信息，修复源码后重新提交。'
  },
  {
    question: '如何让 Agent 变强？',
    answer: '先看战斗回放找到具体失误，再改一处策略并重新测试。比如优化索敌路线、技能优先级、残血保命或夺旗协作，而不是一次改动所有逻辑。'
  }
] satisfies ReadonlyArray<{ question: string; answer: React.ReactNode }>

export function AppKeyPage({
  appKey,
  model,
  runTurnstile
}: {
  appKey: string | null
  model: AgentDuelModel
  runTurnstile: RunTurnstile
}): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrySeconds, setRetrySeconds] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const verificationAbortRef = useRef<AbortController | null>(null)
  const cancelResetRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => verificationAbortRef.current?.abort(), [])
  useEffect(() => {
    if (retrySeconds === null || retrySeconds <= 0) return
    const timeout = window.setTimeout(() => setRetrySeconds((current) => current === null || current <= 1 ? null : current - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [retrySeconds])
  useEffect(() => { if (resetOpen) cancelResetRef.current?.focus() }, [resetOpen])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting || retrySeconds !== null) return
    const normalized = draft.trim()
    if (!isAppKey(normalized)) {
      setError(normalized ? 'App Key 格式应为 agent_ 加 16 位大小写字母或数字' : 'App Key 不可为空')
      return
    }
    const controller = new AbortController()
    verificationAbortRef.current?.abort()
    verificationAbortRef.current = controller
    setSubmitting(true)
    setError(null)
    let challenge: Awaited<ReturnType<RunTurnstile>> | null = null
    try {
      challenge = await runTurnstile(controller.signal)
      const valid = await checkAppKey(normalized, challenge.token, controller.signal)
      if (!valid) setError('App Key 无效或已失效')
      else if (!model.saveVerifiedAppKey(normalized)) setError('无法将 App Key 保存到本地，请检查浏览器存储设置')
      else setDraft('')
    } catch (caught: unknown) {
      if (controller.signal.aborted) return
      if (caught instanceof AppKeyCheckError && caught.kind === 'rate-limit') {
        const seconds = caught.retryAfterSeconds ?? 60
        setRetrySeconds(seconds)
        setError(`请求过于频繁，请在 ${seconds} 秒后重试`)
      } else if (caught instanceof TurnstileVerificationError) setError('安全验证失败，请稍后重试')
      else setError('暂时无法验证 App Key，请稍后重试')
    } finally {
      challenge?.release()
      if (verificationAbortRef.current === controller) verificationAbortRef.current = null
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  const confirmReset = (): void => {
    if (!model.resetAppKey()) {
      setError('无法删除本地 App Key，请检查浏览器存储设置')
      return
    }
    setDraft('')
    setRetrySeconds(null)
    setResetOpen(false)
  }
  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) setResetOpen(false)
  }

  return (
    <main className="agentduel-settings-page">
      <article className="agentduel-settings-card">
        <header className="agentduel-settings-header">
          <div className="agentduel-settings-brand">
            <span className="agentduel-settings-logo"><AgentDuelLogo /></span>
            <h1>AgentDuel</h1>
          </div>
          <dl className="agentduel-settings-meta">
            <div>
              <dt>网站</dt>
              <dd><a href={SETTINGS_WEBSITE_URL} target="_blank" rel="noopener noreferrer">{SETTINGS_WEBSITE_URL}</a></dd>
            </div>
            <div>
              <dt>插件版本</dt>
              <dd><code>{AGENTDUEL_PLUGIN_VERSION}</code></dd>
            </div>
          </dl>
        </header>

        <section className={`agentduel-settings-key${appKey === null ? ' agentduel-settings-key--empty' : ''}`} aria-labelledby="agentduel-settings-key-title">
          <header className="agentduel-settings-section-header">
            <h2 id="agentduel-settings-key-title">App Key</h2>
            <p>配置 AgentDuel App Key 后即可使用角色、团队和战斗功能。</p>
          </header>
          {appKey === null ? (
            <form className="agentduel-key-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
              <label className="agentduel-field-label" htmlFor="agentduel-app-key">App Key</label>
              <input id="agentduel-app-key" className="agentduel-key-input" type="text" value={draft} required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="agent_A1b2C3d4E5f6G7h8" disabled={submitting} aria-invalid={error !== null} onChange={(event) => { setDraft(event.target.value); setError(null) }} />
              <p className="agentduel-field-hint">格式：agent_ 加 16 位大小写字母或数字</p>
              <div className="agentduel-status" aria-live="polite">{error ? <p className="agentduel-error">{error}</p> : null}</div>
              <button className="agentduel-primary-button" type="submit" disabled={submitting || retrySeconds !== null || !draft.trim()}>{submitting ? '验证中…' : retrySeconds !== null ? `${retrySeconds} 秒后可重试` : '保存'}</button>
              <div className="agentduel-or" aria-hidden="true"><span /><b>OR</b><span /></div>
              <button className="agentduel-get-key-button" type="button" onClick={() => window.open('https://www.agentduel.app/dashboard/integrations', '_blank', 'noopener,noreferrer')}>获取一个 App Key</button>
            </form>
          ) : (
            <div className="agentduel-verified" aria-live="polite">
              <div className="agentduel-verified-mark">有效</div>
              <p className="agentduel-verified-label">已验证 Key</p>
              <code className="agentduel-masked-key">{maskAppKey(appKey)}</code>
              <button className="agentduel-reset-button" type="button" onClick={() => setResetOpen(true)}>重置 Key</button>
            </div>
          )}
        </section>

        <section className="agentduel-settings-faq" aria-labelledby="agentduel-settings-faq-title">
          <h2 id="agentduel-settings-faq-title">常见问题</h2>
          <dl>
            {SETTINGS_FAQS.map(({ question, answer }) => (
              <div className="agentduel-settings-faq-item" key={question}>
                <dt>{question}</dt>
                <dd>{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
      {resetOpen ? (
        <div className="agentduel-dialog-backdrop" onMouseDown={handleBackdropClick} onKeyDown={(event) => { if (event.key === 'Escape') setResetOpen(false) }}>
          <div className="agentduel-dialog" role="dialog" aria-modal="true" aria-labelledby="agentduel-reset-title">
            <h2 id="agentduel-reset-title">确认重置 Key？</h2>
            <p>确认后将删除本地 App Key，需要重新填写并验证。</p>
            <div className="agentduel-dialog-actions">
              <button ref={cancelResetRef} className="agentduel-secondary-button" type="button" onClick={() => setResetOpen(false)}>取消</button>
              <button className="agentduel-danger-button" type="button" onClick={confirmReset}>确认重置</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
