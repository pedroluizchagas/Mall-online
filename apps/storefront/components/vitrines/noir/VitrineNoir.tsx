'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatarHorario,
  horarioDeHoje,
  normalizeStoreConteudo,
  relogioDaLoja,
} from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  idDaSecao,
  precoFinalDe,
  prefereMenosMovimento,
  useHeroEmCena,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoNoir,
  EstilosNoir,
  Eyebrow,
  FonteItalicaNoir,
  ITALICO,
  LinhasDoHero,
  MARFIM,
  MARFIM_HEX,
  SERIFA,
  SetaCircular,
  VEU_HERO,
  comAlfa,
  tokenComAlfa,
} from './noir-ui'

/**
 * Vitrine noir gastronômica — layout PRÓPRIO do arquétipo `noir` para
 * restaurantes refinados (docs/store-theme/02 §D e 05 "Vitrine noir";
 * referência: The Obscura). Port web de
 * apps/mobile-consumer/components/loja/LojaNoir.tsx.
 *
 * DNA destilado da referência:
 * - preto profundo, marfim e DOURADO; serifa de alto contraste (Cormorant);
 * - hero dramático com nome em serifa gigante caps e CTA de CONTORNO RETO em
 *   caps espaçadas — o carrossel mais LENTO do sistema (cortina de 700ms,
 *   6s por cena), aqui como crossfade entre a foto da casa e os pratos;
 * - wordmark dourado em ITÁLICO no header, que só aparece depois do hero;
 * - CARDÁPIO-LIVRO: prato em serifa itálica marfim, ingredientes em serifa
 *   apagada separados por " · ", preço dourado à direita, fios finos;
 * - carrossel CENTRAL de pratos: cartão do meio em destaque, vizinhos
 *   encolhidos e apagados, setas circuladas finas;
 * - fecho "O espaço" com foto da casa.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a logo da
 * casa ocupa o lugar), a barra de menu inferior (navegação do app), a status
 * bar clara e a transição radial dourada de saída. A sacola vive no header
 * (sem FAB — regra das vitrines).
 */

const ID_CARDAPIO = 'cardapio'
/** Tempo de cena e duração da cortina (RN: 6000ms / 700ms). */
const DWELL_MS = 6000
const GLIDE_MS = 700
const CURVA = 'cubic-bezier(0.4, 0, 0.2, 1)'

interface SlideNoir {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * A descrição do prato na voz do cardápio-livro: quando o lojista escreveu uma
 * LISTA de ingredientes ("burrata, tomate confit, manjericão"), as vírgulas
 * viram o " · " da referência. Uma frase de verdade (com ponto) fica intacta.
 */
function comoIngredientes(descricao: string): string {
  const texto = descricao.trim()
  const pareceLista = texto.length <= 160 && !/[.!?;]/.test(texto) && texto.includes(',')
  return pareceLista ? texto.replace(/\s*,\s*/g, ' · ') : texto
}

export function VitrineNoir({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  // Cenas do hero: a campanha da casa e até três pratos com foto da primeira
  // seção — a derivação da RN, com o `conteudo.campanha` do lojista na frente.
  const slides = useMemo<SlideNoir[]>(() => {
    const abertura: SlideNoir = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? 'Alta gastronomia',
      titulo: campanha?.titulo ?? store.nome,
      legenda: campanha?.subtitulo ?? store.descricao ?? null,
      cta: campanha?.cta ?? 'Ver o cardápio',
      produto: null,
    }
    const primeira = secoes[0]
    const destaque = (primeira?.produtos ?? [])
      .filter((p) => p.foto_url)
      .slice(0, 3)
      .map(
        (p): SlideNoir => ({
          imagem: p.foto_url,
          eyebrow: primeira.titulo,
          titulo: p.nome,
          legenda: formatarReais(precoFinalDe(p)),
          cta: 'Ver prato',
          produto: p,
        }),
      )
    return [abertura, ...destaque]
  }, [store.banner_url, store.nome, store.descricao, campanha, secoes])

  // Pratos do carrossel central: os com foto da primeira seção.
  const daCasa = useMemo(() => (secoes[0]?.produtos ?? []).filter((p) => p.foto_url), [secoes])

  // Foto do espaço: a galeria da casa na frente; sem ela, o banner. O texto
  // do espaço é o manifesto do lojista — ou a descrição da loja, quando o hero
  // já não a imprimiu (a campanha tem subtítulo próprio).
  const fotoEspaco = conteudo.galeria_casa?.[0] ?? store.banner_url ?? null
  const textoEspaco = conteudo.manifesto ?? (campanha?.subtitulo ? store.descricao : null) ?? null

  const vazio = secoes.every((s) => s.produtos.length === 0)

  // O hero em cena: dirige o autoplay (só roda com o hero à vista) e o header
  // (transparente sobre a foto, preto com fio depois dela) — os dois limiares
  // de `scrollY` da RN num só observer.
  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()

  const rolarParaCardapio = useCallback(() => {
    document.getElementById(ID_CARDAPIO)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  const wordmarkVisivel = !heroEmCena

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoNoir — painel preto com fio dourado)
        // no lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <FonteItalicaNoir />
            <EstilosNoir />
            <CartPersistence />

            {/* Chrome: transparente sobre a foto → preto com fio depois do
                hero; o wordmark dourado em itálico nasce junto com o fundo.
                `h-0` sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[58px] border-b bg-canvas transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ opacity: wordmarkVisivel ? 1 : 0, borderColor: 'var(--line, #1C1C1C)' }}
                  aria-hidden
                />
                <div className="relative flex h-[58px] items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]">
                  {store.logo_url ? (
                    <AcaoNoir href="/" rotulo={`${store.nome} — início da loja`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                        style={{ boxShadow: `0 0 0 1px ${comAlfa(MARFIM_HEX, 0.35)}` }}
                      />
                    </AcaoNoir>
                  ) : (
                    <span className="h-10 w-10" aria-hidden />
                  )}

                  {/* Wordmark dourado em itálico — a assinatura da referência. */}
                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center text-[14px] font-semibold uppercase tracking-[2.5px] text-accent transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ ...ITALICO, opacity: wordmarkVisivel ? 1 : 0 }}
                    aria-hidden={!wordmarkVisivel}
                    tabIndex={wordmarkVisivel ? 0 : -1}
                  >
                    {store.nome}
                  </a>

                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoNoir
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

            {/* ── Hero dramático: a cortina lenta entre a casa e os pratos ── */}
            <HeroNoir
              ref={heroRef}
              slides={slides}
              emCena={heroEmCena}
              aoAbrirProduto={aoAbrirProduto}
              aoVerCardapio={rolarParaCardapio}
            />

            {vazio ? (
              <VazioNoir store={store} />
            ) : (
              <>
                {/* ── O cardápio-livro ── */}
                <section id={ID_CARDAPIO} className="scroll-mt-[calc(var(--inset-top,0px)+58px)] px-screen-x pt-9" aria-label="Cardápio">
                  <Eyebrow className="text-ink-muted">O cardápio</Eyebrow>
                  <h2
                    className="mt-[10px] font-display font-medium"
                    style={{
                      color: MARFIM,
                      fontSize: 'calc(34px * var(--type-factor, 1))',
                      lineHeight: 1.15,
                    }}
                  >
                    Da nossa cozinha
                  </h2>
                  <MetaDaCasa store={store} />

                  {secoes.map((secao) => (
                    <SecaoLivro key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ))}
                </section>

                {/* ── Da casa: carrossel central com setas circuladas ── */}
                {daCasa.length > 0 && (
                  <section className="mt-10" aria-label="Da casa">
                    <Eyebrow as="h2" className="mb-[18px] text-center text-ink-muted">
                      Da casa
                    </Eyebrow>
                    <CarrosselCentral produtos={daCasa} aoAbrirProduto={aoAbrirProduto} />
                  </section>
                )}
              </>
            )}

            {/* ── O espaço ── */}
            {fotoEspaco && <EspacoNoir foto={fotoEspaco} texto={textoEspaco} />}

            {/* ── Fecho: wordmark, relógio e os links da casa ── */}
            <FechoNoir store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — a cortina de 700ms entre a foto da casa e os pratos
// ─────────────────────────────────────────────────────────────

const HeroNoir = forwardRef<
  HTMLElement,
  {
    slides: SlideNoir[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerCardapio: () => void
  }
>(function HeroNoir({ slides, emCena, aoAbrirProduto, aoVerCardapio }, ref) {
  const [ativo, setAtivo] = useState(0)
  // Quem acabou de sair de cena mantém o zoom no ponto final enquanto a
  // cortina fecha — senão a foto "pularia" de volta durante o crossfade.
  const [anterior, setAnterior] = useState<number | null>(null)
  const [pausado, setPausado] = useState(false)
  const [reduzir, setReduzir] = useState(false)

  // "Reduzir movimento" congela a cortina — como o AccessibilityInfo da RN.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzir(mq.matches)
    const aoMudar = (e: MediaQueryListEvent) => setReduzir(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  // Autoplay: 6s por cena, só com o hero à vista, a aba visível e sem o
  // visitante pousado sobre ele.
  useEffect(() => {
    if (slides.length <= 1 || pausado || !emCena || reduzir) return
    const t = setTimeout(() => {
      setAnterior(ativo)
      setAtivo((ativo + 1) % slides.length)
    }, DWELL_MS)
    return () => clearTimeout(t)
  }, [ativo, pausado, emCena, reduzir, slides.length])

  useEffect(() => {
    const aoVisibilidade = () => setPausado(document.hidden)
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  // A lista de cenas pode encolher (dados novos): nunca aponta pra fora dela.
  const indice = Math.min(ativo, slides.length - 1)

  return (
    <header
      ref={ref}
      className="relative h-[56svh] max-h-[680px] min-h-[420px] overflow-hidden bg-canvas"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da casa"
    >
      {slides.map((slide, i) => {
        const emFoco = i === indice
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: emFoco ? 1 : 0,
              transition: reduzir ? 'none' : `opacity ${GLIDE_MS}ms ${CURVA}`,
              pointerEvents: emFoco ? 'auto' : 'none',
            }}
            aria-hidden={!emFoco}
          >
            {slide.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imagem}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding="async"
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover ${
                  reduzir ? '' : emFoco ? 'noir-respirar' : i === anterior ? 'noir-respirado' : ''
                }`}
              />
            )}
            <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

            <div className="absolute inset-x-0 bottom-[26px] flex flex-col items-start gap-[10px] px-screen-x pr-[calc(var(--space-screen-x,24px)+8px)]">
              <Eyebrow style={{ color: 'rgba(255,255,255,0.8)' }}>{slide.eyebrow}</Eyebrow>
              {i === 0 ? (
                <h1
                  className="line-clamp-2 w-full font-display font-semibold uppercase tracking-[1px]"
                  style={{
                    color: MARFIM,
                    fontSize: 'calc(44px * var(--type-factor, 1))',
                    lineHeight: 'calc(50px * var(--type-factor, 1))',
                  }}
                >
                  {slide.titulo}
                </h1>
              ) : (
                <p
                  className="line-clamp-2 w-full font-display font-semibold uppercase tracking-[1px]"
                  style={{
                    color: MARFIM,
                    fontSize: 'calc(44px * var(--type-factor, 1))',
                    lineHeight: 'calc(50px * var(--type-factor, 1))',
                  }}
                >
                  {slide.titulo}
                </p>
              )}
              {slide.legenda && (
                <p
                  className="line-clamp-2 font-body text-[14px] leading-5"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {slide.legenda}
                </p>
              )}

              {/* CTA de contorno RETO em caps espaçadas — "RESERVE A TABLE". */}
              <button
                type="button"
                onClick={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoVerCardapio())}
                className="mt-[6px] border px-6 py-[13px] font-body text-[12px] font-medium uppercase tracking-[2.5px] transition-colors hover:bg-white/10 active:bg-white/15"
                style={{ borderColor: 'rgba(255,255,255,0.85)', borderRadius: 2, color: MARFIM }}
              >
                {slide.cta}
              </button>
            </div>
          </div>
        )
      })}

      {slides.length > 1 && (
        <div className="absolute bottom-7 right-screen-x z-[2]">
          <LinhasDoHero
            total={slides.length}
            ativo={indice}
            rotulos={slides.map((s) => s.titulo)}
            irPara={(i) => {
              setAnterior(indice)
              setAtivo(i)
              setPausado(true)
            }}
          />
        </div>
      )}
    </header>
  )
})

// ─────────────────────────────────────────────────────────────
// Meta da casa — tempo, entrega e o relógio vivo, numa linha só
// ─────────────────────────────────────────────────────────────

function MetaDaCasa({ store }: { store: VitrineWebProps['store'] }) {
  const partes = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null,
  ].filter((m): m is string => !!m)

  return (
    <div className="mt-[10px] flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[13px] text-ink-muted">
      {partes.map((parte, i) => (
        <span key={parte} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          {parte}
        </span>
      ))}
      {/* A RN imprime "Aberto" fixo; aqui só o que os horários dizem. */}
      <StatusAberto
        horarios={store.horarios}
        className={`font-body text-[13px] text-ink-muted ${partes.length > 0 ? "before:mr-3 before:content-['·']" : ''}`}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio-livro — seção em caps douradas, linhas com fio fino
// ─────────────────────────────────────────────────────────────

function SecaoLivro({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  if (secao.produtos.length === 0) return null
  return (
    <div id={idDaSecao(secao.chave)} className="mt-[34px] scroll-mt-[calc(var(--inset-top,0px)+70px)]">
      <Eyebrow as="h2" className="mb-[6px] text-[12px] text-accent">
        {secao.titulo}
      </Eyebrow>
      <ul className="m-0 list-none p-0">
        {secao.produtos.map((p) => (
          <LinhaCardapio key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
        ))}
      </ul>
    </div>
  )
}

/** Linha do livro: prato em itálico marfim, ingredientes apagados, preço dourado. */
function LinhaCardapio({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const promo = temPromo(produto)
  return (
    <li className="border-b border-line">
      <button
        type="button"
        onClick={aoTocar}
        className="flex w-full items-start gap-4 py-[18px] text-left transition-opacity hover:opacity-80 active:opacity-70"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[21px] font-medium leading-[1.2]" style={{ ...ITALICO, color: MARFIM }}>
            {produto.nome}
          </span>
          {produto.descricao && (
            <span
              className="mt-[5px] line-clamp-2 block text-[15px] font-medium leading-[21px] text-ink-muted"
              style={SERIFA}
            >
              {comoIngredientes(produto.descricao)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-[2px]">
          <span className="text-[18px] font-semibold leading-[1.2] text-accent" style={SERIFA}>
            {formatarReais(precoFinalDe(produto))}
          </span>
          {promo && (
            <span className="font-body text-[12px] text-ink-muted line-through">{formatarReais(produto.preco)}</span>
          )}
        </span>
      </button>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────
// Carrossel central — o do meio em destaque, vizinhos apagados
// ─────────────────────────────────────────────────────────────

/** Largura do cartão como fração da coluna (RN: 60% da tela) e o vão. */
const CARTAO_FRACAO = 0.6
const CARTAO_GAP = 14

function CarrosselCentral({
  produtos,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const quadroRef = useRef(0)
  const [indice, setIndice] = useState(0)

  // Escala e opacidade seguem a rolagem, escritas direto no DOM (sem
  // re-render por pixel): o `interpolate` da RN. 1 → 0,88 e 1 → 0,4 a um
  // cartão de distância do centro.
  const medir = useCallback(() => {
    const el = trilhoRef.current
    if (!el) return
    const centro = el.scrollLeft + el.clientWidth / 2
    let melhor = 0
    let menorDist = Number.POSITIVE_INFINITY
    Array.from(el.children).forEach((filho, i) => {
      const f = filho as HTMLElement
      const meio = f.offsetLeft + f.offsetWidth / 2
      const dist = Math.abs(meio - centro)
      const d = Math.min(1, dist / Math.max(f.offsetWidth + CARTAO_GAP, 1))
      f.style.transform = `scale(${(1 - 0.12 * d).toFixed(3)})`
      f.style.opacity = (1 - 0.6 * d).toFixed(3)
      if (dist < menorDist) {
        menorDist = dist
        melhor = i
      }
    })
    setIndice((atual) => (atual === melhor ? atual : melhor))
  }, [])

  const aoRolar = useCallback(() => {
    if (quadroRef.current) return
    quadroRef.current = requestAnimationFrame(() => {
      quadroRef.current = 0
      medir()
    })
  }, [medir])

  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('resize', medir)
      if (quadroRef.current) cancelAnimationFrame(quadroRef.current)
    }
  }, [medir, produtos.length])

  const irPara = useCallback((i: number) => {
    const el = trilhoRef.current
    if (!el) return
    const alvo = Math.max(0, Math.min(i, el.children.length - 1))
    const f = el.children[alvo] as HTMLElement | undefined
    if (!f) return
    el.scrollTo({
      left: f.offsetLeft + f.offsetWidth / 2 - el.clientWidth / 2,
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
    })
  }, [])

  const atual = produtos[indice]
  const margem = `${(((1 - CARTAO_FRACAO) / 2) * 100).toFixed(2)}%`

  return (
    <div>
      <div className="relative">
        <div
          ref={trilhoRef}
          onScroll={aoRolar}
          className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ paddingLeft: margem, paddingRight: margem, gap: CARTAO_GAP }}
        >
          {produtos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (i === indice ? aoAbrirProduto(p) : irPara(i))}
              aria-label={i === indice ? `Ver ${p.nome}` : `Ir para ${p.nome}`}
              className="shrink-0 snap-center overflow-hidden rounded-md bg-surface transition-opacity active:opacity-90"
              style={{
                width: `${CARTAO_FRACAO * 100}%`,
                aspectRatio: '10 / 13',
                transitionProperty: 'transform, opacity',
                transitionDuration: '120ms',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.foto_url ?? undefined}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="block h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        <SetaCircular lado="esquerda" ativa={indice > 0} aoTocar={() => irPara(indice - 1)} />
        <SetaCircular lado="direita" ativa={indice < produtos.length - 1} aoTocar={() => irPara(indice + 1)} />
      </div>

      {/* Legenda central */}
      <div className="mt-[14px] flex flex-col items-center gap-[3px] px-screen-x text-center" aria-live="polite">
        <p className="w-full truncate text-[20px] font-medium leading-[1.2]" style={{ ...ITALICO, color: MARFIM }}>
          {atual?.nome}
        </p>
        <p className="text-[15px] font-semibold text-accent" style={SERIFA}>
          {atual ? formatarReais(precoFinalDe(atual)) : ''}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// O espaço — a foto da casa e, se houver, o manifesto
// ─────────────────────────────────────────────────────────────

function EspacoNoir({ foto, texto }: { foto: string; texto: string | null }) {
  return (
    <section className="mt-[42px]" aria-label="O espaço">
      <div className="mb-[14px] px-screen-x">
        <Eyebrow className="text-ink-muted">O espaço</Eyebrow>
        <h2
          className="mt-2 font-display font-medium"
          style={{ color: MARFIM, fontSize: 'calc(30px * var(--type-factor, 1))', lineHeight: 1.15 }}
        >
          Feita para demorar
        </h2>
        {texto && <p className="mt-3 max-w-[40ch] font-body text-[14px] leading-[22px] text-ink-muted">{texto}</p>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt="" loading="lazy" decoding="async" className="block h-[300px] w-full object-cover" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioNoir({ store }: { store: VitrineWebProps['store'] }) {
  return (
    <section id={ID_CARDAPIO} className="scroll-mt-[calc(var(--inset-top,0px)+58px)] px-screen-x pt-9" aria-label="Cardápio">
      <Eyebrow className="text-ink-muted">O cardápio</Eyebrow>
      <div className="mt-6 border-y border-line py-10 text-center">
        <p
          className="font-medium leading-[1.2]"
          style={{ ...ITALICO, color: MARFIM, fontSize: 'calc(26px * var(--type-factor, 1))' }}
        >
          A cozinha ainda escreve o cardápio
        </p>
        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
          {store.nome} ainda não colocou os pratos na vitrine. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — wordmark itálico, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoNoir({ store }: { store: VitrineWebProps['store'] }) {
  // Hora de parede da LOJA, viva. Nasce vazia para o servidor (UTC) e o
  // cliente não divergirem na hidratação; meio minuto basta pra nunca mostrar
  // hora velha sem acordar a página à toa.
  const agora = useRelogioDaLoja()

  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const hora = agora ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
  const tempo = store.tempo_entrega
  const meta = [
    hoje ? `Hoje ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : null,
    hora,
  ].filter((m): m is string => !!m)

  const fioDourado = tokenComAlfa('--accent', 0.35)
  const apagado = comAlfa(MARFIM_HEX, 0.55)

  return (
    <footer className="mt-12 flex flex-col items-center px-screen-x pb-12 pt-10 text-center">
      {/* Fio dourado curto — a régua da referência antes do fecho. */}
      <div className="h-px w-12" style={{ backgroundColor: fioDourado }} aria-hidden />

      <p
        className="mt-6 max-w-full truncate text-[15px] font-semibold uppercase tracking-[3px] text-accent"
        style={ITALICO}
      >
        {store.nome}
      </p>

      {meta.length > 0 && (
        <p className="mt-3 font-body text-[11px] uppercase tracking-[2px]" style={{ color: apagado }} suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[12px] tracking-[0.4px] text-ink-muted" />

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-4 font-body text-[13px] underline-offset-2 hover:underline"
          style={{ color: apagado }}
        >
          {store.telefone}
        </a>
      )}

      <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[11px] tracking-[0.6px] text-ink-muted">
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
