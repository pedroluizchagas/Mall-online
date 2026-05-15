import { getStore, getStoreSlug } from '@/lib/tenant'

/**
 * Page mínima do Stage 2: imprime o slug resolvido pelo middleware
 * (header `x-store-slug`, roteamento host-based — D1) e dados básicos da
 * loja vindos da view pública `public_catalog_stores`.
 *
 * Slug ausente (apex/www) ou loja inexistente/inativa → `getStore()`
 * dispara `notFound()` → app/not-found.tsx ("loja não encontrada").
 * Telas reais de catálogo/checkout: Stage 3 (fora de escopo aqui).
 */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const slug = getStoreSlug()
  const store = await getStore(slug)

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-lg bg-surface px-8 py-10 text-center shadow-soft">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Mallevo Storefront · Stage 2
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ink">{store.nome}</h1>
        {store.descricao ? (
          <p className="mt-2 text-sm text-ink-muted">{store.descricao}</p>
        ) : null}
        <dl className="mt-6 space-y-1 text-left text-sm text-ink-muted">
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-ink">slug resolvido</dt>
            <dd className="font-mono">{slug}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-ink">store id</dt>
            <dd className="font-mono">{store.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-ink">tempo de entrega</dt>
            <dd>{store.tempo_entrega ?? '—'}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-ink-soft">
          Catálogo e checkout chegam no Stage 3.
        </p>
      </div>
    </main>
  )
}
