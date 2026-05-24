import { VerificarClient } from '@/components/auth/VerificarClient'

/**
 * /verificar — Server Component (Stage 3e). Lê `email`/`next` do query e
 * delega ao island client `VerificarClient` (`verifyOtp`).
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3e.
 */
function destinoSeguro(next?: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}

export default function VerificarPage({
  searchParams,
}: {
  searchParams: { email?: string; next?: string }
}) {
  return (
    <main className="bg-surfaceDark">
      <VerificarClient
        email={searchParams.email ?? ''}
        next={destinoSeguro(searchParams.next)}
      />
    </main>
  )
}
