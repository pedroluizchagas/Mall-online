import type { CSSProperties } from 'react'

/**
 * Bloco de carregamento: placeholder neutro com shimmer, ciente do tema
 * (usa --bg-3). Tijolo dos skeletons de página em `loading.tsx`.
 * `aria-hidden` — o anúncio fica a cargo do container (`role="status"`).
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
      className={`skeleton ${/\brounded/.test(className) ? '' : 'rounded-[10px] '}${className}`}
      style={{ background: 'var(--bg-3)', ...style }}
    />
  )
}
