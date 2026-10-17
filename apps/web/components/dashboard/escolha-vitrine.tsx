'use client'

import Link from 'next/link'
import {
  ARQUETIPOS,
  VITRINES,
  getOpcoesDeVitrine,
  resolveVitrine,
  type ArquetipoCodigo,
  type Vitrine,
} from '@mallevo/lib'
import { cx } from '@/lib/cx'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Escolha da cara da loja em Minha Loja. A vitrine SEGUE O ESTILO, em
 * qualquer ramo (`resolveVitrine`, a mesma tabela VITRINES que o app e o
 * storefront leem): o que o preview mostra é o que a loja publica. As opções
 * vêm de `getOpcoesDeVitrine`:
 *  - as vitrines desenhadas para o ramo da loja, primeiro;
 *  - as demais vitrines, todas disponíveis, agrupadas por família;
 *  - os estilos sem vitrine (só cores e tipografia sobre o layout padrão).
 * Cada vitrine aparece pela miniatura de verdade (o storefront servindo a
 * loja-demo dela — `pnpm vitrines:miniaturas`), não por um esquema desenhado.
 */

export interface CategoriaDaLoja {
  slug: string
  nome: string
}

const miniatura = (codigo: string) => `/vitrines/${codigo}.webp`

export function EscolhaVitrine({
  preset,
  presetPublicado,
  categoria,
  produtosComFoto,
  aoEscolher,
}: {
  preset: ArquetipoCodigo
  /** O estilo gravado em `stores.theme` (null = a loja nunca publicou um). */
  presetPublicado: ArquetipoCodigo | null
  categoria: CategoriaDaLoja | null
  /** Produtos disponíveis com foto — sem eles a vitrine abre vazia. */
  produtosComFoto: number
  aoEscolher: (preset: ArquetipoCodigo) => void
}) {
  const { sugeridas, outras, soPele, recomendado } = getOpcoesDeVitrine(categoria?.slug)
  const ativa = resolveVitrine(preset)
  const estilo = ARQUETIPOS[preset]
  const deOutroRamo =
    !!ativa && !!categoria && !(VITRINES[ativa].categorias as readonly string[]).includes(categoria.slug)

  return (
    <div>
      {/* ── O que a loja veste agora ─────────────────────────────── */}
      <div className="cartao flex gap-4 p-4 sm:p-5">
        {ativa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={miniatura(ativa)}
            alt=""
            width={78}
            height={120}
            className="h-[120px] w-[78px] shrink-0 rounded-[12px] object-cover ring-1 ring-line"
          />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink-2">
            <PartnerIcon name="store" size={19} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="micro text-ink-3">Sua vitrine</p>
            {preset === presetPublicado ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'var(--ok-lt)', color: 'var(--ok)' }}
              >
                Publicada
              </span>
            ) : (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'var(--warn-lt)', color: 'var(--warn)' }}
              >
                Publique para valer na loja
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[17px] font-semibold tracking-[-0.015em] text-ink">
            {ativa ? `Vitrine ${VITRINES[ativa].nome}` : 'Layout padrão'}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-ink-3">Estilo {estilo.nome}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {ativa
              ? `${VITRINES[ativa].descricao} É o layout da sua loja no app Mallevo e no site.`
              : `${estilo.nome} não tem vitrine própria: veste o layout padrão com as cores, a tipografia e a forma do estilo.`}
          </p>
          {deOutroRamo && categoria && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
              Desenhada para outro ramo — confira no preview se combina com a sua loja.
            </p>
          )}
          {ativa && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
              Ela usa a campanha, o texto da casa, os destaques e as fotos da casa de “Conteúdo da vitrine”; produto
              com recorte sem fundo ganha destaque.
            </p>
          )}
          {produtosComFoto === 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-bg-2 px-3 py-2.5">
              <PartnerIcon name="camera" size={15} className="mt-0.5 shrink-0 text-ink-2" />
              <p className="text-[12px] leading-relaxed text-ink-2">
                Nenhum produto com foto ainda: a vitrine abre vazia até você cadastrar os primeiros.{' '}
                <Link href="/produtos/novo" className="font-bold text-ink">
                  <span className="sublinha">Cadastrar produto</span>
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Vitrines do ramo ─────────────────────────────────────── */}
      {categoria && sugeridas.length > 0 && (
        <div className="mt-6">
          <p className="micro text-ink-3">Vitrines para {categoria.nome}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            Desenhadas para o seu ramo. A foto é uma loja de exemplo; o preview mostra a sua.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            {sugeridas.map((v) => (
              <CartaoVitrine
                key={v.codigo}
                vitrine={v}
                selecionada={preset === v.arquetipo}
                recomendada={v.arquetipo === recomendado}
                aoEscolher={() => aoEscolher(v.arquetipo)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Todas as outras vitrines ─────────────────────────────── */}
      <div className="mt-6">
        <p className="micro text-ink-3">{sugeridas.length > 0 ? 'Outras vitrines' : 'Vitrines'}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
          {sugeridas.length > 0
            ? 'Desenhadas para outros ramos — também valem para a sua loja.'
            : 'Escolha a que combina com a sua loja. A foto é uma loja de exemplo; o preview mostra a sua.'}
        </p>
        <div
          className={cx(
            'mt-3 grid gap-x-3 gap-y-4',
            sugeridas.length > 0 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
          )}
        >
          {outras.map((v) => (
            <CartaoVitrine
              key={v.codigo}
              vitrine={v}
              selecionada={preset === v.arquetipo}
              recomendada={v.arquetipo === recomendado}
              compacto={sugeridas.length > 0}
              aoEscolher={() => aoEscolher(v.arquetipo)}
            />
          ))}
        </div>
      </div>

      {/* ── Só a pele ────────────────────────────────────────────── */}
      <div className="mt-6">
        <p className="micro text-ink-3">Só cores e tipografia</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
          Estilos sem vitrine própria: vestem o layout padrão com as cores, a tipografia e a forma deles.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {soPele.map((codigo) => (
            <LinhaEstilo
              key={codigo}
              codigo={codigo}
              selecionado={preset === codigo}
              recomendado={codigo === recomendado}
              aoEscolher={() => aoEscolher(codigo)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SeloRecomendado() {
  return (
    <span className="shrink-0 rounded-full bg-brick px-1.5 py-0.5 text-[9px] font-bold text-brick-ink">Recomendado</span>
  )
}

function CartaoVitrine({
  vitrine,
  selecionada,
  recomendada,
  compacto = false,
  aoEscolher,
}: {
  vitrine: Vitrine
  selecionada: boolean
  recomendada: boolean
  /** Grade mais densa das "outras vitrines": nome e uma linha de descrição. */
  compacto?: boolean
  aoEscolher: () => void
}) {
  return (
    <button type="button" onClick={aoEscolher} aria-pressed={selecionada} className="group min-w-0 rounded-[16px] text-left">
      <span
        className={cx(
          'relative block overflow-hidden rounded-[14px] bg-bg-2 transition-shadow',
          selecionada ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'ring-1 ring-line group-hover:ring-line-2',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={miniatura(vitrine.codigo)}
          alt=""
          width={312}
          height={480}
          loading="lazy"
          decoding="async"
          className="block aspect-[13/20] w-full object-cover transition-transform duration-500 ease-entrada group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {selecionada && (
          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)] shadow-md">
            <PartnerIcon name="check" size={13} strokeWidth={2.8} />
          </span>
        )}
      </span>
      <span className="mt-2 flex min-w-0 items-center gap-1.5 px-0.5">
        <span className={cx('truncate font-semibold text-ink', compacto ? 'text-[13px]' : 'text-[14px]')}>
          {vitrine.nome}
        </span>
        {recomendada && <SeloRecomendado />}
      </span>
      <span
        className={cx(
          'px-0.5 leading-snug text-ink-3',
          compacto ? 'line-clamp-1 text-[11px]' : 'mt-0.5 line-clamp-2 text-[12px]',
        )}
      >
        {vitrine.descricao}
      </span>
    </button>
  )
}

function LinhaEstilo({
  codigo,
  selecionado,
  recomendado,
  aoEscolher,
}: {
  codigo: ArquetipoCodigo
  selecionado: boolean
  recomendado: boolean
  aoEscolher: () => void
}) {
  const arq = ARQUETIPOS[codigo]
  const cor = arq.tokens.color
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={selecionado}
      className={cx(
        'flex min-w-0 items-center gap-3 rounded-2xl bg-bg px-3 py-2.5 text-left transition-shadow',
        selecionado ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-line-2',
      )}
    >
      <span className="flex shrink-0 -space-x-1.5" aria-hidden>
        {[cor.bg, cor.accent, cor.ink].map((c, i) => (
          <span
            key={i}
            className="size-[18px] rounded-full"
            // Contorno na tinta do tema: preto fixo sumia nas cores escuras no modo escuro.
            style={{
              background: c,
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--ink) 22%, transparent), 0 0 0 2px var(--bg)',
              zIndex: 3 - i,
            }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{arq.nome}</span>
          {recomendado && <SeloRecomendado />}
        </span>
        <span className="block truncate text-[11px] text-ink-3">{arq.mood.join(' · ')}</span>
      </span>
      {selecionado && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)]">
          <PartnerIcon name="check" size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
