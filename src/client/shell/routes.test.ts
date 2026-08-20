import { describe, expect, it } from 'vitest'
import { parseAgentDuelHref, requiresAgentDuelAppKey, routeHref } from './routes.js'

describe('插件内详情与编辑路由', () => {
  it('观战使用独立公开回放入口', () => {
    const href = routeHref({ kind: 'spectate' })
    expect(href).toBe('#agentduel/replay')
    expect(parseAgentDuelHref(href)).toEqual({ kind: 'spectate' })
    expect(requiresAgentDuelAppKey({ kind: 'spectate' })).toBe(false)
    expect(requiresAgentDuelAppKey({ kind: 'battle-new', search: '' })).toBe(true)
  })

  it('角色列表目标进入详情页，编辑页使用独立路径', () => {
    const detailHref = routeHref({ kind: 'character-detail', publicId: 'character/1' })
    const editHref = routeHref({ kind: 'character-edit', publicId: 'character/1' })
    expect(detailHref).toBe('#agentduel/characters/character%2F1')
    expect(editHref).toBe('#agentduel/characters/character%2F1/edit')
    expect(parseAgentDuelHref(detailHref)).toEqual({ kind: 'character-detail', publicId: 'character/1' })
    expect(parseAgentDuelHref(editHref)).toEqual({ kind: 'character-edit', publicId: 'character/1' })
  })

  it('对手角色使用公开详情路径，不会误入我方详情接口', () => {
    const href = routeHref({ kind: 'character-public-detail', publicId: 'character/guest' })
    expect(href).toBe('#agentduel/characters/public/character%2Fguest')
    expect(parseAgentDuelHref(href)).toEqual({
      kind: 'character-public-detail',
      publicId: 'character/guest'
    })
  })

  it('团队详情与编辑路由不会互相混用', () => {
    const detailHref = routeHref({ kind: 'team-detail', publicId: 'team-1' })
    const editHref = routeHref({ kind: 'team-edit', publicId: 'team-1' })
    expect(parseAgentDuelHref(detailHref)?.kind).toBe('team-detail')
    expect(parseAgentDuelHref(editHref)?.kind).toBe('team-edit')
  })

  it('对手团队使用公开详情路径', () => {
    const href = routeHref({ kind: 'team-public-detail', publicId: 'team/guest' })
    expect(parseAgentDuelHref(href)).toEqual({ kind: 'team-public-detail', publicId: 'team/guest' })
  })
})
