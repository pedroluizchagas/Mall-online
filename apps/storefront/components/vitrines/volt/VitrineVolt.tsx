'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TransitionEvent,
} from 'react'
import {
  formatarHorario,
  horarioDeHoje,
  lerMetadataProduto,
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
  useReduzirMovimento,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoVolt,
  CURVA_GLIDE,
  ChipCard,
  DWELL_MS,
  DotsVolt,
  FaixaAnuncio,
  GLIDE_MS,
  IconeTraco,
  LinkSeta,
  PillBranca,
  TickerVolt,
  VEU_HERO,
  WordmarkVolt,
  type BeneficioVolt,
} from './volt-ui'

/**
 * Vitrine volt — layout PRÓPRIO do arquétipo `volt` para fitness, esporte e
 * suplementos (docs/store-theme/02 §D3 e 05 "Vitrine volt"; referência:
 * Nivest). Port web de apps/mobile-consumer/components/loja/LojaVolt.tsx.
 *
 * DNA destilado da referência:
 * - FAIXA-ANÚNCIO fixa no topo (oferta agregada) + header branco com
 *   wordmark pesado e sacola com contador no accent;
 * - TICKER MARQUEE no accent rolando benefícios em loop contínuo;
 * - hero com caps pesadíssimas e CTA em PILL BRANCA — o carrossel mais
 *   RÁPIDO do sistema (glide 300ms, dwell 3,8s), com parallax na foto;
 * - grid 2-col com palco cinza-claro, chip "Popular" preto / "-N%" vermelho,
 *   preço promocional em vermelho e links de seção com prefixo "↳".
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a logo da
 * casa ocupa o slot), a barra de menu inferior (navegação do app), a virada
 * da status bar, a transição de saída radial e o CORAÇÃO de favorito (sem
 * persistência no web, o gesto seria mentira — o círculo saiu junto). A
 * sacola vive no header (sem FAB — regra das vitrines). O ticker rola com a
 * página: só faixa + header ficam grudados, para não roubar um sexto da tela
 * do celular.
 *
 * Tipografia: a pele volt já traz Archivo 800 no display e Inter no corpo —
 * a mesma voz da RN, então não há fonte de DNA a carregar.
 */

const ID_CATALOGO = 'catalogo'
/** Altura do bloco grudado (faixa 27 + header 52) — folga das âncoras. */
const ALTURA_CHROME = 84

interface SlideVolt {
  imagem: string | null
  titulo: string
  legenda: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

/**
 * Foto do PALCO cinza: o `recorte` (PNG de fundo transparente) quando o
 * lojista subiu um → produto "solto" em `contain`, o cutout da referência;
 * foto comum cobre o quadro.
 */
function fotoPalco(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/** Frases da loja: 1ª vira headline do hero, o resto vira apoio (a derivação da RN). */
function frasesDaLoja(nome: string, descricao: string | null): [string, string | null] {
  const d = (descricao ?? '').trim()
  if (!d) return [nome, null]
  const ponto = d.indexOf('.')
  if (ponto < 0) return [d, null]
  return [d.slice(0, ponto), d.slice(ponto + 1).trim() || null]
}

/**
 * Benefícios do ticker: os fixos da RN, com o que a loja realmente oferece
 * no lugar das promessas genéricas (tempo/grátis de entrega, pix, cartão).
 */
function beneficiosDaLoja(store: VitrineWebProps['store']): BeneficioVolt[] {
  const lista: BeneficioVolt[] = [{ icone: 'shield', rotulo: 'CHECKOUT SEGURO' }]
  if (store.taxa_entrega === 0) lista.push({ icone: 'truck', rotulo: 'ENTREGA GRÁTIS' })
  else if (store.tempo_entrega != null) lista.push({ icone: 'truck', rotulo: `ENTREGA EM ${store.tempo_entrega} MIN` })
  else lista.push({ icone: 'truck', rotulo: 'ENTREGA EXPRESSA' })
  if (store.aceita_pix) lista.push({ icone: 'check-circle', rotulo: 'PIX NA HORA' })
  if (store.aceita_cartao_online) lista.push({ icone: 'card', rotulo: 'CARTÃO ONLINE' })
  lista.push({ icone: 'spark', rotulo: 'DROPS SEMANAIS' })
  return lista
}

export function VitrineVolt({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const vazio = secoesComItens.length === 0

  // Oferta agregada da faixa-anúncio: o eyebrow da campanha manda; sem ele,
  // o maior desconto do catálogo.
  const maxDesc = useMemo(
    () => Math.max(0, ...secoes.flatMap((s) => s.produtos).map(descontoPct)),
    [secoes],
  )
  const anuncio =
    campanha?.eyebrow ??
    (maxDesc > 0 ? `Descontos de até ${maxDesc}% esta semana` : 'Bem-vindo ao time · novidades toda semana')

  // Cenas do hero: a campanha da casa e até três destaques com foto — os que
  // o lojista escolheu (`conteudo.destaques`) na frente, a 1ª seção completa.
  const slides = useMemo<SlideVolt[]>(() => {
    const [fraseUm, fraseDois] = frasesDaLoja(store.nome, store.descricao)
    const abertura: SlideVolt = {
      imagem: store.banner_url ?? null,
      titulo: campanha?.titulo ?? fraseUm,
      legenda: campanha?.subtitulo ?? (campanha?.titulo ? store.descricao : fraseDois),
      cta: campanha?.cta ?? 'Ver tudo',
      produto: null,
    }
    const todos = secoes.flatMap((s) => s.produtos).filter((p) => p.foto_url)
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p)
    const daPrimeira = (secoes[0]?.produtos ?? []).filter((p) => p.foto_url && !escolhidos.includes(p))
    const destaque = [...escolhidos, ...daPrimeira].slice(0, 3).map(
      (p): SlideVolt => ({
        imagem: p.foto_url,
        titulo: p.nome,
        legenda: formatarReais(precoFinalDe(p)),
        cta: 'Ver produto',
        produto: p,
      }),
    )
    return [abertura, ...destaque]
  }, [store.nome, store.descricao, store.banner_url, campanha, conteudo.destaques, secoes])

  const beneficios = useMemo(() => beneficiosDaLoja(store), [store])

  // O hero em cena dirige o autoplay (só roda com o hero à vista) — o
  // `depoisDoHero` da RN num observer.
  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()

  const rolarPara = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
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
        // TODO(2b): PDP própria (ProdutoVolt — pill preta de largura cheia que
        // pisca no accent ao confirmar) no lugar do ProductModal quando o
        // produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Bloco grudado: faixa-anúncio + header branco ──
                Opaco, então ocupa o fluxo (não é o `h-0` das irmãs que
                flutuam sobre a foto). */}
            <div className="sticky top-[var(--inset-top,0px)] z-30">
              <FaixaAnuncio>{anuncio}</FaixaAnuncio>
              <header className="flex h-[52px] items-center border-b border-line bg-surface px-[calc(var(--space-screen-x,24px)-8px)]">
                <AcaoVolt href="/" rotulo={`${store.nome} — início da loja`}>
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt="" className="h-8 w-8 rounded-[10px] object-cover" />
                  ) : (
                    <IconeTraco nome="bolt" tamanho={22} />
                  )}
                </AcaoVolt>
                <h1 className="m-0 flex min-w-0 flex-1 justify-center px-2">
                  <WordmarkVolt nome={store.nome} tamanho={19} className="text-center text-ink" />
                </h1>
                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <AcaoVolt
                      icone="bag"
                      contador={totalItens}
                      rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                      aoTocar={abrirSacola}
                    />
                  )}
                </Sacola>
              </header>
            </div>

            {/* ── Ticker: benefícios rolando no accent ── */}
            <TickerVolt beneficios={beneficios} />

            {/* ── Hero: caps pesadas + pill branca, o glide mais rápido ── */}
            <HeroVolt
              ref={heroRef}
              slides={slides}
              emCena={heroEmCena}
              aoAbrirProduto={aoAbrirProduto}
              aoVerTudo={() => rolarPara(ID_CATALOGO)}
            />

            {/* ── Seções: caps pesadas + "↳ Ver tudo" + grid com chips ── */}
            <section id={ID_CATALOGO} className="pb-12" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${ALTURA_CHROME}px)` }} aria-label="Catálogo">
              {vazio ? (
                <VazioVolt />
              ) : (
                secoesComItens.map((secao) => (
                  <SecaoVolt key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                ))
              )}
            </section>

            {/* ── Fecho preto: wordmark, meta, relógio e os links da casa ── */}
            <FechoVolt store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — trilho de cenas com glide de 300ms e parallax na foto
// ─────────────────────────────────────────────────────────────

const HeroVolt = forwardRef<
  HTMLElement,
  {
    slides: SlideVolt[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerTudo: () => void
  }
>(function HeroVolt({ slides, emCena, aoAbrirProduto, aoVerTudo }, ref) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  // `indice` anda de 0 até `slides.length` (a cópia da 1ª cena no fim do
  // trilho, como na RN); ao pousar nela, volta a 0 sem animar.
  const [indice, setIndice] = useState(0)
  const [animar, setAnimar] = useState(true)
  const [pausado, setPausado] = useState(false)
  const reduzir = useReduzirMovimento()
  const toqueX = useRef<number | null>(null)

  const total = slides.length
  const comLoop = total > 1
  const slidesRender = comLoop ? [...slides, slides[0]] : slides
  const ativo = total > 0 ? indice % total : 0

  const irPara = useCallback((prox: number) => {
    setAnimar(true)
    setIndice(prox)
  }, [])

  // Autoplay: 3,8s por cena, só com o hero à vista, a aba visível e sem o
  // visitante pousado sobre ele.
  useEffect(() => {
    if (!comLoop || pausado || !emCena || reduzir) return
    const t = setTimeout(() => irPara(indice + 1), DWELL_MS)
    return () => clearTimeout(t)
  }, [indice, pausado, emCena, reduzir, comLoop, irPara])

  useEffect(() => {
    const aoVisibilidade = () => setPausado(document.hidden)
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  // Pousou na cópia do fim → salta pro início sem transição.
  const aoFimDaTransicao = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (indice >= total) {
      setAnimar(false)
      setIndice(0)
    }
  }
  // Sem transição, o salto já foi pintado: religa a animação forçando o
  // reflow antes (senão o browser animaria a volta).
  useEffect(() => {
    if (animar) return
    void trilhoRef.current?.offsetWidth
    setAnimar(true)
  }, [animar])

  // Sob "reduzir movimento" não há transitionend: o salto acontece direto.
  useEffect(() => {
    if (reduzir && indice >= total && total > 0) setIndice(0)
  }, [reduzir, indice, total])

  // Arrasto horizontal: 40px decidem a cena (o `pagingEnabled` da RN).
  const aoPontearBaixo = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    toqueX.current = e.clientX
  }
  const aoPontearCima = (e: PointerEvent<HTMLElement>) => {
    const inicio = toqueX.current
    toqueX.current = null
    if (inicio == null || !comLoop) return
    const dx = e.clientX - inicio
    if (Math.abs(dx) < 40) return
    if (dx < 0) irPara(indice >= total ? 1 : indice + 1)
    else irPara(ativo === 0 ? total - 1 : ativo - 1)
  }

  const transicao = animar && !reduzir ? `transform ${GLIDE_MS}ms ${CURVA_GLIDE}` : 'none'

  return (
    <header
      ref={ref}
      className="relative h-[44svh] max-h-[440px] min-h-[300px] overflow-hidden bg-ink [touch-action:pan-y]"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onPointerDown={aoPontearBaixo}
      onPointerUp={aoPontearCima}
      onPointerCancel={() => (toqueX.current = null)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da casa"
    >
      <div
        ref={trilhoRef}
        className="flex h-full"
        style={{
          width: `${slidesRender.length * 100}%`,
          transform: `translateX(-${(indice * 100) / slidesRender.length}%)`,
          transition: transicao,
        }}
        onTransitionEnd={aoFimDaTransicao}
      >
        {slidesRender.map((slide, i) => {
          const emFoco = i === indice || (indice >= total && i === 0)
          // Parallax: a foto (120% do quadro) desloca 10% do quadro contra a
          // direção do glide — o interpolate da RN, aqui em transição CSS.
          const direcao = Math.max(-1, Math.min(1, indice - i))
          return (
            <div
              key={i}
              className="relative h-full shrink-0 overflow-hidden"
              style={{ width: `${100 / slidesRender.length}%` }}
              aria-hidden={!emFoco}
            >
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
                    transform: reduzir ? undefined : `translateX(${direcao * 8.33}%)`,
                    transition: transicao,
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <div
                className="absolute inset-x-0 bottom-5 flex flex-col items-start gap-2 px-screen-x"
                style={{
                  opacity: emFoco || reduzir ? 1 : 0,
                  transition: reduzir ? 'none' : `opacity ${GLIDE_MS}ms ${CURVA_GLIDE}`,
                }}
              >
                <p
                  className="m-0 line-clamp-2 w-full pr-[72px] font-display font-extrabold uppercase text-white"
                  style={{
                    fontSize: 'calc(34px * var(--type-factor, 1))',
                    lineHeight: 'calc(38px * var(--type-factor, 1))',
                    letterSpacing: -0.5,
                  }}
                >
                  {slide.titulo}
                </p>
                {slide.legenda && (
                  <p className="m-0 w-full truncate font-body text-[14px] font-medium leading-5 text-white/90">
                    {slide.legenda}
                  </p>
                )}
                <PillBranca
                  className="mt-1"
                  tabIndex={emFoco ? 0 : -1}
                  aoTocar={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoVerTudo())}
                >
                  {slide.cta}
                </PillBranca>
              </div>
            </div>
          )
        })}
      </div>

      {comLoop && (
        <div className="absolute bottom-[22px] right-screen-x z-[2]">
          <DotsVolt
            total={total}
            ativo={ativo}
            rotulos={slides.map((s) => s.titulo)}
            irPara={(i) => {
              irPara(i)
              setPausado(true)
            }}
          />
        </div>
      )}
    </header>
  )
})

// ─────────────────────────────────────────────────────────────
// Seção — caps pesadas, "↳ Ver tudo" e grid 2-col com chips
// ─────────────────────────────────────────────────────────────

const PREVIA = 4

function SecaoVolt({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const [expandida, setExpandida] = useState(false)
  const id = idDaSecao(secao.chave)
  const idGrade = `${id}-grade`
  const temMais = secao.produtos.length > PREVIA
  const visiveis = expandida ? secao.produtos : secao.produtos.slice(0, PREVIA)

  const alternar = () => {
    const proxima = !expandida
    setExpandida(proxima)
    // "Ver menos" no pé de uma grade longa devolve o visitante ao topo da
    // seção — senão ele fica olhando o vazio que sobrou.
    if (!proxima) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top < 0) {
        el.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div id={id} className="mt-[30px]" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${ALTURA_CHROME}px)` }}>
      <div className="flex flex-col gap-1 px-screen-x">
        <h2
          className="m-0 truncate font-display font-extrabold uppercase text-ink"
          style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15, letterSpacing: -0.5 }}
        >
          {secao.titulo}
        </h2>
        {temMais && (
          <LinkSeta aoTocar={alternar} expandido={expandida} controla={idGrade}>
            {expandida ? 'Ver menos' : `Ver tudo (${secao.produtos.length})`}
          </LinkSeta>
        )}
      </div>

      <ul id={idGrade} className="m-0 mt-[14px] grid list-none grid-cols-2 gap-3 px-screen-x">
        {visiveis.map((p, idx) => (
          <li key={p.id}>
            <CardVolt produto={p} destaque={idx === 0 && !expandida} aoTocar={() => aoAbrirProduto(p)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Card do palco cinza: foto quadrada, chip, nome e preço (promo em vermelho). */
function CardVolt({
  produto,
  destaque,
  aoTocar,
}: {
  produto: ProdutoCatalogo
  destaque: boolean
  aoTocar: () => void
}) {
  const foto = fotoPalco(produto)
  const desc = descontoPct(produto)
  const promo = desc > 0

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="flex w-full flex-col text-left transition-opacity hover:opacity-90 active:opacity-75"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-canvasAlt">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto.src}
            alt=""
            loading="lazy"
            decoding="async"
            className={`h-full w-full ${foto.recorte ? 'object-contain p-3' : 'object-cover'}`}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-soft">
            <IconeTraco nome="bolt" tamanho={36} espessura={1.8} />
          </span>
        )}
        <ChipCard desconto={desc} popular={destaque} />
      </span>

      <span className="mt-[10px] block w-full truncate font-body text-[15px] font-semibold leading-5 text-ink">
        {produto.nome}
      </span>
      <span className="mt-[2px] flex items-baseline gap-[7px]">
        <span className={`font-body text-[14px] leading-5 ${promo ? 'font-bold text-danger' : 'font-medium text-ink'}`}>
          {formatarReais(precoFinalDe(produto))}
        </span>
        {promo && (
          <span className="font-body text-[12px] leading-4 text-ink-soft line-through">{formatarReais(produto.preco)}</span>
        )}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a loja ainda sem catálogo, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioVolt() {
  return (
    <div className="mt-[30px] flex flex-col items-center px-screen-x text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-ink">
        <IconeTraco nome="bolt" tamanho={30} espessura={2.2} />
      </span>
      <p
        className="m-0 mt-5 font-display font-extrabold uppercase text-ink"
        style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15, letterSpacing: -0.5 }}
      >
        Aquecendo
      </p>
      <p className="m-0 mt-3 max-w-[34ch] font-body text-[15px] font-medium leading-[23px] text-ink-muted">
        Esta loja ainda não colocou os produtos na vitrine. Volte em breve — o drop está chegando.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — preto, wordmark, meta, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoVolt({ store }: { store: VitrineWebProps['store'] }) {
  // Hora de parede da LOJA. Nasce vazia para o servidor (UTC) e o cliente
  // não divergirem na hidratação.
  const agora = useRelogioDaLoja(60_000)
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())

  const partes = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null,
  ].filter((m): m is string => !!m)

  return (
    <footer className="flex flex-col items-center gap-[10px] bg-ink px-screen-x pb-10 pt-11 text-center text-white">
      <WordmarkVolt nome={store.nome} tamanho={24} className="text-center uppercase text-white" />

      <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 font-body text-[12.5px] font-medium text-white/70">
        {partes.map((parte, i) => (
          <span key={parte} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>·</span>}
            {parte}
          </span>
        ))}
        <StatusAberto
          horarios={store.horarios}
          className={`text-[12.5px] font-medium text-white/70 ${partes.length > 0 ? "before:mr-0.5 before:content-['·']" : ''}`}
        />
      </p>

      {hoje && (
        <p className="m-0 font-body text-[12px] font-medium text-white/60" suppressHydrationWarning>
          Hoje {formatarHorario(hoje)}
        </p>
      )}

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="font-body text-[13px] font-semibold text-white/80 underline-offset-2 hover:underline"
        >
          {store.telefone}
        </a>
      )}

      <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 font-body text-[11px] font-medium uppercase tracking-[1px] text-white/60">
        <a href="https://mallevo.com.br" className="font-bold text-accent transition-opacity hover:opacity-80">
          Uma loja do Mallevo
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="transition-colors hover:text-white">
            Termos
          </a>
          <a href="/privacidade" className="transition-colors hover:text-white">
            Privacidade
          </a>
        </span>
      </div>
    </footer>
  )
}
