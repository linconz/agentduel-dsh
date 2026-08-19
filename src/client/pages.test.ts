import { describe, expect, it } from 'vitest'
import { parseAgentDuelHref, routeHref } from './pages.js'

describe('插件内详情与编辑路由', () => {
  it('角色列表目标进入详情页，编辑页使用独立路径', () => {
    const detailHref = routeHref({ kind: 'character-detail', publicId: 'character/1' })
    const editHref = routeHref({ kind: 'character-edit', publicId: 'character/1' })
    expect(detailHref).toBe('#agentduel/characters/character%2F1')
    expect(editHref).toBe('#agentduel/characters/character%2F1/edit')
    expect(parseAgentDuelHref(detailHref)).toEqual({ kind: 'character-detail', publicId: 'character/1' })
    expect(parseAgentDuelHref(editHref)).toEqual({ kind: 'character-edit', publicId: 'character/1' })
  })

  it('团队详情与编辑路由不会互相混用', () => {
    const detailHref = routeHref({ kind: 'team-detail', publicId: 'team-1' })
    const editHref = routeHref({ kind: 'team-edit', publicId: 'team-1' })
    expect(parseAgentDuelHref(detailHref)?.kind).toBe('team-detail')
    expect(parseAgentDuelHref(editHref)?.kind).toBe('team-edit')
  })
})
