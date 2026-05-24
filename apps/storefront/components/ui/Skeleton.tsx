/**
 * Skeleton — reescrita DOM de apps/mobile-consumer/components/ui/Skeleton.tsx.
 * RN `Animated` pulse → CSS `animate-pulse` (Tailwind). Sem 'use client':
 * é puro CSS, renderiza no servidor.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (ui/Skeleton).
 */
export function Skeleton({
  className = '',
  rounded = 'rounded-md',
}: {
  className?: string
  /** Classe de raio (default `rounded-md`). Use `rounded-none` p/ banner. */
  rounded?: string
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-canvasAlt ${rounded} ${className}`}
    />
  )
}
