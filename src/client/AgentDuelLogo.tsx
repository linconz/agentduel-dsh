import { useId } from 'react'

/** AgentDuel 品牌图标，内联后无需额外静态资源路由。 */
export function AgentDuelLogo(): React.JSX.Element {
  const instanceId = useId().replaceAll(':', '')
  const badgeGradientId = `${instanceId}-badge-gradient`
  const bladeGradientId = `${instanceId}-blade-gradient`

  return (
    <svg
      className="agentduel-logo"
      viewBox="0 0 128 128"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={badgeGradientId} x1="20" y1="16" x2="108" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7FA2FF" />
          <stop offset="100%" stopColor="#3559D9" />
        </linearGradient>
        <linearGradient id={bladeGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CFD9FF" />
        </linearGradient>
      </defs>

      <path
        d="M64 8 L101 21 Q112 25 112 38 L112 90 Q112 103 101 107 L64 120 L27 107 Q16 103 16 90 L16 38 Q16 25 27 21 Z"
        fill={`url(#${badgeGradientId})`}
      />

      <g transform="translate(31.1127 -12.8873)">
        <g transform="rotate(-45 64 108)">
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            values="0 64 108; 0 64 108; -51 64 108; -43 64 108; -45 64 108"
            keyTimes="0; 0.37037; 0.77778; 0.92593; 1"
            keySplines="0 0 1 1; 0.22 1 0.36 1; 0.35 0 0.2 1; 0.35 0 0.2 1"
            calcMode="spline"
            dur="1.35s"
            begin="0s"
            repeatCount="1"
            fill="freeze"
          />
          <path d="M59 24 L69 24 L72 71 L56 71 Z" fill={`url(#${bladeGradientId})`} />
          <path d="M64 15 L72 29 L56 29 Z" fill="#FFFFFF" />
          <rect x="45" y="69" width="38" height="9" rx="4.5" fill="#173A9D" />
          <rect x="59" y="76" width="10" height="28" rx="5" fill="#FFD36A" />
          <circle cx="64" cy="108" r="7" fill="#173A9D" />
        </g>
      </g>

      <g transform="translate(-31.1127 -12.8873)">
        <g transform="rotate(45 64 108)">
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            values="0 64 108; 0 64 108; 51 64 108; 43 64 108; 45 64 108"
            keyTimes="0; 0.37037; 0.77778; 0.92593; 1"
            keySplines="0 0 1 1; 0.22 1 0.36 1; 0.35 0 0.2 1; 0.35 0 0.2 1"
            calcMode="spline"
            dur="1.35s"
            begin="0s"
            repeatCount="1"
            fill="freeze"
          />
          <path d="M59 24 L69 24 L72 71 L56 71 Z" fill={`url(#${bladeGradientId})`} />
          <path d="M64 15 L72 29 L56 29 Z" fill="#FFFFFF" />
          <rect x="45" y="69" width="38" height="9" rx="4.5" fill="#173A9D" />
          <rect x="59" y="76" width="10" height="28" rx="5" fill="#FFD36A" />
          <circle cx="64" cy="108" r="7" fill="#173A9D" />
        </g>
      </g>
    </svg>
  )
}
