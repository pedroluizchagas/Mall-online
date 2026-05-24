import { EntrarClient } from '@/components/auth/EntrarClient'

/**
 * /entrar — Server Component (Stage 3e). Resolve o destino pós-login a
 * partir de `?next=` (gate do checkout, emitido pelo CheckoutClient no
 * 3d) e delega ao island client `EntrarClient`.
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3e.
 */
function destinoSeguro(next?: string): string {
  // Só caminhos internos (evita open redirect): começa com '/' e não é
  // protocol-relative ('//'). Default → home.
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}

export default function EntrarPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  return (
    <main className="bg-surfaceDark">
      <EntrarClient next={destinoSeguro(searchParams.next)} />
    </main>
  )
}
