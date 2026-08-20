import { useMemo } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { parseAgentDuelHref, type AgentDuelPageNavigation } from '../shell/routes.js'

export function useModuleLink(navigation: AgentDuelPageNavigation) {
  return useMemo(() => function ModuleLink({
    children,
    className,
    href,
    'aria-label': ariaLabel
  }: { children: ReactNode; className?: string; href: string; 'aria-label'?: string }): React.JSX.Element {
    const route = parseAgentDuelHref(href)
    const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>): void => {
      if (!route || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigation.navigate(route)
    }
    return (
      <a
        aria-label={ariaLabel}
        className={className}
        href={href}
        onClick={handleClick}
        {...(!route && /^https?:/.test(href) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
      >{children}</a>
    )
  }, [navigation])
}
