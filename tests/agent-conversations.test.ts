import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientContext, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConnectionHandle,
  ModelSelection,
  SessionId,
  WorkspaceId
} from '@deepseek-ai/dsh-client-connection/client'
import {
  createAgentConversationService,
  getConversationStatus,
  isAgentConversationRecord,
  promptTitle
} from '../src/client/agent-conversations.js'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('AgentDuel 对话历史', () => {
  it('将多行提示词压缩为稳定的菜单标题', () => {
    expect(promptTitle('  分析\n\n本轮   对局  ')).toBe('分析 本轮 对局')
    expect(promptTitle('一'.repeat(40))).toBe(`${'一'.repeat(28)}…`)
  })

  it('拒绝不完整或损坏的本地历史记录', () => {
    expect(isAgentConversationRecord({
      sessionId: 'session-1',
      prompt: '分析对局',
      provider: 'deepseek',
      model: 'deepseek-chat',
      createdAt: 1
    })).toBe(true)
    expect(isAgentConversationRecord({
      sessionId: '',
      prompt: '分析对局',
      provider: 'deepseek',
      model: 'deepseek-chat',
      createdAt: 1
    })).toBe(false)
    expect(isAgentConversationRecord({
      sessionId: 'session-1',
      prompt: '分析对局',
      provider: 'deepseek',
      model: 'deepseek-chat',
      createdAt: Number.NaN
    })).toBe(false)
  })

  it('优先展示需要用户处理的会话状态', () => {
    const waiting = {
      running: true,
      pendingInteraction: 'approval',
      blank: false
    } as SessionSummary
    const completed = { running: false, blank: false } as SessionSummary

    expect(getConversationStatus(waiting, false)).toEqual({ label: '等待确认', tone: 'waiting' })
    expect(getConversationStatus(completed, false)).toEqual({ label: '已完成', tone: 'complete' })
    expect(getConversationStatus(undefined, false)).toEqual({ label: '不可用', tone: 'missing' })
  })

  it('连接工作区、选择模型、提交提示词并登记为 AgentDuel 对话', async () => {
    const storage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value)
      }
    })

    const sessionId = 'session-agentduel' as SessionId
    const workspaceId = 'workspace-agentduel' as WorkspaceId
    const prompt = vi.fn().mockResolvedValue({ ok: true, value: { accepted: true } })
    const open = vi.fn()
    const connectWorkspace = vi.fn().mockResolvedValue(sessionId)
    const selectModel = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        value: { selected: { provider: 'deepseek', model: 'deepseek-chat' } }
      }
    })
    const models = vi.fn().mockResolvedValue({
      result: {
        ok: true,
        value: {
          current: { provider: 'deepseek', model: 'deepseek-chat' },
          routable: true,
          groups: [{
            id: 'deepseek',
            name: 'DeepSeek',
            models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }]
          }],
          failures: []
        }
      }
    })
    const ctx = {
      workspaces: { connectWorkspace },
      sessions: {
        binding: () => ({ session: { prompt } }),
        open
      }
    } as unknown as ClientContext
    const connection = {
      api: { sessions: { models, selectModel } }
    } as unknown as ConnectionHandle
    const service = createAgentConversationService(ctx, connection)

    const prepared = await service.prepare(workspaceId)
    expect(prepared.sessionId).toBe(sessionId)
    expect(prepared.groups[0]?.models[0]?.name).toBe('DeepSeek Chat')

    const selection: ModelSelection = { provider: 'deepseek', model: 'deepseek-chat' }
    await service.submit({ sessionId, prompt: '分析对局并优化代码', selection })
    service.open(sessionId)

    expect(selectModel).toHaveBeenCalledWith({
      sessionId,
      provider: 'deepseek',
      model: 'deepseek-chat'
    })
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: '分析对局并优化代码' }], 'queue')
    expect(service.getSnapshot()).toEqual([
      expect.objectContaining({ sessionId, provider: 'deepseek', model: 'deepseek-chat' })
    ])
    expect(open).toHaveBeenCalledWith(sessionId)
  })
})
