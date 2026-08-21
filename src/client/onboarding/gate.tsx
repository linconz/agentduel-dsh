import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ModuleLoadState, useUnauthorizedEffect, type LoadState } from '../shared/load-state.js'
import type { DashboardSummaryCache } from '../shared/dashboard-summary-cache.js'
import type { AgentDuelFeatureRoute, AgentDuelPageNavigation } from '../shell/routes.js'
import { OnboardingGuidePage } from './guide-page.js'
import {
  canPresentOnboardingStep,
  isOnboardingSkipped,
  onboardingDestination,
  saveOnboardingSkipped,
  selectVisibleOnboardingStep,
  type OnboardingStep
} from './state.js'

export function OnboardingGate({
  appKey,
  children,
  dashboardSummary,
  navigation,
  route
}: {
  appKey: string
  children: (highlightOptimizationPublicId: string | null, onHighlightComplete: () => void) => ReactNode
  dashboardSummary: DashboardSummaryCache
  navigation: AgentDuelPageNavigation
  route: AgentDuelFeatureRoute
}): React.JSX.Element {
  const summary = useSyncExternalStore(
    dashboardSummary.subscribe,
    () => dashboardSummary.peek(appKey),
    () => dashboardSummary.peek(appKey)
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [checkState, setCheckState] = useState<LoadState<true>>(() => (
    dashboardSummary.peek(appKey) === null
      ? { status: 'loading', value: null, error: null }
      : { status: 'ready', value: true, error: null }
  ))
  const [startedStep, setStartedStep] = useState<OnboardingStep['kind'] | null>(null)
  const [sessionSkippedAccount, setSessionSkippedAccount] = useState<string | null>(null)
  const [highlightOptimizationPublicId, setHighlightOptimizationPublicId] = useState<string | null>(null)

  useEffect(() => {
    setStartedStep(null)
    setSessionSkippedAccount(null)
    setHighlightOptimizationPublicId(null)
  }, [appKey])

  useEffect(() => {
    const controller = new AbortController()
    setCheckState(
      dashboardSummary.peek(appKey) === null
        ? { status: 'loading', value: null, error: null }
        : { status: 'ready', value: true, error: null }
    )
    void dashboardSummary.get(appKey, 'zh-CN', controller.signal).then(
      () => { if (!controller.signal.aborted) setCheckState({ status: 'ready', value: true, error: null }) },
      (error: unknown) => { if (!controller.signal.aborted) setCheckState({ status: 'error', value: null, error }) }
    )
    return () => controller.abort()
  }, [appKey, dashboardSummary, reloadKey])

  useUnauthorizedEffect(checkState.error, navigation)
  const handleHighlightComplete = useCallback(() => setHighlightOptimizationPublicId(null), [])

  if (checkState.status !== 'ready' || summary === null) {
    return (
      <ModuleLoadState
        label="新用户引导"
        state={checkState}
        onRetry={() => setReloadKey(value => value + 1)}
      />
    )
  }

  const accountPublicId = summary.user.public_id
  const skipped = sessionSkippedAccount === accountPublicId || isOnboardingSkipped(accountPublicId)
  const step = selectVisibleOnboardingStep(summary, startedStep, skipped)
  if (step !== null && canPresentOnboardingStep(step, route)) {
    return (
      <OnboardingGuidePage
        step={step}
        onSkip={() => {
          saveOnboardingSkipped(accountPublicId)
          setSessionSkippedAccount(accountPublicId)
        }}
        onContinue={() => {
          setStartedStep(step.kind)
          if (step.kind === 'optimize-code') setHighlightOptimizationPublicId(step.publicId)
          navigation.navigate(onboardingDestination(step))
        }}
      />
    )
  }

  return <>{children(highlightOptimizationPublicId, handleHighlightComplete)}</>
}
