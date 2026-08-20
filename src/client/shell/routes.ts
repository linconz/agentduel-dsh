const INTERNAL_HREF_PREFIX = '#agentduel/'

export type AgentDuelRoute =
  | { kind: 'none' }
  | { kind: 'app-key' }
  | { kind: 'agent-conversation-new' }
  | { kind: 'spectate' }
  | { kind: 'character-list' }
  | { kind: 'character-create' }
  | { kind: 'character-detail'; publicId: string }
  | { kind: 'character-public-detail'; publicId: string }
  | { kind: 'character-edit'; publicId: string }
  | { kind: 'deathmatch-battles' }
  | { kind: 'team-list' }
  | { kind: 'team-create' }
  | { kind: 'team-detail'; publicId: string }
  | { kind: 'team-public-detail'; publicId: string }
  | { kind: 'team-edit'; publicId: string }
  | { kind: 'capture-the-flag-battles' }
  | { kind: 'battle-new'; search: string }
  | { kind: 'replay'; publicId: string }

export interface AgentDuelPageNavigation {
  navigate: (route: AgentDuelRoute) => void
  invalidateAppKey: () => void
}

export type AgentDuelFeatureRoute = Exclude<
  AgentDuelRoute,
  { kind: 'none' | 'app-key' | 'agent-conversation-new' }
>

export function requiresAgentDuelAppKey(route: AgentDuelRoute): boolean {
  return route.kind !== 'none'
    && route.kind !== 'app-key'
    && route.kind !== 'agent-conversation-new'
    && route.kind !== 'spectate'
}

export function routeHref(route: AgentDuelFeatureRoute): string {
  switch (route.kind) {
    case 'spectate': return `${INTERNAL_HREF_PREFIX}replay`
    case 'character-list': return `${INTERNAL_HREF_PREFIX}characters`
    case 'character-create': return `${INTERNAL_HREF_PREFIX}characters/new`
    case 'character-detail': return `${INTERNAL_HREF_PREFIX}characters/${encodeURIComponent(route.publicId)}`
    case 'character-public-detail': return `${INTERNAL_HREF_PREFIX}characters/public/${encodeURIComponent(route.publicId)}`
    case 'character-edit': return `${INTERNAL_HREF_PREFIX}characters/${encodeURIComponent(route.publicId)}/edit`
    case 'deathmatch-battles': return `${INTERNAL_HREF_PREFIX}deathmatch/battles`
    case 'team-list': return `${INTERNAL_HREF_PREFIX}teams`
    case 'team-create': return `${INTERNAL_HREF_PREFIX}teams/new`
    case 'team-detail': return `${INTERNAL_HREF_PREFIX}teams/${encodeURIComponent(route.publicId)}`
    case 'team-public-detail': return `${INTERNAL_HREF_PREFIX}teams/public/${encodeURIComponent(route.publicId)}`
    case 'team-edit': return `${INTERNAL_HREF_PREFIX}teams/${encodeURIComponent(route.publicId)}/edit`
    case 'capture-the-flag-battles': return `${INTERNAL_HREF_PREFIX}capture-the-flag/battles`
    case 'battle-new': return `${INTERNAL_HREF_PREFIX}battles/new${route.search ? `?${route.search.replace(/^\?/, '')}` : ''}`
    case 'replay': return `${INTERNAL_HREF_PREFIX}battles/replay/${encodeURIComponent(route.publicId)}`
  }
}

export function parseAgentDuelHref(href: string): AgentDuelRoute | null {
  if (!href.startsWith(INTERNAL_HREF_PREFIX)) return null
  const raw = href.slice(INTERNAL_HREF_PREFIX.length)
  const [pathname = '', search = ''] = raw.split('?', 2)
  if (pathname === 'characters') return { kind: 'character-list' }
  if (pathname === 'replay') return { kind: 'spectate' }
  if (pathname === 'characters/new') return { kind: 'character-create' }
  if (pathname === 'deathmatch/battles') return { kind: 'deathmatch-battles' }
  if (pathname === 'teams') return { kind: 'team-list' }
  if (pathname === 'teams/new') return { kind: 'team-create' }
  if (pathname === 'capture-the-flag/battles') return { kind: 'capture-the-flag-battles' }
  if (pathname === 'battles/new') return { kind: 'battle-new', search }
  const characterPublicMatch = /^characters\/public\/(.+)$/.exec(pathname)
  if (characterPublicMatch?.[1]) return { kind: 'character-public-detail', publicId: decodeURIComponent(characterPublicMatch[1]) }
  const characterEditMatch = /^characters\/(.+)\/edit$/.exec(pathname)
  if (characterEditMatch?.[1]) return { kind: 'character-edit', publicId: decodeURIComponent(characterEditMatch[1]) }
  const characterMatch = /^characters\/(.+)$/.exec(pathname)
  if (characterMatch?.[1]) return { kind: 'character-detail', publicId: decodeURIComponent(characterMatch[1]) }
  const teamPublicMatch = /^teams\/public\/(.+)$/.exec(pathname)
  if (teamPublicMatch?.[1]) return { kind: 'team-public-detail', publicId: decodeURIComponent(teamPublicMatch[1]) }
  const teamEditMatch = /^teams\/(.+)\/edit$/.exec(pathname)
  if (teamEditMatch?.[1]) return { kind: 'team-edit', publicId: decodeURIComponent(teamEditMatch[1]) }
  const teamMatch = /^teams\/(.+)$/.exec(pathname)
  if (teamMatch?.[1]) return { kind: 'team-detail', publicId: decodeURIComponent(teamMatch[1]) }
  const replayMatch = /^battles\/replay\/(.+)$/.exec(pathname)
  if (replayMatch?.[1]) return { kind: 'replay', publicId: decodeURIComponent(replayMatch[1]) }
  return null
}
