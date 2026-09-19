'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import { Sacola, StatusAberto, idDaSecao } from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  CURVA,
  CardSereno,
  CtaFantasma,
  DWELL_MS,
  GLIDE_MS,
  LinhasSegmentadas,
  MarcaDaCasa,
  VEU_HERO,
  descontoPct,
  precoFinalDe,
  prefereMenosMovimento,
} from './serena-ui'

/**
 * Vitrine serena — layout PRÓPRIO do arquétipo `serene` para beleza feminina,
 * skincare e joias delicadas (docs/store-theme/02 §D2 e 05 "Vitrine serena";
 * referência: All Natural). Port web de
 * apps/mobile-consumer/components/loja/LojaSerena.tsx.
 *
 * DNA destilado da referência:
 * - header CLARO estruturado (não overlay): casa | nome centrado | "Sacola (N)"
 *   em TEXTO — a assinatura da referência;
 * - hero com carrossel no ritmo mais calmo do sistema (glide de 650ms, 6s por
 *   cena) e indicadores de LINHA segmentada no TOPO;
 * - headline em peso LEVE (400) e sentence case — a delicadeza vem do peso;
 * - CTA fantasma (contorno fino, fundo transparente);
 * - seções viram ABAS ("Trending | Bestsellers"), grid 2-col com cards no
 *   cinza-névoa, chip de promo branco com texto vermelho; nome + preço FORA
 *   do card, na mesma linha;
 * - fecho com tile grande da marca (foto + convite).
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a casa
 * ocupa o lugar), a barra de menu inferior (navegação do app), o coração de
 * favorito (o web não tem favoritos), a status bar e a transição radial de
 * saída. A sacola vive no header (sem FAB — regra das vitrines).
 */

/** Âncora do bloco de abas + grade: o CTA da campanha desce até aqui. */
const ID_COLECAO = 'colecao'
/** Altura do header estruturado — as âncoras param abaixo dele. */
const ALTURA_HEADER = 56
/** A RN mostra 4 peças por aba e abre o resto no "Ver tudo". */
const PECAS_FECHADAS = 4

interface SlideSereno {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

export function VitrineSerena({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])
  const vazio = todos.length === 0

  // Cenas do hero: a campanha da casa e até três peças com foto — os
  // `destaques` escolhidos pelo lojista na frente; sem eles, a primeira seção
  // (a derivação da RN).
  const slides = useMemo<SlideSereno[]>(() => {
    const maxDesc = Math.max(0, ...todos.map(descontoPct))
    const abertura: SlideSereno = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? (maxDesc > 0 ? `Até ${maxDesc}% off em selecionados` : 'Cuidado & ritual'),
      titulo: campanha?.titulo ?? 'Descubra a nova coleção',
      legenda: campanha?.subtitulo ?? null,
      cta: campanha?.cta ?? 'Comprar agora',
      produto: null,
    }

    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const primeira = secoesComItens[0]
    const fonte = escolhidos.length > 0 ? escolhidos : (primeira?.produtos ?? []).filter((p) => p.foto_url)
    const eyebrowPeca = escolhidos.length > 0 ? 'Em destaque' : primeira?.titulo ?? ''

    const destaque = fonte.slice(0, 3).map(
      (p): SlideSereno => ({
        imagem: p.foto_url,
        eyebrow: eyebrowPeca,
        titulo: p.nome,
        legenda: formatarReais(precoFinalDe(p)),
        cta: 'Ver produto',
        produto: p,
      }),
    )
    return [abertura, ...destaque]
  }, [store.banner_url, campanha, conteudo.destaques, todos, secoesComItens])

  // Foto do fecho: a galeria da casa na frente; sem ela, o banner. O texto é
  // o manifesto do lojista (a RN não tinha texto no tile).
  const fotoCasa = conteudo.galeria_casa?.[0] ?? store.banner_url ?? null
  const textoCasa = conteudo.manifesto ?? null

  // O hero em cena dirige o autoplay: só roda com o hero à vista (o limiar
  // de `scrollY` da RN num observer).
  const heroRef = useRef<HTMLElement>(null)
  const [heroEmCena, setHeroEmCena] = useState(true)
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entrada]) => setHeroEmCena(entrada.isIntersecting && entrada.intersectionRatio >= 0.3),
      { threshold: [0, 0.3, 0.31] },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const rolarParaColecao = useCallback(() => {
    document.getElementById(ID_COLECAO)?.scrollIntoView({
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
        // TODO(2b): PDP própria (ProdutoSereno — cartão branco sólido e CTA
        // fantasma de largura cheia que se preenche ao confirmar) no lugar do
        // ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Header claro estruturado — a assinatura da referência.
                Ocupa altura de verdade (não é overlay) e gruda no topo. ── */}
            <header
              className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-[calc(var(--space-screen-x,24px)-8px)]"
              style={{ height: ALTURA_HEADER }}
            >
              <MarcaDaCasa nome={store.nome} logoUrl={store.logo_url} />

              <a
                href="/"
                className="min-w-0 flex-1 truncate px-2 text-center font-display text-[17px] font-medium tracking-[0.2px] text-ink"
              >
                {store.nome}
              </a>

              <Sacola>
                {({ abrir: abrirSacola, totalItens }) => (
                  <button
                    type="button"
                    onClick={abrirSacola}
                    aria-label={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                    className={`flex h-10 min-w-[40px] shrink-0 items-center justify-end font-body text-[14px] font-medium transition-opacity hover:opacity-70 active:opacity-60 ${
                      totalItens > 0 ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    Sacola ({totalItens})
                  </button>
                )}
              </Sacola>
            </header>

            {/* ── Hero calmo com indicadores de linha no topo ── */}
            <HeroSereno
              ref={heroRef}
              slides={slides}
              emCena={heroEmCena}
              aoAbrirProduto={aoAbrirProduto}
              aoComprar={rolarParaColecao}
            />

            {/* ── Identidade breve ── */}
            {store.descricao && (
              <p className="line-clamp-2 px-screen-x pt-5 font-body text-[14px] leading-[21px] text-ink-muted">
                {store.descricao}
              </p>
            )}

            {vazio ? (
              <VazioSereno store={store} />
            ) : (
              <ColecaoSerena secoes={secoesComItens} aoAbrirProduto={aoAbrirProduto} />
            )}

            {/* ── Fecho: tile da marca ── */}
            {fotoCasa && <TileDaMarca nome={store.nome} foto={fotoCasa} texto={textoCasa} />}

            <FechoSereno store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — o glide de 650ms entre a campanha e as peças
// ─────────────────────────────────────────────────────────────

/** Deslocamento mínimo do dedo para virar cena. */
const LIMIAR_SWIPE = 40

const HeroSereno = forwardRef<
  HTMLElement,
  {
    slides: SlideSereno[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoComprar: () => void
  }
>(function HeroSereno({ slides, emCena, aoAbrirProduto, aoComprar }, ref) {
  const n = slides.length
  // `pos` percorre 0..n: a posição n é a CÓPIA da primeira cena no fim do
  // trilho (o truque da RN para o loop parecer contínuo) — chegando nela, o
  // trilho salta sem glide para 0.
  const [pos, setPos] = useState(0)
  const [semGlide, setSemGlide] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [reduzir, setReduzir] = useState(false)
  const toqueX = useRef<number | null>(null)

  // "Reduzir movimento" congela o carrossel — como o AccessibilityInfo da RN.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzir(mq.matches)
    const aoMudar = (e: MediaQueryListEvent) => setReduzir(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    const aoVisibilidade = () => setPausado(document.hidden)
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  // Dwell de 6s — ritmo de contemplação. Só com o hero à vista, a aba
  // visível e sem o visitante pousado sobre ele.
  useEffect(() => {
    if (n <= 1 || pausado || !emCena || reduzir || pos >= n) return
    const t = setTimeout(() => setPos((p) => Math.min(p + 1, n)), DWELL_MS)
    return () => clearTimeout(t)
  }, [pos, pausado, emCena, reduzir, n])

  // Na cópia da primeira cena: espera o glide terminar e salta para 0 sem
  // transição; no quadro seguinte o glide volta a valer.
  useEffect(() => {
    if (pos < n || n <= 1) return
    const t = setTimeout(
      () => {
        setSemGlide(true)
        setPos(0)
      },
      reduzir ? 0 : GLIDE_MS + 30,
    )
    return () => clearTimeout(t)
  }, [pos, n, reduzir])

  useEffect(() => {
    if (!semGlide) return
    const id = requestAnimationFrame(() => setSemGlide(false))
    return () => cancelAnimationFrame(id)
  }, [semGlide])

  // A lista de cenas pode encolher (dados novos): nunca aponta pra fora dela.
  const indice = n > 0 ? Math.min(pos, n) % n : 0
  const slidesRender = n > 1 ? [...slides, slides[0]] : slides

  const aoPointerDown = (e: PointerEvent<HTMLElement>) => {
    toqueX.current = e.clientX
  }
  const aoPointerUp = (e: PointerEvent<HTMLElement>) => {
    const inicio = toqueX.current
    toqueX.current = null
    if (inicio === null || n <= 1) return
    const dx = e.clientX - inicio
    if (Math.abs(dx) < LIMIAR_SWIPE) return
    setPos((p) => {
      if (p >= n) return p
      return dx < 0 ? p + 1 : Math.max(0, p - 1)
    })
  }

  return (
    <section
      ref={ref}
      className="relative h-[46svh] max-h-[520px] min-h-[340px] select-none overflow-hidden bg-canvasAlt"
      style={{ touchAction: 'pan-y' }}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onPointerDown={aoPointerDown}
      onPointerUp={aoPointerUp}
      onPointerCancel={() => (toqueX.current = null)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da casa"
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${pos * 100}%)`,
          transition: semGlide || reduzir ? 'none' : `transform ${GLIDE_MS}ms ${CURVA}`,
        }}
      >
        {slidesRender.map((slide, i) => {
          const emFoco = i === pos
          // O parallax de 10% da RN: a foto (120% de largura) desloca no
          // sentido contrário ao trilho, presa a ±10%.
          const deslocamento = Math.max(-1, Math.min(1, pos - i)) * 10
          return (
            <div key={i} className="relative h-full w-full shrink-0 overflow-hidden" aria-hidden={!emFoco}>
              {slide.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.imagem}
                  alt=""
                  loading="eager"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  decoding="async"
                  draggable={false}
                  className="absolute top-0 h-full w-[120%] max-w-none object-cover"
                  style={{
                    left: '-10%',
                    transform: reduzir ? undefined : `translateX(${deslocamento}%)`,
                    transition: semGlide || reduzir ? 'none' : `transform ${GLIDE_MS}ms ${CURVA}`,
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <div
                className="absolute inset-x-0 bottom-[22px] flex flex-col items-start gap-[10px] px-screen-x"
                style={{
                  opacity: emFoco ? 1 : 0,
                  // `visibility` tira a cena fora de foco do Tab; ela só some
                  // depois que a opacidade terminou de descer.
                  visibility: emFoco ? 'visible' : 'hidden',
                  transition:
                    semGlide || reduzir
                      ? 'none'
                      : `opacity ${GLIDE_MS}ms ${CURVA}, visibility 0s linear ${emFoco ? 0 : GLIDE_MS}ms`,
                  pointerEvents: emFoco ? 'auto' : 'none',
                }}
              >
                <p
                  className="font-body text-[11px] font-medium uppercase tracking-[2px]"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {slide.eyebrow}
                </p>
                {/* Peso LEVE e sentence case — a assinatura delicada do arquétipo. */}
                {i === 0 ? (
                  <h1
                    className="line-clamp-2 w-full font-display font-normal tracking-[0.1px] text-white"
                    style={{
                      fontSize: 'calc(30px * var(--type-factor, 1))',
                      lineHeight: 'calc(38px * var(--type-factor, 1))',
                    }}
                  >
                    {slide.titulo}
                  </h1>
                ) : (
                  <p
                    className="line-clamp-2 w-full font-display font-normal tracking-[0.1px] text-white"
                    style={{
                      fontSize: 'calc(30px * var(--type-factor, 1))',
                      lineHeight: 'calc(38px * var(--type-factor, 1))',
                    }}
                  >
                    {slide.titulo}
                  </p>
                )}
                {slide.legenda && (
                  <p className="line-clamp-2 font-body text-[14px]" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {slide.legenda}
                  </p>
                )}
                <CtaFantasma
                  className="mt-[2px]"
                  aoTocar={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoComprar())}
                >
                  {slide.cta}
                </CtaFantasma>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicadores de linha segmentada — no TOPO, como na referência */}
      {n > 1 && (
        <div className="absolute inset-x-0 top-[6px] z-[2]">
          <LinhasSegmentadas
            total={n}
            ativo={indice}
            rotulos={slides.map((s) => s.titulo)}
            irPara={(i) => setPos(i)}
          />
        </div>
      )}
    </section>
  )
})

// ─────────────────────────────────────────────────────────────
// Coleção — abas de seções + grade da aba ativa
// ─────────────────────────────────────────────────────────────

function ColecaoSerena({
  secoes,
  aoAbrirProduto,
}: {
  secoes: SecaoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [expandida, setExpandida] = useState(false)

  // Deep-link `#secao-<chave>`: a aba certa já acesa ao chegar.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const i = secoes.findIndex((s) => idDaSecao(s.chave) === hash)
    if (i >= 0) setAbaAtiva(i)
  }, [secoes])

  const indice = Math.min(abaAtiva, secoes.length - 1)
  const secaoAtiva = secoes[indice]
  if (!secaoAtiva) return null

  const produtosVisiveis = expandida ? secaoAtiva.produtos : secaoAtiva.produtos.slice(0, PECAS_FECHADAS)
  const idGrade = idDaSecao(secaoAtiva.chave)

  return (
    <section id={ID_COLECAO} className="px-screen-x" style={{ scrollMarginTop: ALTURA_HEADER }} aria-label="Coleção">
      {/* ── Abas de seções + "Ver tudo" ── */}
      <div className="mb-4 mt-[26px] flex items-baseline gap-[18px]">
        <div
          role="tablist"
          aria-label="Seções"
          className="flex min-w-0 flex-1 items-baseline gap-[18px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {secoes.map((s, i) => {
            const ativa = i === indice
            return (
              <button
                key={s.chave}
                type="button"
                role="tab"
                id={`aba-${s.chave}`}
                aria-selected={ativa}
                aria-controls={idDaSecao(s.chave)}
                onClick={() => {
                  setAbaAtiva(i)
                  setExpandida(false)
                }}
                className={`shrink-0 py-2 font-display tracking-[0.1px] transition-colors ${
                  ativa ? 'font-semibold text-ink' : 'font-normal text-ink-muted hover:text-ink'
                }`}
                style={{ fontSize: 'calc(20px * var(--type-factor, 1))' }}
              >
                {s.titulo}
              </button>
            )
          })}
        </div>
        {secaoAtiva.produtos.length > PECAS_FECHADAS && (
          <button
            type="button"
            onClick={() => setExpandida((v) => !v)}
            aria-expanded={expandida}
            aria-controls={idGrade}
            className="shrink-0 py-2 font-body text-[14px] text-ink-muted transition-colors hover:text-ink"
          >
            {expandida ? 'Ver menos' : 'Ver tudo'}
          </button>
        )}
      </div>

      {/* ── Grade da aba ativa — a âncora da seção vive aqui ── */}
      <div
        id={idGrade}
        role="tabpanel"
        aria-labelledby={`aba-${secaoAtiva.chave}`}
        className="grid grid-cols-2 gap-[14px]"
        style={{ scrollMarginTop: ALTURA_HEADER + 16 }}
      >
        {produtosVisiveis.map((p) => (
          <CardSereno key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Tile da marca — "Conheça {nome}", a foto grande e, se houver, o manifesto
// ─────────────────────────────────────────────────────────────

function TileDaMarca({ nome, foto, texto }: { nome: string; foto: string; texto: string | null }) {
  return (
    <section className="mt-[34px] px-screen-x" aria-label={`Conheça ${nome}`}>
      <h2
        className="mb-[14px] font-display font-normal text-ink"
        style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.2 }}
      >
        Conheça {nome}
      </h2>
      {texto && <p className="mb-[14px] max-w-[40ch] font-body text-[14px] leading-[22px] text-ink-muted">{texto}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt=""
        loading="lazy"
        decoding="async"
        className="block w-full rounded-lg bg-canvasAlt object-cover"
        style={{ aspectRatio: '10 / 11' }}
      />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem peças, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioSereno({ store }: { store: VitrineWebProps['store'] }) {
  return (
    <section id={ID_COLECAO} className="px-screen-x pt-[26px]" style={{ scrollMarginTop: ALTURA_HEADER }} aria-label="Coleção">
      <div className="rounded-lg bg-canvasAlt px-6 py-12 text-center">
        <p
          className="font-display font-normal text-ink"
          style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.2 }}
        >
          A vitrine ainda está sendo arrumada
        </p>
        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
          {store.nome} ainda não colocou peças na vitrine. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — nome, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoSereno({ store }: { store: VitrineWebProps['store'] }) {
  // Hora de parede da LOJA, viva. Nasce vazia para o servidor (UTC) e o
  // cliente não divergirem na hidratação; meio minuto basta pra nunca mostrar
  // hora velha sem acordar a página à toa.
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 30_000)
    return () => clearInterval(id)
  }, [])

  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const hora = agora ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
  const tempo = store.tempo_entrega
  const meta = [
    hoje ? `Hoje ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} min` : null,
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null,
    hora,
  ].filter((m): m is string => !!m)

  return (
    <footer className="mt-12 flex flex-col items-center px-screen-x pb-12 pt-8 text-center">
      <div className="h-px w-10 bg-line" aria-hidden />

      <p
        className="mt-6 max-w-full truncate font-display font-normal text-ink"
        style={{ fontSize: 'calc(20px * var(--type-factor, 1))' }}
      >
        {store.nome}
      </p>

      {meta.length > 0 && (
        <p className="mt-3 font-body text-[13px] text-ink-muted" suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[13px] text-ink-muted" />

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-4 font-body text-[13px] text-ink-muted underline-offset-2 hover:underline"
        >
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
