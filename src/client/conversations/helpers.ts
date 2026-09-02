import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ModelCatalogModel, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { PreparedAgentConversation } from './service.js'

export const TASK_PROMPTS = {
  optimize: `请检查当前工作区中的 AgentDuel Agent 代码，并结合已有的对局数据定位策略或实现缺陷。请直接完成可验证的优化，运行相关测试，并保留可提交的代码修改。最后说明修改内容、验证结果以及下一轮对战应重点观察的指标。`,
  analyze: `请分析当前工作区中可获得的 AgentDuel 对局记录、回放数据和 Agent 实现。请说明胜负关键、策略缺陷与异常行为，给出按收益排序的改进建议；如果证据足够，请直接实现最优先的改进并运行相关测试。`
} as const

export type AgentTaskKind = keyof typeof TASK_PROMPTS

export interface SelectableModel {
  provider: string
  providerName: string
  model: ModelCatalogModel
}

export function flattenModels(prepared: PreparedAgentConversation): SelectableModel[] {
  const models = prepared.groups.flatMap(group => group.models.map(model => ({
    provider: group.id,
    providerName: group.name,
    model
  })))
  const hasCurrent = models.some(item => (
    item.provider === prepared.current.provider && item.model.id === prepared.current.model
  ))
  if (hasCurrent || !prepared.routable) return models
  return [...models, {
    provider: prepared.current.provider,
    providerName: prepared.current.provider,
    model: { id: prepared.current.model, name: prepared.current.model }
  }]
}

export function modelSelectionKey(selection: Pick<ModelSelection, 'provider' | 'model'>): string {
  return JSON.stringify([selection.provider, selection.model])
}

export function promptTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim()
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized
}

export function getConversationStatus(
  summary: SessionSummary | undefined,
  pendingInteractionKind: string | undefined,
  loading: boolean
): { label: string; tone: 'running' | 'waiting' | 'complete' | 'submitted' | 'missing' } {
  if (summary === undefined) return loading
    ? { label: '加载中', tone: 'submitted' }
    : { label: '不可用', tone: 'missing' }
  if (pendingInteractionKind === 'approval') return { label: '等待确认', tone: 'waiting' }
  if (pendingInteractionKind === 'plan-review') return { label: '等待方案确认', tone: 'waiting' }
  if (pendingInteractionKind === 'question') return { label: '等待回答', tone: 'waiting' }
  if (summary.running) return { label: '运行中', tone: 'running' }
  if (summary.blank) return { label: '已提交', tone: 'submitted' }
  return { label: '已完成', tone: 'complete' }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}
