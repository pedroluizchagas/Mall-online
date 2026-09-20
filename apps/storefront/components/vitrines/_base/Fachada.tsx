import type { CSSProperties } from 'react'
import { Clock, Truck } from 'lucide-react'
import {
  NOME_POR_CATEGORIA,
  VOZ_POR_PISO,
  VOZ_PADRAO_PISO,
  hasExplicitPreset,
  resolveTheme,
  toCssVars,
  type ThemeTokens,
} from '@mallevo/lib'

import { formatarReais } from '@/lib/format'
import type { DestaqueLoja, LojaSaguao } from '@/lib/saguao'

/**
 * Fachada da loja — a vitrine de cada loja vista do corredor do saguão. É o
 * mesmo tijolo do consumer (`components/home/FachadaLoja.tsx`) traduzido
 * para web: cada fachada veste a pele da PRÓPRIA loja (fundo, tinta, accent,
 * fonte de display) via `resolveTheme` → CSS vars escopadas no card, então
 * as classes Tailwind (`bg-canvas`, `text-ink`, `font-display`…) leem a loja
 * e não o shopping. Loja dark é dark no corredor; serifada é serifada.
 *
 * Anatomia (de cima para baixo), como na RN:
 *   hero      — banner com véu que dissolve na cor do card; pílula
 *               "CATEGORIA • PISO N";
 *   identidade— tijolo do logo cortando a base do hero, nome na fonte da
 *               loja, descrição em uma linha;
 *   vitrine   — rótulo por piso ("Frescos do dia") + link + 3 produtos;
 *   rodapé    — entrega/frete à esquerda, CTA accent à direita.
 *
 * Nada aqui é inventado: pílula = categoria real; sem rating, sem
 * "verificado". O botão Seguir da RN fica de fora (o saguão não tem login).
 * O card inteiro é UM link para `<slug>.mallevo.com.br`.
 */

const HERO_H = 224
const LOGO = 60
const LOGO_SOBRE_HERO = 44
/** A partir de que fração do hero a foto começa a se dissolver no fundo. */
const DISSOLVE_DE = 0.42

export interface FachadaProps {
  loja: LojaSaguao
  pisoSlug: string
  pisoOrdem: number
  destaques: DestaqueLoja[]
  href: string
  /** Acima da dobra: banner e logo carregam `eager` (o resto é lazy). */
  prioridade?: boolean
}

/** Pele da loja como CSS vars inline (ou nada, para loja sem preset). */
export function estiloDaPele(theme: unknown): { style: CSSProperties; tokens: ThemeTokens | null } {
  if (!hasExplicitPreset(theme)) return { style: {}, tokens: null }
  const tokens = resolveTheme(theme)
  const vars = toCssVars(tokens) as Record<string, string>
  vars['--font-display'] = `"${tokens.typography.display.family}", system-ui, sans-serif`
  vars['--font-body'] = `"${tokens.typography.body.family}", system-ui, sans-serif`
  return { style: vars as CSSProperties, tokens }
}

export function Fachada({ loja, pisoSlug, pisoOrdem, destaques, href, prioridade = false }: FachadaProps) {
  const { style, tokens } = estiloDaPele(loja.theme)
  const themed = tokens !== null
  const voz = VOZ_POR_PISO[pisoSlug] ?? VOZ_PADRAO_PISO
  const categoriaNome = loja.categoria_slug ? NOME_POR_CATEGORIA[loja.categoria_slug] ?? null : null
  const freteGratis = loja.taxa_entrega === 0
  const iniciais = loja.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  // Loja sem pele: card branco sobre o canvas (elevação por luminosidade).
  // Com pele: o fundo é o `bg` do arquétipo — a loja em miniatura.
  const fundo = themed ? 'var(--bg)' : 'var(--surface)'
  const caixinha = themed ? 'bg-surface' : 'bg-surfaceMuted'

  return (
    <a
      href={href}
      aria-label={`${loja.nome}${categoriaNome ? `, ${categoriaNome}` : ''}. Entrar na loja`}
      data-theme={tokens?.mode}
      className="group flex h-full flex-col overflow-hidden rounded-[20px] text-ink shadow-medium transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ ...style, ['--fundo' as string]: fundo, background: fundo }}
    >
      {/* ── Hero ── */}
      <div className="relative" style={{ height: HERO_H, background: fundo }}>
        {loja.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.banner_url} alt="" loading={prioridade ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-start justify-end bg-surfaceMuted pr-6 pt-2 overflow-hidden">
            <span className="font-display text-[150px] font-bold leading-none tracking-[-6px] text-accent opacity-[0.16]" aria-hidden>
              {loja.nome.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Véu: sombra de topo (a pílula lê sobre qualquer foto) + dissolução
            na base até a cor EXATA do fundo — a foto é parte do card. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(to bottom, rgba(17,18,22,0.42) 0%, rgba(17,18,22,0) 38%)',
              `linear-gradient(to bottom, transparent ${DISSOLVE_DE * 100}%, color-mix(in srgb, var(--fundo) 28%, transparent) ${(DISSOLVE_DE + (1 - DISSOLVE_DE) * 0.35) * 100}%, color-mix(in srgb, var(--fundo) 72%, transparent) ${(DISSOLVE_DE + (1 - DISSOLVE_DE) * 0.7) * 100}%, var(--fundo) 100%)`,
            ].join(', '),
          }}
          aria-hidden
        />
        <span
          className="absolute left-[14px] top-[14px] inline-flex h-[26px] max-w-[calc(100%-28px)] items-center truncate rounded-pill px-[11px] text-[10px] font-bold uppercase tracking-[1.1px]"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#111216' }}
        >
          {categoriaNome ? `${categoriaNome}  •  ` : ''}Piso {pisoOrdem}
        </span>
      </div>

      {/* ── Identidade ── */}
      <div className="relative z-[1] flex items-end gap-3 px-4" style={{ marginTop: -LOGO_SOBRE_HERO }}>
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] shadow-soft ${loja.logo_url ? 'bg-surface' : 'bg-accent'}`}
          style={{ width: LOGO, height: LOGO }}
        >
          {loja.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.logo_url} alt="" loading={prioridade ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-[20px] font-bold tracking-[-0.5px] text-accent-ink">{iniciais}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pb-0.5">
          <p
            className="truncate font-display font-bold tracking-[-0.3px] text-ink"
            style={{ fontSize: 'calc(19px * var(--type-factor, 1))', lineHeight: 'calc(23px * var(--type-factor, 1))' }}
          >
            {loja.nome}
          </p>
          {loja.descricao && <p className="mt-0.5 truncate font-body text-[12.5px] font-medium text-ink-muted">{loja.descricao}</p>}
        </div>
      </div>

      {/* ── Vitrine ── */}
      {destaques.length > 0 && (
        <div className="px-4 pt-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-muted">{voz.vitrine}</span>
            <span className="flex items-center gap-0.5 text-[12.5px] font-bold text-ink">
              {voz.link}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
              </svg>
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-2.5 list-none p-0 m-0">
            {destaques.map((p) => (
              <li key={p.id} className={`min-w-0 rounded-[14px] p-2.5 ${caixinha}`}>
                <div className="aspect-square w-full overflow-hidden rounded-[8px] bg-surfaceMuted">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-soft" aria-hidden>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8h12l1 12H5L6 8Z" />
                        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate font-body text-[12.5px] font-semibold text-ink">{p.nome}</p>
                <p className="mt-0.5 truncate font-body text-[12px] font-bold text-ink-muted">{formatarReais(p.preco_promocional ?? p.preco)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Rodapé ── */}
      <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-[18px]">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {loja.tempo_entrega !== null && (
            <span className="flex items-center gap-[7px] font-body text-[12px] font-semibold text-ink-muted">
              <Clock className="h-[13px] w-[13px]" strokeWidth={2} /> Entrega em {loja.tempo_entrega} min
            </span>
          )}
          <span className={`flex items-center gap-[7px] font-body text-[12px] font-semibold ${freteGratis ? 'text-success' : 'text-ink-muted'}`}>
            <Truck className="h-[13px] w-[13px]" strokeWidth={2} />
            {freteGratis ? 'Frete grátis' : loja.taxa_entrega != null ? `Frete ${formatarReais(loja.taxa_entrega)}` : 'Entrega pela loja'}
          </span>
        </div>
        <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-pill bg-accent px-5 font-body text-[13.5px] font-bold tracking-[-0.1px] text-accent-ink transition-opacity group-hover:opacity-90">
          {voz.cta}
        </span>
      </div>
    </a>
  )
}
