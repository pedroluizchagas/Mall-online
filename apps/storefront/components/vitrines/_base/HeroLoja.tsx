import type { StoreConteudo } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'
import { formatarReais } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { StatusAberto } from './StatusAberto'

/**
 * Hero do layout padrão — a fachada que toda loja sem vitrine própria veste
 * (e a rede de segurança dos 6 arquétipos só com pele).
 *
 * Voz: `stores.conteudo.campanha` (eyebrow/título/subtítulo/CTA) quando o
 * lojista preencheu; senão nome + descrição da loja. Nunca copy inventada.
 * Palco: `banner_url` full-bleed com véu de leitura subindo do pé; sem banner,
 * bloco no ACCENT da pele com a logo (ou a inicial) — o mesmo gesto do
 * SplashLoja do consumer, e a única combinação com contraste garantido pelo
 * `resolveTheme` (accent × accentInk).
 */
export function HeroLoja({ store, conteudo }: { store: Store; conteudo: StoreConteudo }) {
  const campanha = conteudo.campanha
  const titulo = campanha?.titulo ?? store.nome
  const subtitulo = campanha?.subtitulo ?? (campanha ? null : store.descricao)
  const inicial = (store.nome ?? '?').charAt(0).toUpperCase()
  const fretGratis = store.taxa_entrega === 0
  const ehAlimentacao = store.categoria_slug === 'alimentos-bebidas'
  const cta = campanha?.cta ?? (ehAlimentacao ? 'Ver o cardápio' : 'Ver os produtos')

  // Gateway-only: só métodos online aparecem na info da loja (política
  // Mallevo, ver docs/storefront/05-stage-3-storefront.md §3d).
  const metodos: string[] = [
    store.aceita_cartao_online ? 'Cartão de crédito' : null,
    store.aceita_pix ? 'Pix' : null,
  ].filter((m): m is string => m !== null)

  const comFoto = Boolean(store.banner_url)

  return (
    <header>
      <div
        className={`relative w-full overflow-hidden ${
          comFoto ? 'min-h-[320px] bg-ink' : 'min-h-[260px] bg-accent'
        }`}
      >
        {comFoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.banner_url!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Véu de leitura: transparente no alto, denso no pé — a foto
                inteira permanece, o texto sempre lê. */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5"
              aria-hidden
            />
          </>
        ) : null}

        <div
          className={`relative flex min-h-[inherit] flex-col justify-end gap-3 px-screen-x pb-6 pt-16 ${
            comFoto ? 'text-white' : 'text-accent-ink'
          }`}
        >
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo_url}
              alt=""
              className="h-14 w-14 rounded-md bg-surface object-contain p-1 shadow-soft"
            />
          ) : !comFoto ? (
            <span className="font-display text-7xl font-extrabold leading-none opacity-90">
              {inicial}
            </span>
          ) : null}

          {campanha?.eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-85">
              {campanha.eyebrow}
            </p>
          ) : null}

          <h1 className="font-display text-display-lg font-extrabold leading-[1.05] tracking-tight">
            {titulo}
          </h1>

          {subtitulo ? (
            <p className="line-clamp-3 max-w-prose text-[15px] font-medium leading-snug opacity-90">
              {subtitulo}
            </p>
          ) : null}

          {campanha && titulo !== store.nome ? (
            <p className="text-[13px] font-semibold opacity-80">{store.nome}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-line bg-surface px-screen-x py-4">
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
            {fretGratis ? 'Frete grátis' : formatarReais(store.taxa_entrega ?? 0)}
          </span>
          <StatusAberto horarios={store.horarios} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {metodos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {metodos.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          ) : (
            <span />
          )}
          <a
            href="#catalogo"
            className="inline-flex h-10 items-center rounded-pill bg-accent px-5 text-sm font-extrabold text-accent-ink transition-opacity hover:opacity-90"
          >
            {cta}
          </a>
        </div>
      </div>
    </header>
  )
}
