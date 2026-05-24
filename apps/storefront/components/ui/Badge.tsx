/**
 * Badge — reescrita DOM de apps/mobile-consumer/components/ui/Badge.tsx.
 * Usado p/ métodos de pagamento aceitos no StoreHeader (chips estáticos).
 * RN `View`/`Text` → `span`. Cores via tokens Tailwind (Stage 1), sem hex.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (ui/Badge).
 */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  /** `neutral` (default) ou `success` (ex.: "Frete grátis"). */
  tone?: 'neutral' | 'success'
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-accent-soft text-ink'
      : 'bg-surfaceMuted text-ink-muted'

  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-bold ${toneClass}`}
    >
      {children}
    </span>
  )
}
