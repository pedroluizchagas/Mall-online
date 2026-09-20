import {
  Activity,
  Armchair,
  Gift,
  PawPrint,
  Scissors,
  Shirt,
  ShoppingBasket,
  Store,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { NOME_CURTO_POR_PISO, type Piso } from '@mallevo/lib'

/**
 * Diretório do shopping — a placa de wayfinding da entrada, como no consumer
 * (`components/home/Diretorio.tsx`): régua de placas brancas sobre o canvas
 * fumê, rotulada com o filete `DIRETÓRIO ——— N PISOS`. Monocromático: a
 * identidade de cada piso é o ícone de linha, nunca um matiz.
 *
 * No web a placa é uma âncora (`#piso-<slug>`) — desce a própria home até o
 * corredor, o "elevador" do prédio; em `/piso/<slug>` vira navegação.
 */

/** Piso curatorial → ícone de linha (o mesmo vocabulário do `ICONE_POR_PISO` do consumer). */
export const ICONE_POR_PISO: Record<string, LucideIcon> = {
  'praca-alimentacao': Utensils,
  'moda-estilo': Shirt,
  saude: Activity,
  beleza: Scissors,
  pet: PawPrint,
  'casa-vida': Armchair,
  mercado: ShoppingBasket,
  servicos: Wrench,
  'presentes-diversao': Gift,
}

export function Diretorio({
  pisos,
  ativo,
  modo = 'ancora',
}: {
  pisos: Piso[]
  ativo?: string
  /** `ancora` na home (#piso-slug); `rota` nas páginas de piso (/piso/slug). */
  modo?: 'ancora' | 'rota'
}) {
  if (pisos.length === 0) return null
  return (
    <section aria-label="Diretório de pisos">
      <div className="mb-3 flex items-center gap-2.5 text-[11px] font-bold tracking-[1.2px] text-ink-soft">
        <span>DIRETÓRIO</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
        <span>
          {pisos.length} {pisos.length === 1 ? 'PISO' : 'PISOS'}
        </span>
      </div>
      <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden list-none m-0 sm:mx-0 sm:flex-wrap sm:px-0">
        {pisos.map((piso) => {
          const Icone = ICONE_POR_PISO[piso.slug] ?? Store
          const atual = piso.slug === ativo
          return (
            <li key={piso.slug} className="shrink-0">
              <a
                href={modo === 'ancora' ? `#piso-${piso.slug}` : `/piso/${piso.slug}`}
                aria-current={atual ? 'page' : undefined}
                className={`inline-flex h-10 items-center gap-[7px] rounded-pill px-[15px] text-[13px] font-semibold shadow-soft transition-colors ${
                  atual ? 'bg-ink text-canvas' : 'bg-surface text-ink hover:bg-surfaceMuted'
                }`}
              >
                <Icone className="h-[15.5px] w-[15.5px]" strokeWidth={1.8} />
                {NOME_CURTO_POR_PISO[piso.slug] ?? piso.nome}
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
