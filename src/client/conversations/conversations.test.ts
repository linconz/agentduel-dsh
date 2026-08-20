import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientContext, ConversationSnapshot, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConnectionHandle,
  ModelSelection,
  SessionId,
  WorkspaceId
} from '@deepseek-ai/dsh-client-connection/client'
import {
  getConversationBattleSearch,
  getRecordedConversationBattleSearch
} from './battle-links.js'
import {
  canOfferBattleFromConversation,
  didLatestTurnCompleteNormally
} from './completion.js'
import { getConversationStatus, promptTitle } from './helpers.js'
import {
  getDisplayedAgentConversations,
  MAX_DISPLAYED_AGENT_CONVERSATIONS
} from './history.js'
import {
  createAgentConversationService,
  isAgentConversationRecord
} from './service.js'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('AgentDuel 对话历史', () => {
  const conversationWithTurnEndReason = (
    kind: 'completed' | 'aborted' | 'error' | 'max-tokens',
    running = false
  ): ConversationSnapshot => ({
    running,
    blank: false,
    chat: {
      timeline: {
        turnOrder: [1],
        turns: new Map([[1, {
          end: { data: { reason: { kind } } }
        }]])
      }
    }
  } as unknown as ConversationSnapshot)

  it('仅在最新回合由模型正常完成后允许开始对战', () => {
    expect(didLatestTurnCompleteNormally(conversationWithTurnEndReason('completed'))).toBe(true)
    expect(didLatestTurnCompleteNormally(conversationWithTurnEndReason('aborted'))).toBe(false)
    expect(didLatestTurnCompleteNormally(conversationWithTurnEndReason('error'))).toBe(false)
    expect(didLatestTurnCompleteNormally(conversationWithTurnEndReason('max-tokens'))).toBe(false)
    expect(didLatestTurnCompleteNormally(conversationWithTurnEndReason('completed', true))).toBe(false)
    expect(didLatestTurnCompleteNormally(undefined)).toBe(false)

    const stoppedAfterEarlierCompletion = conversationWithTurnEndReason('aborted')
    const latestTurn = stoppedAfterEarlierCompletion.chat.timeline.turns.get(1)
    expect(didLatestTurnCompleteNormally({
      ...stoppedAfterEarlierCompletion,
      chat: {
        ...stoppedAfterEarlierCompletion.chat,
        timeline: {
          turnOrder: [0, 1],
          turns: new Map<number, unknown>([
            [0, {
              ...latestTurn,
              turn: 0,
              end: { ...latestTurn?.end, data: { turn: 0, reason: { kind: 'completed' } } }
            }],
            [1, latestTurn]
          ]) as unknown as ConversationSnapshot['chat']['timeline']['turns']
        }
      }
    } as ConversationSnapshot)).toBe(false)
  })

  it('进入 AgentDuel 功能页后隐藏对话页的开始对战入口', () => {
    const completedConversation = conversationWithTurnEndReason('completed')
    expect(canOfferBattleFromConversation(completedConversation, false)).toBe(true)
    expect(canOfferBattleFromConversation(completedConversation, true)).toBe(false)
  })

  it('将多行提示词压缩为稳定的菜单标题', () => {
    expect(promptTitle('  分析\n\n本轮   对局  ')).toBe('分析 本轮 对局')
    expect(promptTitle('一'.repeat(40))).toBe(`${'一'.repeat(28)}…`)
  })

  it('代码优化列表最多显示最新 5 条记录', () => {
    const records = Array.from({ length: 7 }, (_, index) => ({
      sessionId: `session-${index}`,
      prompt: `优化任务 ${index}`,
      provider: 'deepseek',
      model: 'deepseek-chat',
      createdAt: 7 - index
    }))

    expect(MAX_DISPLAYED_AGENT_CONVERSATIONS).toBe(5)
    expect(getDisplayedAgentConversations(records).map(record => record.sessionId)).toEqual([
      'session-0',
      'session-1',
      'session-2',
      'session-3',
      'session-4'
    ])
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
    expect(isAgentConversationRecord({
      sessionId: 'session-team',
      prompt: '优化团队代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      teamPublicId: 'team-1',
      createdAt: 1
    })).toBe(true)
    expect(isAgentConversationRecord({
      sessionId: 'session-invalid',
      prompt: '优化代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      characterPublicId: 'character-1',
      teamPublicId: 'team-1',
      createdAt: 1
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

  it('只把插件会话对应角色的 AgentDuel 对战链接转换为内部跳转参数', () => {
    const record = {
      sessionId: 'session-1',
      prompt: '优化角色代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      source: 'agentduel-plugin' as const,
      characterPublicId: 'character-1',
      createdAt: 1
    }
    const search = getConversationBattleSearch(
      record,
      'https://agentduel.app/battles/new?mode=deathmatch&battle_type=practice&challenger_character_public_id=character-1'
    )
    expect(Object.fromEntries(new URLSearchParams(search ?? ''))).toEqual({
      mode: 'deathmatch',
      battle_type: 'practice',
      challenger_character_public_id: 'character-1'
    })
    expect(getConversationBattleSearch(
      record,
      'https://agentduel.app/battles/new?challenger_character_public_id=another-character'
    )).toBeNull()
    expect(getConversationBattleSearch(record, 'https://example.com/battles/new')).toBeNull()
  })

  it('模型未输出链接时根据插件记录生成默认对战参数', () => {
    const search = getRecordedConversationBattleSearch({
      sessionId: 'session-1',
      prompt: '优化角色代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      source: 'agentduel-plugin',
      characterPublicId: 'character-1',
      createdAt: 1
    })
    expect(Object.fromEntries(new URLSearchParams(search ?? ''))).toEqual({
      mode: 'deathmatch',
      battle_type: 'practice',
      challenger_character_public_id: 'character-1'
    })

    const teamSearch = getRecordedConversationBattleSearch({
      sessionId: 'session-team',
      prompt: '优化团队代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      source: 'agentduel-plugin',
      teamPublicId: 'team-1',
      createdAt: 1
    })
    expect(Object.fromEntries(new URLSearchParams(teamSearch ?? ''))).toEqual({
      mode: 'captureTheFlag',
      battle_type: 'practice',
      challenger_team_public_id: 'team-1'
    })
  })

  it('只把团队优化会话中对应的夺旗链接转换为内部跳转参数', () => {
    const record = {
      sessionId: 'session-team',
      prompt: '优化团队代码',
      provider: 'deepseek',
      model: 'deepseek-chat',
      source: 'agentduel-plugin' as const,
      teamPublicId: 'team-1',
      createdAt: 1
    }
    const search = getConversationBattleSearch(
      record,
      'https://agentduel.app/battles/new?mode=captureTheFlag&challenger_team_public_id=team-1'
    )
    expect(Object.fromEntries(new URLSearchParams(search ?? ''))).toEqual({
      mode: 'captureTheFlag',
      challenger_team_public_id: 'team-1',
      battle_type: 'practice'
    })
    expect(getConversationBattleSearch(
      record,
      'https://agentduel.app/battles/new?challenger_team_public_id=another-team'
    )).toBeNull()
    expect(getConversationBattleSearch(
      record,
      'https://agentduel.app/battles/new?challenger_character_public_id=character-1'
    )).toBeNull()
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
    const pickDirectory = vi.fn().mockResolvedValue('/workspace/agentduel')
    const create = vi.fn().mockResolvedValue({ workspaceId })
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
      workspaces: { connectWorkspace, create, pickDirectory },
      sessions: {
        binding: () => ({ session: { prompt } }),
        open
      }
    } as unknown as ClientContext
    const connection = {
      api: { sessions: { models, selectModel } }
    } as unknown as ConnectionHandle
    const service = createAgentConversationService(ctx, connection)

    expect(await service.chooseWorkspace()).toBe(workspaceId)
    expect(pickDirectory).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith({ path: '/workspace/agentduel' })

    const prepared = await service.prepare(workspaceId)
    expect(prepared.sessionId).toBe(sessionId)
    expect(prepared.groups[0]?.models[0]?.name).toBe('DeepSeek Chat')

    const selection: ModelSelection = { provider: 'deepseek', model: 'deepseek-chat' }
    await service.submit({
      sessionId,
      prompt: '分析对局并优化代码',
      selection,
      characterPublicId: 'character-1'
    })
    service.open(sessionId)

    expect(selectModel).toHaveBeenCalledWith({
      sessionId,
      provider: 'deepseek',
      model: 'deepseek-chat'
    })
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: '分析对局并优化代码' }], 'queue')
    expect(service.getSnapshot()).toEqual([
      expect.objectContaining({
        sessionId,
        provider: 'deepseek',
        model: 'deepseek-chat',
        source: 'agentduel-plugin',
        characterPublicId: 'character-1'
      })
    ])
    expect(JSON.parse(storage.get('agentduel.conversations.v1') ?? '[]')).toEqual([
      expect.objectContaining({ sessionId, source: 'agentduel-plugin' })
    ])
    expect(open).toHaveBeenCalledWith(sessionId)

    await service.submit({
      sessionId,
      prompt: '优化团队代码',
      selection,
      teamPublicId: 'team-1'
    })
    expect(service.getSnapshot()).toEqual([
      expect.objectContaining({
        sessionId,
        source: 'agentduel-plugin',
        teamPublicId: 'team-1'
      })
    ])
    expect(service.getSnapshot()[0]).not.toHaveProperty('characterPublicId')

    service.synchronizeArchived(['another-session'])
    expect(service.getSnapshot()).toHaveLength(1)
    service.synchronizeArchived([sessionId])
    expect(service.getSnapshot()).toEqual([])
    expect(JSON.parse(storage.get('agentduel.conversations.v1') ?? '[]')).toEqual([])

    await service.submit({
      sessionId,
      prompt: '再次优化团队代码',
      selection,
      teamPublicId: 'team-1'
    })
    service.remove(sessionId)
    expect(service.getSnapshot()).toEqual([])
    expect(JSON.parse(storage.get('agentduel.conversations.v1') ?? '[]')).toEqual([])
  })
})
