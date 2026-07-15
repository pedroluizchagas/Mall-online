import type { CSSProperties } from 'react'

/**
 * Bloco de carregamento (dashboard-redesign Fase 5 §6). Placeholder neutro
 * com shimmer, ciente do tema (usa --bg-3). Serve de tijolo para os
 * skeletons de página em `loading.tsx`. `aria-hidden` — o anúncio de
 * carregamento fica a cargo do container (`role="status"`).
 */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden
      className={`skeleton rounded-md ${className}`}
      style={{ background: 'var(--bg-3)', ...style }}
    />
  )
}
