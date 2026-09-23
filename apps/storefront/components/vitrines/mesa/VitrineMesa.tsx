'use client'

import { useCallback, useMemo } from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  idDaSecao,
  prefereMenosMovimento,
  useHeroEmCena,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoMesa,
  CREME,
  CREME_85,
  CardPrato,
  IconeTraco,
  ItemDoCardapio,
  Letreiro,
  MarcaDaCasa,
  Ornamento,
  SeloTradicao,
  VEU_HERO,
} from './mesa-ui'

/**
 * Vitrine mesa — layout PRÓPRIO do arquétipo `heritage` para restaurantes,
 * churrascarias e cafés com história (docs/store-theme/02 §A e 05 "Vitrine
 * mesa"; refs Veloria, Bistora, La Paloma). Port web de
 * apps/mobile-consumer/components/loja/LojaMesa.tsx. É o DEFAULT de
 * `alimentos-bebidas` — a maior categoria do shopping.
 *
 * DNA destilado das referências:
 * - HERO FULL-BLEED com a foto da casa, véu quente e o nome (ou a campanha)
 *   em SERIFA de display em creme; SELO DE TRADIÇÃO circular; CTA de contorno;
 * - muito RESPIRO: statement da casa (manifesto ou descrição) em serifa leve,
 *   com ORNAMENTO (fio · losango · fio) separando os blocos;
 * - PRATOS DA CASA (os `destaques` do lojista; senão os primeiros com foto)
 *   em trilho de fotos 4:5 com legenda serifada;
 * - CARDÁPIO-LIVRO sobre o creme: título de seção serifado centrado, itens com
 *   foto pequena, nome em serifa e LINHA PONTILHADA até o preço;
 * - fotos da casa (`galeria_casa`) numa faixa de borda a borda.
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), a barra de
 * menu inferior, a status bar e a transição radial. A sacola vive no header.
 */

const ID_CARDAPIO = 'cardapio'
const ALTURA_HEADER = 58
const MAX_PRATOS = 6

export function VitrineMesa({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])

  // Pratos da casa: os `destaques` eleitos pelo lojista; sem eles, os
  // primeiros com foto na ordem do cardápio (a derivação da RN).
  const pratos = useMemo(() => {
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const base = escolhidos.length > 0 ? escolhidos : todos.filter((p) => p.foto_url)
    return base.slice(0, MAX_PRATOS)
  }, [todos, conteudo.destaques])

  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()
  const headerClaro = !heroEmCena

  const titulo = campanha?.titulo ?? store.nome
  const eyebrow = campanha?.eyebrow ?? 'Cozinha de tradição'
  const cta = campanha?.cta ?? 'Ver o cardápio'
  const statement = conteudo.manifesto ?? store.descricao ?? null
  const galeriaCasa = conteudo.galeria_casa ?? []
  const inicial = store.nome.trim().charAt(0).toUpperCase() || '·'

  const meta = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : store.taxa_entrega != null ? `Entrega ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)

  const rolarParaCardapio = useCallback(() => {
    document.getElementById(ID_CARDAPIO)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoMesa — folha creme com serifa e pill
        // madeira) no lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Header: nu sobre a foto → surface com fio depois do hero ── */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 border-b border-line bg-surface transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ height: ALTURA_HEADER, opacity: headerClaro ? 1 : 0 }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]" style={{ height: ALTURA_HEADER }}>
                  <MarcaDaCasa nome={store.nome} logoUrl={store.logo_url} escuro={headerClaro} />
                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center font-display text-[17px] font-semibold tracking-[0.2px] text-ink transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ opacity: headerClaro ? 1 : 0 }}
                    aria-hidden={!headerClaro}
                    tabIndex={headerClaro ? 0 : -1}
                  >
                    {store.nome}
                  </a>
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoMesa
                        icone="bag"
                        escuro={headerClaro}
                        contador={totalItens}
                        rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                        aoTocar={abrirSacola}
                      />
                    )}
                  </Sacola>
                </div>
              </div>
            </div>

            {/* ── Hero full-bleed: foto da casa, selo e nome em serifa ── */}
            <section ref={heroRef} className="relative h-[56svh] max-h-[640px] min-h-[380px] overflow-hidden bg-accent" aria-label="A casa">
              {store.banner_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.banner_url}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <SeloTradicao inicial={inicial} className="absolute right-screen-x top-[calc(58px+14px)]" />

              <div className="absolute inset-x-0 bottom-[30px] flex flex-col items-start gap-2.5 px-screen-x">
                <p className="font-body text-[11px] font-semibold uppercase tracking-[2.4px]" style={{ color: CREME_85 }}>
                  {eyebrow}
                </p>
                <h1
                  className="line-clamp-3 font-display font-semibold tracking-[-0.4px]"
                  style={{ color: CREME, fontSize: 'calc(40px * var(--type-factor, 1))', lineHeight: 'calc(44px * var(--type-factor, 1))' }}
                >
                  {titulo}
                </h1>
                {campanha?.subtitulo && (
                  <p className="line-clamp-2 font-body text-[14.5px] font-medium" style={{ color: CREME_85 }}>
                    {campanha.subtitulo}
                  </p>
                )}
                <a
                  href={`#${ID_CARDAPIO}`}
                  onClick={(e) => {
                    e.preventDefault()
                    rolarParaCardapio()
                  }}
                  className="mt-1.5 inline-flex items-center gap-2 rounded-pill border px-5 py-[11px] font-body text-[13.5px] font-semibold transition-colors hover:bg-white/10"
                  style={{ borderColor: CREME_85, color: CREME }}
                >
                  {cta}
                  <IconeTraco nome="chevron-down" tamanho={14} espessura={2.2} />
                </a>
              </div>
            </section>

            {/* ── Meta da casa ── */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-screen-x pt-[22px] text-center font-body text-[11.5px] font-semibold uppercase tracking-[1.6px] text-ink-muted">
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
              <StatusAberto horarios={store.horarios} className="font-body text-[11.5px] font-semibold uppercase tracking-[1.6px] text-ink-muted" />
            </div>

            {/* ── A casa: statement em serifa leve ── */}
            {statement && (
              <section className="flex flex-col items-center px-[calc(var(--space-screen-x,24px)+8px)] pt-[30px] text-center" aria-label="Sobre a casa">
                <Ornamento />
                <p className="mt-[18px] font-body text-[11px] font-semibold uppercase tracking-[2.2px] text-accent">A casa</p>
                <p
                  className="mt-3 max-w-[38ch] font-display font-normal text-ink"
                  style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 'calc(32px * var(--type-factor, 1))' }}
                >
                  {statement}
                </p>
              </section>
            )}

            {todos.length === 0 ? (
              <VazioMesa nome={store.nome} />
            ) : (
              <>
                {/* ── Pratos da casa: trilho de fotos grandes ── */}
                {pratos.length > 0 && (
                  <section className="pt-[34px]" aria-labelledby="letreiro-pratos">
                    <Letreiro id="letreiro-pratos">Pratos da casa</Letreiro>
                    <ul className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-screen-x pb-1 list-none m-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {pratos.map((p, i) => (
                        <li key={p.id} className="w-[62%] shrink-0 snap-start">
                          <CardPrato produto={p} aoTocar={() => aoAbrirProduto(p)} prioridade={i < 2} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ── Cardápio-livro ── */}
                <section id={ID_CARDAPIO} className="scroll-mt-[calc(var(--inset-top,0px)+58px)] pt-9" aria-labelledby="letreiro-cardapio">
                  <Letreiro id="letreiro-cardapio">Cardápio</Letreiro>
                  <div className="flex flex-col gap-[30px] px-screen-x">
                    {secoesComItens.map((secao) => (
                      <SecaoDoCardapio key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* ── Fotos da casa ── */}
            {galeriaCasa.length > 0 && (
              <section className="pt-10" aria-label={`Fotos de ${store.nome}`}>
                <Letreiro>A mesa posta</Letreiro>
                <ul className="flex snap-x gap-[3px] overflow-x-auto list-none m-0 p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {galeriaCasa.map((foto, i) => (
                    <li key={`${foto}-${i}`} className="w-[82%] shrink-0 snap-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto} alt="" loading="lazy" decoding="async" draggable={false} className="block h-[260px] w-full object-cover" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <FechoMesa store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Seção do cardápio — título serifado centrado + itens com linha pontilhada
// ─────────────────────────────────────────────────────────────

function SecaoDoCardapio({ secao, aoAbrirProduto }: { secao: SecaoCatalogo; aoAbrirProduto: (p: ProdutoCatalogo) => void }) {
  return (
    <div id={idDaSecao(secao.chave)} className="scroll-mt-[calc(var(--inset-top,0px)+70px)]">
      <div className="mb-4 flex flex-col items-center">
        <h2
          className="text-center font-display font-semibold text-ink"
          style={{ fontSize: 'calc(24px * var(--type-factor, 1))', lineHeight: 1.2 }}
        >
          {secao.titulo}
        </h2>
        <Ornamento compacto className="mt-2.5" />
      </div>
      <ul className="flex flex-col gap-[18px] list-none m-0 p-0">
        {secao.produtos.map((p) => (
          <li key={p.id}>
            <ItemDoCardapio produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function VazioMesa({ nome }: { nome: string }) {
  return (
    <section id={ID_CARDAPIO} className="flex flex-col items-center px-screen-x pt-9 text-center scroll-mt-[calc(var(--inset-top,0px)+58px)]" aria-label="Cardápio">
      <Ornamento />
      <p
        className="mt-[18px] font-display font-semibold text-ink"
        style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.2 }}
      >
        A mesa ainda está sendo posta
      </p>
      <p className="mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
        {nome} ainda não colocou o cardápio na vitrine. Volte em breve.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — ornamento, nome em serifa, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoMesa({ store }: { store: VitrineWebProps['store'] }) {
  const agora = useRelogioDaLoja()
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const meta = [
    hoje ? `Hoje ${formatarHorario(hoje)}` : null,
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : store.taxa_entrega != null ? `Entrega ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)

  return (
    <footer className="mt-11 flex flex-col items-center px-screen-x pb-12 text-center">
      <Ornamento />
      <p
        className="mt-[18px] font-display font-semibold text-ink"
        style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.2 }}
      >
        {store.nome}
      </p>
      {meta.length > 0 && (
        <p className="mt-2 font-body text-[11.5px] font-semibold uppercase tracking-[1.4px] text-ink-muted" suppressHydrationWarning>
          {meta.join('   ·   ')}
        </p>
      )}
      <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[11.5px] font-semibold uppercase tracking-[1.4px] text-ink-muted" />
      {store.telefone && (
        <a href={`tel:${store.telefone}`} className="mt-4 font-body text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
          {store.telefone}
        </a>
      )}
      <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[12px] text-ink-muted">
        <a href="https://mallevo.com.br" className="transition-colors hover:text-ink">
          Uma loja do Mallevo
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="transition-colors hover:text-ink">
            Termos
          </a>
          <a href="/privacidade" className="transition-colors hover:text-ink">
            Privacidade
          </a>
        </span>
      </div>
    </footer>
  )
}
