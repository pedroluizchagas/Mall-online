'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TransitionEvent,
} from 'react'
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
  AcaoRaw,
  FotoQuadrada,
  MONO,
  MarcadoresQuadrados,
  PrecoRaw,
  TagDesconto,
  TituloRaw,
  VEU_HERO,
  descontoPct,
} from './raw-ui'

/**
 * Vitrine raw/street — layout PRÓPRIO do arquétipo `raw` para streetwear
 * (docs/store-theme/02 §B e 05 "Vitrine raw"; referência-âncora: Rawline).
 * Port web de apps/mobile-consumer/components/loja/LojaRaw.tsx.
 *
 * DNA destilado da referência:
 * - hero full-bleed com carrossel em autoplay — o mesmo motor do editorial
 *   com personalidade raw: glide de 360ms com ATERRISSAGEM DURA e dwell de
 *   4s; marcadores QUADRADOS; eyebrow MONO e headline condensada em caps;
 * - FAIXA CTA full-width no accent ("COMPRAR AGORA ↗") — nada de pill;
 * - drop em MOLDURA grossa no accent com rail de produtos;
 * - grid 2-col de cards com borda fina, tag de desconto no accent e nome em
 *   MONO caps;
 * - flourish de contraste nos títulos (serif itálico + caps no accent);
 * - cantos retos em tudo; sem vidro, sem sombra — só borda e cor.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a logo da
 * casa ocupa o lugar), o coração de favorito da loja e dos cartões (sem
 * persistência no web, seria um botão que mente), a barra de menu inferior
 * (navegação do app), a status bar clara e a transição radial de saída. A
 * sacola vive no header (sem FAB — regra das vitrines).
 */

const ID_DROP = 'drop'
/** Tempo de cena e duração do glide (RN: 4000ms / 360ms). */
const DWELL_MS = 4000
const GLIDE_MS = 360
/** A aterrissagem DURA da RN (`Easing.bezier(0.22, 1, 0.36, 1)`): estala, não flutua. */
const CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** Arrasto mínimo (px) para o gesto valer como troca de cena. */
const LIMIAR_SWIPE = 40
/** Altura do header sticky (para `scroll-mt`). */
const H_HEADER = 52

interface SlideRaw {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  produto: ProdutoCatalogo | null
}

export function VitrineRaw({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const vazio = secoesComItens.length === 0

  const maxDesc = useMemo(
    () => Math.max(0, ...secoes.flatMap((s) => s.produtos).map(descontoPct)),
    [secoes],
  )

  // Cenas do hero: a campanha (banner + oferta agregada) e até três peças —
  // os destaques escolhidos pelo lojista na frente; sem eles, as primeiras
  // peças com foto do drop (a derivação da RN).
  const slides = useMemo<SlideRaw[]>(() => {
    const abertura: SlideRaw = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? (maxDesc > 0 ? `ATÉ ${maxDesc}% OFF NO DROP` : 'VISTA O INCONVENCIONAL'),
      titulo: campanha?.titulo ?? store.nome,
      legenda: campanha?.subtitulo ?? null,
      produto: null,
    }
    const secaoDe = new Map<string, string>()
    secoes.forEach((s) => s.produtos.forEach((p) => secaoDe.set(p.id, s.titulo)))
    const todos = secoes.flatMap((s) => s.produtos)
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const doDrop = (secoesComItens[0]?.produtos ?? []).filter((p) => p.foto_url && !escolhidos.includes(p))
    const pecas = [...escolhidos, ...doDrop].slice(0, 3).map(
      (p): SlideRaw => ({
        imagem: p.foto_url,
        eyebrow: (secaoDe.get(p.id) ?? 'Destaque').toUpperCase(),
        titulo: p.nome,
        legenda: formatarReais(p.preco_promocional ?? p.preco),
        produto: p,
      }),
    )
    return [abertura, ...pecas]
  }, [store.banner_url, store.nome, campanha, maxDesc, secoes, secoesComItens, conteudo.destaques])

  // O hero em cena dirige o autoplay (só roda com o hero à vista) e o header
  // (transparente sobre a foto, escuro com fio depois dela) — os dois
  // limiares de `scrollY` da RN num só observer.
  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()

  const rolarParaDrop = useCallback(() => {
    document.getElementById(ID_DROP)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  const chromeVisivel = !heroEmCena

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoRaw — painel opaco com moldura no
        // lugar do vidro) no lugar do ProductModal quando o produto não tem
        // variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* Chrome: transparente sobre a foto → superfície escura com fio
                depois do hero; o nome em MONO caps nasce junto com o fundo.
                `h-0` sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 border-b border-line bg-surface transition-opacity duration-200 motion-reduce:transition-none"
                  style={{ height: H_HEADER, opacity: chromeVisivel ? 1 : 0 }}
                  aria-hidden
                />
                <div
                  className="relative flex items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]"
                  style={{ height: H_HEADER }}
                >
                  {store.logo_url ? (
                    <AcaoRaw href="/" rotulo={`${store.nome} — início da loja`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={store.logo_url} alt="" className="h-8 w-8 object-cover" />
                    </AcaoRaw>
                  ) : (
                    <span className="h-10 w-10" aria-hidden />
                  )}

                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center text-[13px] font-bold uppercase tracking-[2px] text-ink transition-opacity duration-200 motion-reduce:transition-none"
                    style={{ ...MONO, opacity: chromeVisivel ? 1 : 0 }}
                    aria-hidden={!chromeVisivel}
                    tabIndex={chromeVisivel ? 0 : -1}
                  >
                    {store.nome}
                  </a>

                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoRaw
                        icone="bag"
                        contador={totalItens}
                        rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                        aoTocar={abrirSacola}
                      />
                    )}
                  </Sacola>
                </div>
              </div>
            </div>

            {/* ── Hero: carrossel em autoplay (campanha + peças do drop) ── */}
            <HeroRaw ref={heroRef} slides={slides} emCena={heroEmCena} aoAbrirProduto={aoAbrirProduto} />

            {/* ── Faixa CTA full-width no accent — a banda da referência ── */}
            {!vazio && (
              <button
                type="button"
                onClick={rolarParaDrop}
                className="flex h-14 w-full items-center justify-center gap-[10px] bg-accent text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
              >
                <span className="font-display text-[18px] font-extrabold uppercase tracking-[3px]">
                  {campanha?.cta ?? 'Comprar agora'}
                </span>
                <span className="text-[20px] font-bold leading-none" style={MONO} aria-hidden>
                  ↗
                </span>
              </button>
            )}

            {/* ── Identidade: descrição e meta em mono ── */}
            <IdentidadeRaw store={store} />

            {vazio ? (
              <VazioRaw store={store} />
            ) : (
              <section id={ID_DROP} aria-label="Produtos" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${H_HEADER}px)` }}>
                {secoesComItens.map((secao, i) =>
                  i === 0 ? (
                    <SecaoDrop key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ) : (
                    <SecaoGrade key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ),
                )}
              </section>
            )}

            {/* ── Fecho: wordmark mono, relógio vivo e os links da casa ── */}
            <FechoRaw store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — glide de 360ms com aterrissagem dura, 4s por cena
// ─────────────────────────────────────────────────────────────

const HeroRaw = forwardRef<
  HTMLElement,
  {
    slides: SlideRaw[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
  }
>(function HeroRaw({ slides, emCena, aoAbrirProduto }, ref) {
  const n = slides.length
  // `pos` corre de 0 a n: n é o CLONE do primeiro slide no fim do trilho — o
  // salto invisível de volta ao começo da RN. `animar` desliga a transição
  // só no quadro do salto.
  const [pos, setPos] = useState(0)
  const [animar, setAnimar] = useState(true)
  const [pausado, setPausado] = useState(false)
  const [reduzir, setReduzir] = useState(false)

  // "Reduzir movimento" congela glide e parallax — como o AccessibilityInfo da RN.
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

  // A lista de cenas pode encolher (dados novos): nunca aponta pra fora dela.
  useEffect(() => {
    if (pos > n) setPos(0)
  }, [pos, n])

  const saltarParaInicio = useCallback(() => {
    setAnimar(false)
    setPos(0)
  }, [])

  // O quadro seguinte ao salto religa a transição.
  useEffect(() => {
    if (animar) return
    const id = requestAnimationFrame(() => setAnimar(true))
    return () => cancelAnimationFrame(id)
  }, [animar])

  const avancar = useCallback(() => {
    setPos((p) => {
      if (n <= 1) return 0
      // Sem transição não há `transitionend` para fazer o salto: fecha o
      // ciclo direto, sem passar pelo clone.
      if (reduzir) return (p + 1) % n
      return Math.min(p + 1, n)
    })
  }, [n, reduzir])

  // Dwell de 4s por cena enquanto o hero está à vista, a aba visível e sem o
  // visitante pousado sobre ele.
  useEffect(() => {
    if (n <= 1 || pausado || !emCena || reduzir) return
    // No clone, quem fecha o ciclo é o `transitionend`; este timer é a rede
    // de segurança para quando ele não vem (aba escondida no meio do glide).
    const t = setTimeout(pos >= n ? saltarParaInicio : avancar, pos >= n ? GLIDE_MS + 120 : DWELL_MS)
    return () => clearTimeout(t)
  }, [pos, pausado, emCena, reduzir, n, avancar, saltarParaInicio])

  const aoFimDaTransicao = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (pos >= n) saltarParaInicio()
  }

  // Swipe: arrasto horizontal troca a cena (o paging da RN). `touch-action:
  // pan-y` deixa a rolagem vertical com o navegador. Um clique que veio de um
  // arrasto não abre produto.
  const inicioX = useRef<number | null>(null)
  const arrastou = useRef(false)
  const aoPressionar = (e: PointerEvent<HTMLElement>) => {
    inicioX.current = e.clientX
    arrastou.current = false
    setPausado(true)
  }
  const aoSoltar = (e: PointerEvent<HTMLElement>) => {
    const x0 = inicioX.current
    inicioX.current = null
    if (x0 != null && n > 1) {
      const dx = e.clientX - x0
      if (Math.abs(dx) > LIMIAR_SWIPE) {
        arrastou.current = true
        if (dx < 0) avancar()
        else setPos((p) => Math.max(0, Math.min(p, n - 1) - 1))
      }
    }
    if (e.pointerType === 'mouse') return // o `pointerleave` do mouse retoma
    setPausado(false)
  }
  const aoClicarCaptura = (e: MouseEvent<HTMLElement>) => {
    if (!arrastou.current) return
    arrastou.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  const trilho = n > 1 ? [...slides, slides[0]] : slides
  const indice = Math.min(pos, n) % Math.max(n, 1)
  const transicao = reduzir || !animar ? 'none' : `${GLIDE_MS}ms ${CURVA}`

  return (
    <header
      ref={ref}
      className="relative h-[48svh] max-h-[560px] min-h-[380px] overflow-hidden bg-surface [touch-action:pan-y]"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => {
        inicioX.current = null
        setPausado(false)
      }}
      onPointerDown={aoPressionar}
      onPointerUp={aoSoltar}
      onPointerCancel={() => {
        inicioX.current = null
      }}
      onClickCapture={aoClicarCaptura}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques do drop"
    >
      <div
        className="flex h-full"
        style={{
          width: `${trilho.length * 100}%`,
          transform: `translateX(-${(pos / trilho.length) * 100}%)`,
          transition: transicao === 'none' ? 'none' : `transform ${transicao}`,
        }}
        onTransitionEnd={aoFimDaTransicao}
      >
        {trilho.map((slide, i) => {
          const clone = i === n
          const emFoco = i === pos
          // Parallax da RN (±12% da largura): a foto é 124% do quadro e
          // desliza no sentido contrário do glide, com a mesma curva.
          const dir = Math.max(-1, Math.min(1, i - pos))
          return (
            <div
              key={i}
              className="relative h-full shrink-0 overflow-hidden"
              style={{ width: `${100 / trilho.length}%` }}
              aria-hidden={!emFoco}
            >
              {slide.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.imagem}
                  alt=""
                  // Todas as cenas nascem eager: a próxima já está no quadro
                  // (só recortada) e um glide pra uma foto vazia é o pior
                  // frame possível. A prioridade alta é só da primeira (LCP).
                  loading="eager"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  decoding="async"
                  draggable={false}
                  className="absolute inset-y-0 -left-[12%] h-full w-[124%] max-w-none object-cover"
                  style={{
                    transform: reduzir ? undefined : `translateX(${(dir * 9.7).toFixed(2)}%)`,
                    transition: transicao === 'none' ? 'none' : `transform ${transicao}`,
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <TextoDaCena
                slide={slide}
                emFoco={emFoco}
                titular={i === 0}
                clone={clone}
                transicao={transicao}
                aoAbrir={slide.produto ? () => aoAbrirProduto(slide.produto as ProdutoCatalogo) : undefined}
              />
            </div>
          )
        })}
      </div>

      {/* Marcadores quadrados — o dot do raw tem canto reto */}
      {n > 1 && (
        <div className="absolute bottom-6 right-screen-x z-[2]">
          <MarcadoresQuadrados
            total={n}
            ativo={indice}
            rotulos={slides.map((s) => s.titulo)}
            irPara={(i) => {
              setPos(i)
              setPausado(true)
            }}
          />
        </div>
      )}
    </header>
  )
})

/**
 * O texto de uma cena: eyebrow MONO, headline condensada em caps e a legenda
 * mono (preço da peça ou subtítulo da campanha). Cena de PEÇA é um botão
 * inteiro (a RN torna o slide todo tocável); a da campanha não leva a nada.
 */
function TextoDaCena({
  slide,
  emFoco,
  titular,
  clone,
  transicao,
  aoAbrir,
}: {
  slide: SlideRaw
  emFoco: boolean
  /** Primeira cena real: leva o `<h1>` da página. */
  titular: boolean
  clone: boolean
  transicao: string
  aoAbrir?: () => void
}) {
  const estiloBloco = {
    opacity: emFoco ? 1 : 0,
    transition: transicao === 'none' ? 'none' : `opacity ${transicao}`,
  }
  const Headline = titular && !clone ? 'h1' : 'p'
  const miolo = (
    <>
      <span
        className="block text-[11px] font-bold uppercase tracking-[2.4px]"
        style={{ ...MONO, color: 'rgba(255,255,255,0.88)' }}
      >
        {slide.eyebrow}
      </span>
      <Headline
        className="m-0 line-clamp-2 font-display font-extrabold uppercase tracking-[0.5px] text-white"
        style={{
          fontSize: 'calc(42px * var(--type-factor, 1))',
          lineHeight: 'calc(43px * var(--type-factor, 1))',
        }}
      >
        {slide.titulo}
      </Headline>
      {slide.legenda && (
        <span
          className="line-clamp-2 text-[13px] font-bold tracking-[1px]"
          style={{ ...MONO, color: 'rgba(255,255,255,0.92)' }}
        >
          {slide.legenda}
        </span>
      )}
    </>
  )

  if (aoAbrir) {
    return (
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Ver ${slide.titulo}`}
        tabIndex={emFoco ? 0 : -1}
        className="absolute inset-0 flex flex-col justify-end gap-2 px-screen-x pb-5 pr-[calc(var(--space-screen-x,24px)+40px)] text-left"
        style={estiloBloco}
      >
        {miolo}
      </button>
    )
  }
  return (
    <div
      className="absolute inset-x-0 bottom-5 flex flex-col gap-2 px-screen-x pr-[calc(var(--space-screen-x,24px)+40px)]"
      style={estiloBloco}
    >
      {miolo}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Identidade — descrição e meta em mono
// ─────────────────────────────────────────────────────────────

function IdentidadeRaw({ store }: { store: VitrineWebProps['store'] }) {
  const partes = [
    store.tempo_entrega != null ? `${store.tempo_entrega} MIN` : null,
    store.taxa_entrega === 0
      ? 'ENTREGA GRÁTIS'
      : store.taxa_entrega != null
        ? `ENTREGA ${formatarReais(store.taxa_entrega)}`
        : null,
  ].filter((m): m is string => !!m)

  return (
    <div className="flex flex-col gap-2 px-screen-x pt-[18px]">
      {store.descricao && (
        <p className="line-clamp-2 text-[12px] leading-[18px] text-ink-muted" style={MONO}>
          {store.descricao}
        </p>
      )}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[1.6px] text-ink-muted"
        style={MONO}
      >
        {partes.map((parte, i) => (
          <span key={parte} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden>·</span>}
            {parte}
          </span>
        ))}
        {/* A RN imprime "ABERTO" fixo; aqui só o que os horários dizem. */}
        <StatusAberto
          horarios={store.horarios}
          className={`text-[10px] font-bold uppercase tracking-[1.6px] text-ink-muted ${
            partes.length > 0 ? "before:mr-3 before:content-['·']" : ''
          }`}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Drop na moldura — rail horizontal dentro de borda grossa no accent
// ─────────────────────────────────────────────────────────────

function SecaoDrop({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <div id={idDaSecao(secao.chave)} className="mt-[30px]" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${H_HEADER + 8}px)` }}>
      <div className="mb-3 flex items-end justify-between px-screen-x">
        <TituloRaw titulo={secao.titulo} />
      </div>

      <div className="mx-screen-x border-[3px] border-accent bg-canvas">
        <ul
          className="m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={secao.titulo}
        >
          {secao.produtos.map((p) => {
            const desc = descontoPct(p)
            return (
              <li key={p.id} className="w-[148px] shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => aoAbrirProduto(p)}
                  className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80"
                >
                  <span className="relative block">
                    <FotoQuadrada src={p.foto_url} />
                    {desc > 0 && <TagDesconto pct={desc} />}
                  </span>
                  <span
                    className="mt-2 line-clamp-2 min-h-[28px] text-[10px] font-bold uppercase leading-[14px] tracking-[0.4px] text-ink"
                    style={MONO}
                  >
                    {p.nome}
                  </span>
                  <PrecoRaw produto={p} tamanho={12} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Grid 2-col — cards com borda fina e tag de desconto
// ─────────────────────────────────────────────────────────────

/** Quantos cartões a seção mostra antes do "VER TUDO ↗". */
const PREVIA = 4

function SecaoGrade({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const [expandida, setExpandida] = useState(false)
  const dobravel = secao.produtos.length > PREVIA
  const visiveis = expandida || !dobravel ? secao.produtos : secao.produtos.slice(0, PREVIA)

  return (
    <div id={idDaSecao(secao.chave)} className="mt-[30px]" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${H_HEADER + 8}px)` }}>
      <div className="mb-3 flex items-end justify-between gap-3 px-screen-x">
        <TituloRaw titulo={secao.titulo} />
        {dobravel && (
          <button
            type="button"
            onClick={() => setExpandida((v) => !v)}
            aria-expanded={expandida}
            className="-m-[10px] shrink-0 p-[10px] text-[10px] font-bold tracking-[1.6px] text-ink transition-opacity hover:opacity-70"
            style={MONO}
          >
            {expandida ? 'FECHAR ↖' : 'VER TUDO ↗'}
          </button>
        )}
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-[10px] px-screen-x">
        {visiveis.map((p) => (
          <CardRaw key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
        ))}
      </ul>
    </div>
  )
}

function CardRaw({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const desc = descontoPct(produto)
  return (
    <li className="border border-line bg-surface">
      <button
        type="button"
        onClick={aoTocar}
        className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80"
      >
        <span className="relative block">
          <FotoQuadrada src={produto.foto_url} />
          {/* O coração à esquerda da referência fica de fora: sem favoritos
              persistentes no web, seria um botão que não guarda nada. */}
          {desc > 0 && <TagDesconto pct={desc} />}
        </span>
        <span className="flex flex-col gap-2 p-3">
          <span
            className="line-clamp-2 min-h-[30px] text-[11px] font-bold uppercase leading-[15px] tracking-[0.4px] text-ink"
            style={MONO}
          >
            {produto.nome}
          </span>
          <PrecoRaw produto={produto} tamanho={13} />
        </span>
      </button>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — o drop ainda em produção, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioRaw({ store }: { store: VitrineWebProps['store'] }) {
  return (
    <section id={ID_DROP} className="px-screen-x pt-[30px]" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${H_HEADER}px)` }} aria-label="Produtos">
      <TituloRaw titulo="o drop" />
      <div className="mt-3 border-[3px] border-accent px-5 py-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[2.4px] text-accent" style={MONO}>
          Em produção
        </p>
        <p
          className="mt-3 font-display font-extrabold uppercase tracking-[0.5px] text-ink"
          style={{ fontSize: 'calc(28px * var(--type-factor, 1))', lineHeight: 1.05 }}
        >
          Nada na vitrine ainda
        </p>
        <p className="mx-auto mt-4 max-w-[34ch] text-[12px] leading-[18px] text-ink-muted" style={MONO}>
          {store.nome} ainda não soltou as peças. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — wordmark mono, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoRaw({ store }: { store: VitrineWebProps['store'] }) {
  // Hora de parede da LOJA, viva. Nasce vazia para o servidor (UTC) e o
  // cliente não divergirem na hidratação; meio minuto basta pra nunca mostrar
  // hora velha sem acordar a página à toa.
  const agora = useRelogioDaLoja()

  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const hora = agora ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
  const tempo = store.tempo_entrega
  const meta = [
    hoje ? `HOJE ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} MIN` : null,
    store.taxa_entrega === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter((m): m is string => !!m)

  return (
    <footer className="mt-12 border-t-[3px] border-accent px-screen-x pb-12 pt-8">
      <p className="truncate text-[13px] font-bold uppercase tracking-[2px] text-ink" style={MONO}>
        {store.nome}
      </p>

      {meta.length > 0 && (
        <p className="mt-3 text-[10px] font-bold tracking-[1.6px] text-ink-muted" style={MONO} suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}

      <div className="mt-2" style={MONO}>
        <StatusAberto horarios={store.horarios} className="text-[10px] font-bold uppercase tracking-[1.6px] text-ink-muted" />
      </div>

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-4 inline-block text-[12px] font-bold text-ink underline-offset-2 hover:underline"
          style={MONO}
        >
          {store.telefone}
        </a>
      )}

      <div
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[10px] uppercase tracking-[1.2px] text-ink-muted"
        style={MONO}
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
