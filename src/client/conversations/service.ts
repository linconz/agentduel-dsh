import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ModelProviderGroup, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'

const CONVERSATION_STORAGE_KEY = 'agentduel.conversations.v1'
const MAX_STORED_CONVERSATIONS = 100

export interface AgentConversationRecord {
  sessionId: string
  prompt: string
  provider: string
  model: string
  source?: 'agentduel-plugin'
  characterPublicId?: string
  teamPublicId?: string
  reasoningEffort?: string
  createdAt: number
}

export interface PreparedAgentConversation {
  workspaceId: WorkspaceId
  sessionId: SessionId
  current: ModelSelection
  routable: boolean
  groups: readonly ModelProviderGroup[]
  failures: readonly { id: string; name: string; message: string }[]
}

export interface AgentConversationService {
  getSnapshot: () => readonly AgentConversationRecord[]
  subscribe: (listener: () => void) => () => void
  bindStorage: () => () => void
  remove: (sessionId: string) => void
  synchronizeArchived: (sessionIds: readonly string[]) => void
  chooseWorkspace: () => Promise<WorkspaceId | null>
  prepare: (workspaceId: WorkspaceId) => Promise<PreparedAgentConversation>
  submit: (input: {
    sessionId: SessionId
    prompt: string
    selection: ModelSelection
    characterPublicId?: string
    teamPublicId?: string
  }) => Promise<SessionId>
  open: (sessionId: string) => void
}

export function createAgentConversationService(
  ctx: ClientContext
): AgentConversationService {
  let records = readStoredConversations()
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const replaceRecords = (next: AgentConversationRecord[]): void => {
    if (
      next.length === records.length
      && next.every((record, index) => record === records[index])
    ) return
    records = next
    try {
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(records))
    } catch {
      // 存储不可用时仍在当前页面内同步列表。
    }
    emit()
  }

  const storeRecord = (record: AgentConversationRecord): void => {
    replaceRecords([record, ...records.filter(item => item.sessionId !== record.sessionId)]
      .slice(0, MAX_STORED_CONVERSATIONS))
  }

  return {
    getSnapshot: () => records,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    bindStorage: () => {
      const handleStorage = (event: StorageEvent): void => {
        if (event.key !== CONVERSATION_STORAGE_KEY) return
        records = readStoredConversations()
        emit()
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
    remove: (sessionId) => {
      replaceRecords(records.filter(record => record.sessionId !== sessionId))
    },
    synchronizeArchived: (sessionIds) => {
      if (sessionIds.length === 0 || records.length === 0) return
      const archived = new Set<string>(sessionIds)
      replaceRecords(records.filter(record => !archived.has(record.sessionId)))
    },
    chooseWorkspace: async () => {
      const path = await ctx.uiWorkspace.pickDirectory()
      if (path === null) return null
      const workspace = await ctx.workspaces.create({ path })
      return workspace.workspaceId
    },
    prepare: async (workspaceId) => {
      const sessionId = await ctx.uiWorkspace.connectWorkspace(workspaceId)
      const state = await ctx.modelDirectories.directoryFor(sessionId).load()
      if (state.current === null) throw new Error('DSH 尚未准备好模型配置，请重试')
      return {
        workspaceId,
        sessionId,
        current: state.current,
        routable: state.routable === true,
        groups: state.groups,
        failures: state.failures
      }
    },
    submit: async ({ sessionId, prompt, selection, characterPublicId, teamPublicId }) => {
      await ctx.modelDirectories.directoryFor(sessionId).select(selection)

      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined) throw new Error('DSH 尚未准备好新对话，请重试')
      const accepted = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
      if (!accepted.ok) throw new Error(accepted.error.message)

      storeRecord({
        sessionId,
        prompt,
        provider: selection.provider,
        model: selection.model,
        source: 'agentduel-plugin',
        ...(characterPublicId === undefined ? {} : { characterPublicId }),
        ...(teamPublicId === undefined ? {} : { teamPublicId }),
        ...(selection.reasoningEffort === undefined
          ? {}
          : { reasoningEffort: selection.reasoningEffort }),
        createdAt: Date.now()
      })
      return sessionId
    },
    open: (sessionId) => ctx.sessions.open(sessionId as SessionId)
  }
}

function readStoredConversations(): AgentConversationRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CONVERSATION_STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAgentConversationRecord).slice(0, MAX_STORED_CONVERSATIONS)
  } catch {
    return []
  }
}

export function isAgentConversationRecord(value: unknown): value is AgentConversationRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<AgentConversationRecord>
  return typeof record.sessionId === 'string'
    && record.sessionId.length > 0
    && typeof record.prompt === 'string'
    && record.prompt.trim().length > 0
    && typeof record.provider === 'string'
    && typeof record.model === 'string'
    && (record.source === undefined || record.source === 'agentduel-plugin')
    && (record.characterPublicId === undefined || (
      typeof record.characterPublicId === 'string'
      && record.characterPublicId.trim().length > 0
    ))
    && (record.teamPublicId === undefined || (
      typeof record.teamPublicId === 'string'
      && record.teamPublicId.trim().length > 0
    ))
    && !(record.characterPublicId !== undefined && record.teamPublicId !== undefined)
    && (record.reasoningEffort === undefined || typeof record.reasoningEffort === 'string')
    && typeof record.createdAt === 'number'
    && Number.isFinite(record.createdAt)
}
