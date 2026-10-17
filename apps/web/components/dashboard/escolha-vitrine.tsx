'use client'

import Link from 'next/link'
import { useState } from 'react'
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
 * Escolha da cara da loja em Minha Loja, apresentada pelo que o lojista
 * GANHA na categoria dele (`getOpcoesDeVitrine`, mesma tabela VITRINES que o
 * app e o storefront leem):
 *  - as VITRINES próprias do ramo, cada uma com a miniatura de verdade (o
 *    storefront servindo a loja-demo daquela vitrine — `pnpm
 *    vitrines:miniaturas`), não um esquema de blocos coloridos;
 *  - os estilos que só vestem cores, tipografia e forma sobre o layout
 *    padrão, recolhidos quando há vitrine a escolher.
 * Antes eram 21 cartões iguais, sem dizer quais viravam vitrine — e o
 * escolhido podia ficar escondido no meio da lista.
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
  const { vitrines, soPele, recomendado } = getOpcoesDeVitrine(categoria?.slug)
  const ativa = resolveVitrine(preset, categoria?.slug)
  const [verOutros, setVerOutros] = useState(() => vitrines.length === 0 || soPele.includes(preset))
  const outrosAbertos = vitrines.length === 0 || verOutros
  const estilo = ARQUETIPOS[preset]

  let explicacao: string
  if (ativa) {
    explicacao = `${VITRINES[ativa].descricao} É o layout da sua loja no app Mallevo e no site.`
  } else if (!categoria) {
    explicacao =
      'Sua loja ainda não tem categoria, e é ela que libera as vitrines próprias. Até lá, o estilo veste o layout padrão com as cores, a tipografia e a forma dele.'
  } else if (vitrines.length === 0) {
    explicacao = `${categoria.nome} ainda não tem vitrine própria: o estilo veste o layout padrão com as cores, a tipografia e a forma dele.`
  } else {
    explicacao = `${estilo.nome} não tem vitrine própria em ${categoria.nome}: veste o layout padrão com as cores, a tipografia e a forma do estilo. Para um layout desenhado para o seu ramo, escolha uma das vitrines abaixo.`
  }

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
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{explicacao}</p>
          {ativa && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
              Ela usa a campanha, o texto da casa, os destaques e as fotos da casa de “Conteúdo da vitrine”; produto
              com recorte sem fundo ganha destaque.
            </p>
          )}
          {!categoria && (
            <Link
              href="/configuracoes/tipo-de-loja"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-ink"
            >
              <span className="sublinha">Ver o tipo de loja</span>
              <PartnerIcon name="chevron-right" size={13} strokeWidth={2.2} />
            </Link>
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

      {/* ── Vitrines próprias do ramo ────────────────────────────── */}
      {categoria && vitrines.length > 0 && (
        <div className="mt-6">
          <p className="micro text-ink-3">Vitrines para {categoria.nome}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            Layout desenhado para o seu ramo, com as cores e a tipografia do estilo. A foto é uma loja de exemplo.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            {vitrines.map((v) => (
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

      {/* ── Só a pele ────────────────────────────────────────────── */}
      <div className="mt-6">
        {vitrines.length > 0 ? (
          <button
            type="button"
            onClick={() => setVerOutros((v) => !v)}
            aria-expanded={outrosAbertos}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1 text-left"
          >
            <span>
              <span className="micro text-ink-3">Outros estilos</span>
              <span className="ml-2 text-[12px] text-ink-3">só cores e tipografia · {soPele.length}</span>
            </span>
            <PartnerIcon name={outrosAbertos ? 'chevron-up' : 'chevron-down'} size={16} className="text-ink-3" />
          </button>
        ) : (
          <p className="micro text-ink-3">Estilos</p>
        )}
        {outrosAbertos && (
          <>
            <p className="mt-1 px-1 text-[12px] leading-relaxed text-ink-3">
              Vestem o layout padrão com as cores, a tipografia e a forma do estilo.
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
          </>
        )}
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
  aoEscolher,
}: {
  vitrine: Vitrine
  selecionada: boolean
  recomendada: boolean
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
        <span className="truncate text-[14px] font-semibold text-ink">{vitrine.nome}</span>
        {recomendada && <SeloRecomendado />}
      </span>
      <span className="block truncate px-0.5 text-[12px] text-ink-3">Estilo {ARQUETIPOS[vitrine.arquetipo].nome}</span>
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
