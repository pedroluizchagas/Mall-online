'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatarHorario,
  horarioDeHoje,
  lerMetadataProduto,
  normalizeStoreConteudo,
  relogioDaLoja,
} from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import { Sacola, StatusAberto, idDaSecao } from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoSmash,
  BotaoPill,
  CARTAO,
  CHIP,
  CREME,
  ChipCategoria,
  CtaCartao,
  Dots,
  FIO_CREME,
  IconeTraco,
  MarqueeSmash,
  MolduraFoto,
  OURO,
  PillContorno,
  SeloEconomize,
  TINTA_APOIO,
  TINTA_RISCADA,
  WordmarkSmash,
  corpoQueCabe,
  prefereMenosMovimento,
  tokenComAlfa,
} from './smash-ui'

/**
 * Vitrine smash — layout PRÓPRIO do arquétipo `smash` para hamburguerias e
 * fast-food (docs/store-theme/02 §A4 e 05 "Vitrine smash"; referência: Stack
 * N Snack). Port web de apps/mobile-consumer/components/loja/LojaSmash.tsx.
 *
 * DNA destilado da referência:
 * - HERO bordô com pill de entrega, manchete de apetite em caps pesadíssimas
 *   e MOLDURAS COLORIDAS (laranja/rosa/céu) emoldurando fotos dos destaques;
 * - FOLHA CREME do cardápio: chips de categoria (ativa em OURO) e cards de
 *   item em PAGER de um cartão por vez com dots laranja;
 * - FAIXA MARQUEE dourada rolando as categorias da casa;
 * - bloco de OFERTAS laranja: banner com fotos espiando pelas bordas e cards
 *   de combo com selo "ECONOMIZE" em ouro e lista de itens em bullets;
 * - header em PÍLULA FLUTUANTE bordô que só aparece ao rolar sobre o creme.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — o slot
 * vira a logo da casa), a pílula de menu inferior (Início/Explorar/Pedidos/
 * Perfil é navegação do app), a virada da status bar e a transição de saída
 * radial. A sacola vive no header (sem FAB — regra das vitrines). O web
 * ganha, depois das ofertas, a LISTA COMPLETA do cardápio por seção com
 * âncoras — o pager mostra um item por vez e a página precisa de um índice
 * inteiro para quem quer bater o olho em tudo.
 *
 * Tipografia: a pele smash já traz Archivo 800 no display e Nunito no corpo
 * — a mesma voz da RN (`fontStyle(design.display, 800)`), então não há
 * fonte de DNA a carregar.
 */

const ID_CARDAPIO = 'cardapio'
const ID_OFERTAS = 'ofertas'
const ID_PAGER = 'cardapio-pager'

/** Manchete fixa da RN — fallback quando a casa não escreveu campanha. */
const MANCHETE_PADRAO = ['DEU FOME?', 'PEDE. CHEGOU.']

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * Foto do PALCO do cartão: o `recorte` (PNG de fundo transparente) quando o
 * lojista subiu um → produto "solto" em `contain` sobre o branco, o cutout
 * da referência; foto comum cobre o quadro sobre o creme.
 */
function fotoPalco(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/** `tempo_entrega` são minutos (número) na view pública. */
function tempoEntrega(store: VitrineWebProps['store']): string | null {
  return store.tempo_entrega != null ? `${store.tempo_entrega} min` : null
}

/**
 * Manchete em até duas linhas: a campanha do lojista (partida por palavras em
 * duas linhas equilibradas quando é longa) ou o par fixo da RN.
 */
function linhasDaManchete(titulo: string | undefined): string[] {
  const texto = titulo?.trim().toUpperCase()
  if (!texto) return MANCHETE_PADRAO
  if (texto.length <= 16) return [texto]
  const palavras = texto.split(/\s+/)
  if (palavras.length < 2) return [texto]
  let melhor = 1
  let menorDiferenca = Infinity
  for (let i = 1; i < palavras.length; i++) {
    const a = palavras.slice(0, i).join(' ').length
    const b = palavras.slice(i).join(' ').length
    const d = Math.abs(a - b)
    if (d < menorDiferenca) {
      menorDiferenca = d
      melhor = i
    }
  }
  return [palavras.slice(0, melhor).join(' '), palavras.slice(melhor).join(' ')]
}

/**
 * Pager de um cartão por vez: trilho com scroll-snap e o índice da página
 * sincronizado pelo scroll (o `pagingEnabled` + `onMomentumScrollEnd` da RN).
 */
function usePager() {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const [pagina, setPagina] = useState(0)

  const aoRolar = useCallback(() => {
    const el = trilhoRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((atual) => (atual === i ? atual : i))
  }, [])

  const irPara = useCallback((i: number, animado = true) => {
    const el = trilhoRef.current
    if (!el) return
    const alvo = Math.max(0, Math.min(i, el.children.length - 1))
    el.scrollTo({ left: alvo * el.clientWidth, behavior: animado && !prefereMenosMovimento() ? 'smooth' : 'auto' })
    setPagina(alvo)
  }, [])

  return { trilhoRef, pagina, aoRolar, irPara }
}

export function VitrineSmash({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const vazio = secoesComItens.length === 0

  // Fotos dos destaques pras molduras coloridas do hero: os que o lojista
  // escolheu (`conteudo.destaques`) na frente, o resto completando até 6.
  const destaques = useMemo(() => {
    const todos = secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url)
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p)
    const resto = todos.filter((p) => !escolhidos.includes(p))
    return [...escolhidos, ...resto].slice(0, 6)
  }, [secoes, conteudo.destaques])

  // Ofertas da casa (itens em promoção, qualquer seção).
  const ofertas = useMemo(() => secoes.flatMap((s) => s.produtos).filter(temPromo), [secoes])
  const maxDesconto = useMemo(
    () =>
      ofertas.length > 0
        ? Math.round(Math.max(...ofertas.map((p) => 1 - (p.preco_promocional ?? p.preco) / p.preco)) * 100)
        : 0,
    [ofertas],
  )

  // Pílula do header: invisível sobre o hero bordô, flutua quando o creme
  // passa por baixo dela (o interpolate 300→380 da RN vira um observer no
  // pé do hero + transição de opacidade).
  const heroRef = useRef<HTMLElement>(null)
  const [pilulaVisivel, setPilulaVisivel] = useState(false)
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entrada]) => setPilulaVisivel(!entrada.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
      threshold: 0,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const rolarPara = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  const tempo = tempoEntrega(store)
  const entrega =
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoSmash — folha creme, palco branco de
        // galeria, CTA bordô que pisca OURO "NA SACOLA ✓") no lugar do
        // ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Header: pílula flutuante bordô (invisível sobre o hero) ──
                `h-0` sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-0 z-30 h-0">
              <div className="relative mx-[14px] mt-[6px] flex h-[52px] items-center px-2">
                <div
                  className="pointer-events-none absolute inset-0 rounded-full border border-line bg-canvas shadow-floating transition-opacity duration-200"
                  style={{ opacity: pilulaVisivel ? 1 : 0 }}
                  aria-hidden
                />
                <AcaoSmash href="/" rotulo={`${store.nome} — início da loja`}>
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt="" className="h-7 w-7 rounded-[9px] object-cover" />
                  ) : (
                    <IconeTraco nome="spark" />
                  )}
                </AcaoSmash>
                <div className="relative flex min-w-0 flex-1 items-center justify-center px-2">
                  <WordmarkSmash nome={store.nome} tamanho={17} />
                </div>
                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <AcaoSmash
                      icone="bag"
                      contador={totalItens}
                      rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                      aoTocar={abrirSacola}
                    />
                  )}
                </Sacola>
              </div>
            </div>

            {/* ── Hero bordô: pill de entrega + manchete + molduras ── */}
            <header ref={heroRef} className="pb-[34px] pt-[84px]">
              <div className="flex justify-center px-screen-x">
                <PillContorno icone="spark" className="py-2 text-[12.5px]">
                  {tempo ? `Entrega em até ${tempo}` : 'Peça e receba rapidinho'}
                </PillContorno>
              </div>

              {campanha?.eyebrow && (
                <p className="mt-5 px-screen-x text-center font-body text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  {campanha.eyebrow}
                </p>
              )}

              {/* Manchete de apetite: uma linha por vez, sem quebrar — encolhe
                  só quando a contagem de caracteres não cabe na coluna. */}
              <h1
                className={`${campanha?.eyebrow ? 'mt-3' : 'mt-6'} flex flex-col items-center px-screen-x font-display font-extrabold tracking-[0.5px] text-ink`}
              >
                {linhasDaManchete(campanha?.titulo).map((linha, i) => (
                  <span
                    key={i}
                    className="block max-w-full whitespace-nowrap text-center leading-[1.14]"
                    style={{ fontSize: corpoQueCabe(linha, 44) }}
                  >
                    {linha}
                  </span>
                ))}
              </h1>

              <div className="mt-6 flex flex-wrap justify-center gap-[10px] px-screen-x">
                <BotaoPill
                  solido
                  href={`#${ID_CARDAPIO}`}
                  aoTocar={(e) => {
                    e.preventDefault()
                    rolarPara(ID_CARDAPIO)
                  }}
                >
                  {campanha?.cta ?? 'Pedir agora'}
                  <IconeTraco nome="arrow" tamanho={14} espessura={2.4} />
                </BotaoPill>
                {ofertas.length > 0 && (
                  <BotaoPill
                    href={`#${ID_OFERTAS}`}
                    aoTocar={(e) => {
                      e.preventDefault()
                      rolarPara(ID_OFERTAS)
                    }}
                  >
                    Ver ofertas
                  </BotaoPill>
                )}
              </div>

              {/* Molduras coloridas — fotos dos destaques com peek */}
              {destaques.length > 0 && (
                <div
                  className="mt-[30px] flex snap-x gap-[14px] overflow-x-auto overscroll-x-contain px-screen-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Destaques da casa"
                >
                  {destaques.map((p, i) => (
                    <MolduraFoto
                      key={p.id}
                      src={p.foto_url as string}
                      indice={i}
                      rotulo={p.nome}
                      aoTocar={() => aoAbrirProduto(p)}
                      className="w-[58%] aspect-[100/128]"
                    />
                  ))}
                </div>
              )}

              {(campanha?.subtitulo || store.descricao) && (
                <p
                  className="mx-auto mt-6 max-w-[40ch] px-[32px] text-center font-body text-[14.5px] font-medium leading-[21px] text-ink-muted"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {campanha?.subtitulo ?? store.descricao}
                </p>
              )}

              <MetaSmash tempo={tempo} entrega={entrega} horarios={store.horarios} className="mt-2" />
            </header>

            {/* ── Folha creme: cardápio com chips + pager de cartões ── */}
            <section
              id={ID_CARDAPIO}
              className="scroll-mt-16 rounded-t-[32px] pb-9 pt-[30px]"
              style={{ backgroundColor: CREME }}
              aria-label="Cardápio"
            >
              {vazio ? <VazioSmash /> : <CardapioSmash secoes={secoesComItens} aoAbrirProduto={aoAbrirProduto} />}
            </section>

            {/* ── Faixa marquee dourada com as categorias da casa ── */}
            {secoesComItens.length > 0 && <MarqueeSmash palavras={secoesComItens.map((s) => s.titulo)} />}

            {/* ── Ofertas: banner laranja + cards de combo ── */}
            {ofertas.length > 0 && (
              <section id={ID_OFERTAS} className="scroll-mt-16" aria-label="Ofertas">
                <BannerOfertas
                  fotos={ofertas.filter((p) => p.foto_url).slice(0, 4).map((p) => p.foto_url as string)}
                  maxDesconto={maxDesconto}
                />
                <div className="pb-9 pt-[30px]" style={{ backgroundColor: CREME }}>
                  <OfertasSmash ofertas={ofertas} aoAbrirProduto={aoAbrirProduto} />
                </div>
              </section>
            )}

            {/* ── Lista completa do cardápio, por seção, com âncoras ── */}
            {!vazio && <ListaCardapio secoes={secoesComItens} aoAbrirProduto={aoAbrirProduto} />}

            {/* ── Fecho bordô: wordmark + meta ── */}
            <FechoSmash store={store} tempo={tempo} entrega={entrega} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Meta — "35 min · Entrega grátis · Aberto até 23:00"
// ─────────────────────────────────────────────────────────────

/**
 * A linha de meta da RN, com o relógio vivo no lugar do "Aberto" fixo (regra
 * da convergência: não inventar "Aberto" — loja sem horários não mostra nada).
 */
function MetaSmash({
  tempo,
  entrega,
  horarios,
  className,
}: {
  tempo: string | null
  entrega: string | null
  horarios: unknown
  className?: string
}) {
  const partes = [tempo, entrega].filter((m): m is string => !!m)
  return (
    <p
      className={`flex flex-wrap items-center justify-center gap-x-2 px-screen-x text-center font-body text-[12.5px] font-medium text-ink-muted ${className ?? ''}`}
    >
      {partes.map((parte, i) => (
        <span key={parte} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>·</span>}
          {parte}
        </span>
      ))}
      <StatusAberto
        horarios={horarios}
        className={`text-[12.5px] font-medium text-ink-muted ${partes.length > 0 ? "before:mr-0.5 before:content-['·']" : ''}`}
      />
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — chips de categoria + pager de um cartão com dots
// ─────────────────────────────────────────────────────────────

function CardapioSmash({
  secoes,
  aoAbrirProduto,
}: {
  secoes: SecaoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const [secaoAtiva, setSecaoAtiva] = useState(0)
  const { trilhoRef, pagina, aoRolar, irPara } = usePager()

  const secao = secoes[Math.min(secaoAtiva, Math.max(secoes.length - 1, 0))]

  function trocarSecao(i: number) {
    setSecaoAtiva(i)
    irPara(0, false)
  }

  if (!secao) return null

  return (
    <div>
      <div className="flex justify-center">
        <PillContorno>Cardápio</PillContorno>
      </div>
      <h2
        className="mt-[14px] px-screen-x text-center font-display font-extrabold uppercase tracking-[0.6px] text-canvas"
        style={{ fontSize: 'calc(30px * var(--type-factor, 1))', lineHeight: 1.15 }}
      >
        Fome de quê?
      </h2>
      <p
        className="mx-auto mt-2 max-w-[36ch] px-9 text-center font-body text-[14px] font-medium leading-5"
        style={{ color: TINTA_APOIO }}
      >
        Cada mordida conta. Escolha a categoria e monte o pedido.
      </p>

      {/* Chips de categoria — ativa em ouro */}
      <div className="mt-[18px] flex flex-wrap justify-center gap-2 px-screen-x" role="tablist" aria-label="Categorias">
        {secoes.map((s, i) => (
          <ChipCategoria key={s.chave} ativo={i === secaoAtiva} aoTocar={() => trocarSecao(i)} controla={ID_PAGER}>
            {s.titulo}
          </ChipCategoria>
        ))}
      </div>

      {/* Pager: um cartão por vez, como na referência */}
      <div
        id={ID_PAGER}
        ref={trilhoRef}
        onScroll={aoRolar}
        role="tabpanel"
        aria-label={secao.titulo}
        className="mt-[22px] flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {secao.produtos.map((p) => (
          <div key={p.id} className="w-full shrink-0 snap-center px-screen-x">
            <CardSmash produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </div>
        ))}
      </div>

      {secao.produtos.length > 1 && <Dots total={secao.produtos.length} ativo={pagina} irPara={irPara} />}
    </div>
  )
}

/** Cartão branco do item: palco de foto, nome em caps, preço laranja, CTA bordô. */
function CardSmash({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const foto = fotoPalco(produto)
  const promo = temPromo(produto)

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="flex w-full flex-col rounded-[30px] border p-4 text-left transition-opacity active:opacity-90"
      style={{ backgroundColor: CARTAO, borderColor: FIO_CREME }}
    >
      <span
        className="flex aspect-[100/76] w-full items-center justify-center overflow-hidden rounded-[22px]"
        style={{ backgroundColor: foto?.recorte ? CARTAO : CREME }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto.src}
            alt=""
            className={`h-full w-full ${foto.recorte ? 'object-contain' : 'object-cover'}`}
            loading="lazy"
          />
        ) : (
          <IconeTraco nome="chef" tamanho={54} cor={FIO_CREME} espessura={1.6} />
        )}
      </span>

      <span
        className="mt-4 block w-full truncate font-display text-[19px] font-extrabold uppercase tracking-[0.4px] text-canvas"
      >
        {produto.nome}
      </span>
      {produto.descricao && (
        <span
          className="mt-[6px] block font-body text-[14px] font-medium leading-5"
          style={{
            color: TINTA_APOIO,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {produto.descricao}
        </span>
      )}

      <span className="mt-[10px] flex items-end gap-2">
        <span className="font-display text-[26px] font-extrabold leading-none text-accent">
          {formatarReais(precoFinalDe(produto))}
        </span>
        {promo && (
          <span className="mb-[3px] font-body text-[14px] font-semibold leading-none line-through" style={{ color: TINTA_RISCADA }}>
            {formatarReais(produto.preco)}
          </span>
        )}
      </span>

      <CtaCartao>Pedir agora</CtaCartao>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Ofertas — banner laranja + pager de cards de combo
// ─────────────────────────────────────────────────────────────

/** Posições das fotos que espiam pelas bordas do banner, como na referência. */
const ESPIADAS = [
  { top: -18, left: -16, rotate: -8 },
  { top: -22, right: -14, rotate: 7 },
  { bottom: -20, left: 22, rotate: 6 },
  { bottom: -16, right: 30, rotate: -7 },
] as const

/** Banner "CHUVA DE OFERTAS" com fotos espiando pelas bordas, como na ref. */
function BannerOfertas({ fotos, maxDesconto }: { fotos: string[]; maxDesconto: number }) {
  const titulo = 'CHUVA DE OFERTAS'
  return (
    <div className="relative overflow-hidden bg-accent py-[52px] text-accent-ink">
      {fotos.map((src, i) => {
        const { rotate, ...pos } = ESPIADAS[i % ESPIADAS.length]
        return (
          <span
            key={`${src}-${i}`}
            className="pointer-events-none absolute h-[92px] w-[92px] overflow-hidden rounded-[20px] border-4"
            style={{ ...pos, borderColor: CREME, transform: `rotate(${rotate}deg)` }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          </span>
        )
      })}

      <h2
        className="relative mx-[84px] whitespace-nowrap text-center font-display font-extrabold tracking-[0.6px]"
        style={{ fontSize: corpoQueCabe(titulo, 32, 84), lineHeight: 1.15 }}
      >
        {titulo}
      </h2>
      <p className="relative mx-16 mt-2 text-center font-body text-[14px] font-semibold" style={{ opacity: 0.82 }}>
        {maxDesconto > 0 ? `Economize até ${maxDesconto}% nos combos da casa` : 'Os combos da casa com preço de amigo'}
      </p>
    </div>
  )
}

function OfertasSmash({
  ofertas,
  aoAbrirProduto,
}: {
  ofertas: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const { trilhoRef, pagina, aoRolar, irPara } = usePager()

  return (
    <div>
      <div className="flex justify-center">
        <PillContorno>Ofertas</PillContorno>
      </div>
      <h2
        className="mt-[14px] px-screen-x text-center font-display font-extrabold uppercase tracking-[0.5px] text-canvas"
        style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15 }}
      >
        Combos que fazem sentido
      </h2>
      <p
        className="mx-auto mt-2 max-w-[36ch] px-9 text-center font-body text-[14px] font-medium leading-5"
        style={{ color: TINTA_APOIO }}
      >
        Empilhe os favoritos e economize de verdade — ofertas que valem a fome.
      </p>

      <div
        ref={trilhoRef}
        onScroll={aoRolar}
        className="mt-[22px] flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ofertas.map((p) => (
          <div key={p.id} className="w-full shrink-0 snap-center px-screen-x">
            <CardOferta produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </div>
        ))}
      </div>

      {ofertas.length > 1 && <Dots total={ofertas.length} ativo={pagina} irPara={irPara} />}
    </div>
  )
}

/** Card laranja do combo: selo ECONOMIZE em ouro, itens em bullets, CTA bordô. */
function CardOferta({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const economia = produto.preco - (produto.preco_promocional ?? produto.preco)
  // Combos descritos como "item + item + item" viram a lista em bullets da
  // referência; descrição corrida fica como parágrafo.
  const partes = (produto.descricao ?? '')
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)
  const ehLista = partes.length > 1

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="flex w-full flex-col rounded-[30px] bg-accent p-4 text-left text-accent-ink transition-opacity active:opacity-90"
    >
      {produto.foto_url && (
        <span
          className="block aspect-[100/62] w-full overflow-hidden rounded-[22px]"
          style={{ backgroundColor: tokenComAlfa('--accent-ink', 0.14, '#470A10') }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={produto.foto_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </span>
      )}

      {economia > 0 && (
        <span className="mt-[14px] flex">
          <SeloEconomize>Economize {formatarReais(economia)}</SeloEconomize>
        </span>
      )}

      <span className="mt-[10px] block w-full truncate font-display text-[20px] font-extrabold uppercase tracking-[0.4px]">
        {produto.nome}
      </span>

      {ehLista ? (
        <span className="mt-2 flex flex-col gap-1" style={{ opacity: 0.85 }}>
          {partes.map((parte, i) => (
            <span key={`${parte}-${i}`} className="block truncate font-body text-[14px] font-semibold leading-5">
              •&nbsp;&nbsp;{parte}
            </span>
          ))}
        </span>
      ) : produto.descricao ? (
        <span
          className="mt-2 block font-body text-[14px] font-semibold leading-5"
          style={{
            opacity: 0.85,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {produto.descricao}
        </span>
      ) : null}

      <span className="mt-3 flex items-end gap-[10px]">
        <span className="font-display text-[30px] font-extrabold leading-none">{formatarReais(precoFinalDe(produto))}</span>
        {temPromo(produto) && (
          <span className="mb-1 font-body text-[15px] font-semibold leading-none line-through" style={{ opacity: 0.55 }}>
            {formatarReais(produto.preco)}
          </span>
        )}
      </span>

      <CtaCartao>Pegar oferta</CtaCartao>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Lista completa — o cardápio inteiro por seção, com âncoras (só no web)
// ─────────────────────────────────────────────────────────────

function ListaCardapio({
  secoes,
  aoAbrirProduto,
}: {
  secoes: SecaoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <section
      className="pb-10 pt-[30px]"
      style={{ backgroundColor: CREME, borderTop: `1px solid ${FIO_CREME}` }}
      aria-label="Cardápio completo"
    >
      <div className="flex justify-center">
        <PillContorno>Cardápio completo</PillContorno>
      </div>
      <h2
        className="mt-[14px] px-screen-x text-center font-display font-extrabold uppercase tracking-[0.5px] text-canvas"
        style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15 }}
      >
        Tudo da casa
      </h2>

      {/* Âncoras: as seções em chips, na mesma voz dos chips do pager. */}
      <nav className="mt-4 flex flex-wrap justify-center gap-2 px-screen-x" aria-label="Ir para a seção">
        {secoes.map((s) => (
          <a
            key={s.chave}
            href={`#${idDaSecao(s.chave)}`}
            className="rounded-full px-4 py-[9px] font-display text-[12px] font-extrabold uppercase tracking-[0.6px] text-canvas transition-opacity hover:opacity-80"
            style={{ backgroundColor: CHIP }}
          >
            {s.titulo}
          </a>
        ))}
      </nav>

      <div className="mt-6 px-screen-x">
        {secoes.map((secao) => (
          <div key={secao.chave} id={idDaSecao(secao.chave)} className="mb-7 scroll-mt-16">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-[18px] font-extrabold uppercase tracking-[0.5px] text-canvas">
                {secao.titulo}
              </h3>
              <span className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: OURO }} aria-hidden />
            </div>

            <ul className="m-0 mt-1 list-none p-0">
              {secao.produtos.map((p) => {
                const promo = temPromo(p)
                return (
                  <li key={p.id} style={{ borderBottom: `1px solid ${FIO_CREME}` }}>
                    <button
                      type="button"
                      onClick={() => aoAbrirProduto(p)}
                      className="flex w-full items-center gap-[14px] py-[14px] text-left transition-opacity hover:opacity-80 active:opacity-70"
                    >
                      <span
                        className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[16px]"
                        style={{ backgroundColor: CARTAO, border: `1px solid ${FIO_CREME}` }}
                      >
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.foto_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <IconeTraco nome="chef" tamanho={24} cor={FIO_CREME} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-extrabold uppercase tracking-[0.3px] text-canvas">
                          {p.nome}
                        </span>
                        {p.descricao && (
                          <span className="mt-[3px] block truncate font-body text-[13px] font-medium" style={{ color: TINTA_APOIO }}>
                            {p.descricao}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="font-display text-[16px] font-extrabold text-accent">{formatarReais(precoFinalDe(p))}</span>
                        {promo && (
                          <span className="font-body text-[12px] font-semibold line-through" style={{ color: TINTA_RISCADA }}>
                            {formatarReais(p.preco)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioSmash() {
  return (
    <div className="flex flex-col items-center px-screen-x py-4 text-center">
      <PillContorno>Cardápio</PillContorno>
      <span
        className="mt-6 flex h-[64px] w-[64px] items-center justify-center rounded-[22px]"
        style={{ backgroundColor: CARTAO, border: `1px solid ${FIO_CREME}` }}
      >
        <IconeTraco nome="chef" tamanho={32} cor={OURO} />
      </span>
      <p
        className="mt-5 font-display font-extrabold uppercase tracking-[0.5px] text-canvas"
        style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15 }}
      >
        A chapa ainda está esquentando
      </p>
      <p className="mt-3 max-w-[34ch] font-body text-[15px] font-medium leading-[23px]" style={{ color: TINTA_APOIO }}>
        Esta casa ainda não colocou o cardápio na vitrine. Volte em breve — a fome pode esperar um pouquinho.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — bordô com wordmark, meta e relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoSmash({
  store,
  tempo,
  entrega,
}: {
  store: VitrineWebProps['store']
  tempo: string | null
  entrega: string | null
}) {
  // Hora de parede da LOJA. Nasce vazia para o servidor (UTC) e o cliente
  // não divergirem na hidratação.
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 60_000)
    return () => clearInterval(id)
  }, [])
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())

  return (
    <footer className="flex flex-col items-center gap-[10px] bg-canvas px-screen-x pb-10 pt-11 text-center text-ink">
      <WordmarkSmash nome={store.nome} tamanho={24} />

      <MetaSmash tempo={tempo} entrega={entrega} horarios={store.horarios} />

      {hoje && (
        <p className="font-body text-[12px] font-medium text-ink-muted" suppressHydrationWarning>
          Hoje {formatarHorario(hoje)}
        </p>
      )}

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="font-body text-[13px] font-semibold text-ink-muted underline-offset-2 hover:underline"
        >
          {store.telefone}
        </a>
      )}

      <div
        className="mt-6 flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[11px] text-ink-muted"
      >
        <a href="https://mallevo.com.br" className="font-bold transition-colors hover:text-ink">
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
