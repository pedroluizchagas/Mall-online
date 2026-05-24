import type { Store } from '@/lib/tenant'
import { formatarReais } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

/**
 * StoreHeader — reescrita RN→DOM do cabeçalho de
 * apps/mobile-consumer/app/loja/[slug].tsx (banner + nome + descrição +
 * meta de entrega + chips de pagamento). Server Component (sem interação).
 *
 * O header animado on-scroll do mobile NÃO é portado em 3a (é polimento de
 * UX, não comportamento de catálogo — fora de escopo, ver RESUMO).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (StoreHeader).
 */
export function StoreHeader({ store }: { store: Store }) {
  const fretGratis = store.taxa_entrega === 0
  const inicial = (store.nome ?? '?').charAt(0).toUpperCase()

  const metodos: string[] = [
    store.aceita_dinheiro ? 'Dinheiro' : null,
    store.aceita_pix ? 'Pix' : null,
    store.aceita_cartao_maquininha ? 'Cartão na entrega' : null,
    store.aceita_cartao_online ? 'Online (cartão / Pix)' : null,
  ].filter((m): m is string => m !== null)

  return (
    <header>
      {/* Banner — banner_url, senão logo_url, senão inicial sobre canvasAlt */}
      <div className="relative h-[200px] w-full overflow-hidden bg-surfaceDark">
        {store.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logo_url}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="select-none text-8xl font-extrabold text-accent opacity-80">
              {inicial}
            </span>
          </div>
        )}
      </div>

      {/* Cabeçalho da loja */}
      <div className="flex flex-col gap-3 bg-surface px-6 py-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          {store.nome}
        </h1>

        {store.descricao ? (
          <p className="line-clamp-3 text-sm font-medium leading-5 text-ink-muted">
            {store.descricao}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {store.tempo_entrega != null ? (
            <span className="text-[13px] font-semibold text-ink-muted">
              {store.tempo_entrega} min
            </span>
          ) : null}
          <span
            className={`text-[13px] font-semibold ${
              fretGratis ? 'text-success' : 'text-ink-muted'
            }`}
          >
            {fretGratis
              ? 'Frete grátis'
              : formatarReais(store.taxa_entrega ?? 0)}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            Aberto
          </span>
        </div>

        {metodos.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {metodos.map((m) => (
              <Badge key={m}>{m}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
