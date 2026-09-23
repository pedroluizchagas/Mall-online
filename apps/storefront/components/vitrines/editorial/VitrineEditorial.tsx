'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja } from '@mallevo/lib'

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
  AcaoEditorial,
  BadgeCard,
  DWELL_MS,
  EstilosEditorial,
  PontosDoHero,
  PrecoEditorial,
  Sobrelinha,
  VEU_HERO,
  descontoPct,
} from './editorial-ui'

/**
 * Vitrine editorial de moda — layout PRÓPRIO do arquétipo `editorial` para
 * lojas de moda/beleza/acessórios (docs/store-theme/02 §C e 05 "Vitrine
 * editorial"; referências: Veonn, Marion, Zaro). Port web de
 * apps/mobile-consumer/components/loja/LojaEditorial.tsx.
 *
 * DNA destilado da referência:
 * - hero full-bleed com overlay tipográfico (eyebrow + fio + headline 800 +
 *   CTA pill escura à direita) e carrossel em AUTOPLAY: 5s por cena, glide de
 *   560ms em que a foto anda 15% (parallax) e o texto se dissolve; pausa no
 *   toque/hover, swipe horizontal troca de cena;
 * - cards SEM chrome: foto retrato 3:4, nome e preço soltos embaixo, separados
 *   por whitespace — não por caixa; rail com PEEK do terceiro card;
 * - contraste tipográfico agressivo (título de seção pesado vs. "Ver tudo"
 *   cinza); segunda seção em diante em LISTA COMPACTA (thumb + nome + preço)
 *   em colunas de dois, para dar ritmo;
 * - identidade sem pills nem caixas; cor quase ausente.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a logo da
 * casa ocupa o lugar), a barra de menu inferior (navegação do app), a status
 * bar clara, a transição radial de saída e os FAVORITOS (coração no card e
 * na loja): eram estado local sem persistência, e no web não há conta —
 * omitidos em vez de fingir memória. A sacola vive no header (sem FAB —
 * regra das vitrines).
 */

const ID_LOJA = 'loja'
/** Cenas de produto no hero, além da campanha (RN: 3). */
const MAX_CENAS_PRODUTO = 3
/** Deslocamento mínimo (px) para um arrasto contar como swipe. */
const SWIPE_MIN_PX = 48

interface SlideEditorial {
  imagem: string | null
  eyebrow: string
  titulo: string
  subtitulo: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

export function VitrineEditorial({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const vazio = secoesComItens.length === 0

  // Título da seção de cada peça: é o eyebrow das cenas de produto do hero.
  const secaoDe = useMemo(() => {
    const mapa = new Map<string, string>()
    secoes.forEach((s) => s.produtos.forEach((p) => mapa.set(p.id, s.titulo)))
    return mapa
  }, [secoes])

  // Peças em destaque: as escolhidas pelo lojista (`conteudo.destaques`), na
  // ordem, entram na frente; o resto da primeira seção completa o rail.
  const primeiraSecao = secoesComItens[0]
  const rail = useMemo<ProdutoCatalogo[]>(() => {
    const todos = secoes.flatMap((s) => s.produtos)
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p)
    const vistos = new Set(escolhidos.map((p) => p.id))
    const resto = (primeiraSecao?.produtos ?? []).filter((p) => !vistos.has(p.id))
    return [...escolhidos, ...resto]
  }, [secoes, conteudo.destaques, primeiraSecao])

  // Cenas do hero: a campanha (o `conteudo.campanha` do lojista manda; sem
  // ele, a derivação da RN — banner + maior desconto do catálogo) e até três
  // peças com foto, na ordem do rail.
  const slides = useMemo<SlideEditorial[]>(() => {
    const todos = secoes.flatMap((s) => s.produtos)
    const maxDesc = Math.max(0, ...todos.map(descontoPct))
    const abertura: SlideEditorial = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? 'Nova coleção',
      titulo: campanha?.titulo ?? (maxDesc > 0 ? `${maxDesc}% OFF` : store.nome),
      subtitulo: campanha
        ? campanha.subtitulo ?? null
        : maxDesc > 0
          ? 'Em peças selecionadas da estação'
          : 'A nova temporada chegou',
      cta: campanha?.cta ?? 'Comprar agora',
      produto: null,
    }
    const pecas = rail
      .filter((p) => p.foto_url)
      .slice(0, MAX_CENAS_PRODUTO)
      .map(
        (p): SlideEditorial => ({
          imagem: p.foto_url,
          eyebrow: secaoDe.get(p.id) ?? 'Destaque',
          titulo: p.nome,
          subtitulo: formatarReais(precoFinalDe(p)),
          cta: 'Ver peça',
          produto: p,
        }),
      )
    return [abertura, ...pecas]
  }, [store.banner_url, store.nome, campanha, secoes, rail, secaoDe])

  // O hero em cena dirige o autoplay (só roda com o hero à vista) e o header
  // (transparente sobre a foto, canvas com fio depois dela) — os dois
  // limiares de `scrollY` da RN num só observer.
  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()

  const rolarParaLoja = useCallback(() => {
    document.getElementById(ID_LOJA)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  const headerClaro = !heroEmCena

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoEditorial — foto em tela cheia com
        // galeria e cartão de vidro) no lugar do ProductModal quando o
        // produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <EstilosEditorial />
            <CartPersistence />

            {/* Chrome: transparente sobre a foto → canvas com fio depois do
                hero; o nome da casa nasce junto com o fundo. `h-0` sticky:
                fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[58px] border-b border-line bg-canvas transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ opacity: headerClaro ? 1 : 0 }}
                  aria-hidden
                />
                <div className="relative flex h-[58px] items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]">
                  {store.logo_url ? (
                    <AcaoEditorial href="/" escuro={headerClaro} rotulo={`${store.nome} — início da loja`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                        style={{
                          boxShadow: headerClaro
                            ? '0 0 0 1px var(--line, #ECECEC)'
                            : '0 0 0 1px rgba(255,255,255,0.55)',
                        }}
                      />
                    </AcaoEditorial>
                  ) : (
                    <span className="h-10 w-10" aria-hidden />
                  )}

                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center font-display text-[16px] font-bold tracking-[-0.2px] text-ink transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ opacity: headerClaro ? 1 : 0 }}
                    aria-hidden={!headerClaro}
                    tabIndex={headerClaro ? 0 : -1}
                  >
                    {store.nome}
                  </a>

                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoEditorial
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

            {/* ── Hero full-bleed com carrossel de campanhas ── */}
            <HeroEditorial
              ref={heroRef}
              slides={slides}
              emCena={heroEmCena}
              aoAbrirProduto={aoAbrirProduto}
              aoComprar={rolarParaLoja}
            />

            {/* ── Identidade da loja: nome + meta, sem pills nem caixas ── */}
            <section id={ID_LOJA} className="scroll-mt-[calc(var(--inset-top,0px)+58px)] px-screen-x pb-1 pt-6" aria-label="Sobre a loja">
              <h1
                className="font-display font-extrabold tracking-[-0.5px] text-ink"
                style={{ fontSize: 'calc(24px * var(--type-factor, 1))', lineHeight: 1.2 }}
              >
                {store.nome}
              </h1>
              <MetaDaLoja store={store} />
              {store.descricao && (
                <p className="mt-[6px] line-clamp-2 font-body text-[14px] leading-5 text-ink-muted">{store.descricao}</p>
              )}
            </section>

            {vazio ? (
              <VazioEditorial store={store} />
            ) : (
              secoesComItens.map((secao, i) =>
                i === 0 ? (
                  <SecaoEditorial key={secao.chave} secao={secao} minimoParaVerTudo={2}>
                    {(expandida) => <RailVitrine produtos={rail} expandida={expandida} aoAbrirProduto={aoAbrirProduto} />}
                  </SecaoEditorial>
                ) : (
                  <SecaoEditorial key={secao.chave} secao={secao} minimoParaVerTudo={2}>
                    {(expandida) => (
                      <ListaCompacta produtos={secao.produtos} expandida={expandida} aoAbrirProduto={aoAbrirProduto} />
                    )}
                  </SecaoEditorial>
                ),
              )
            )}

            {/* ── Fecho: nome, relógio e os links da casa ── */}
            <FechoEditorial store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — o glide de 560ms com parallax da foto e texto que dissolve
// ─────────────────────────────────────────────────────────────

const HeroEditorial = forwardRef<
  HTMLElement,
  {
    slides: SlideEditorial[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoComprar: () => void
  }
>(function HeroEditorial({ slides, emCena, aoAbrirProduto, aoComprar }, ref) {
  const [ativo, setAtivo] = useState(0)
  // Quem acabou de sair de cena anima a saída (foto anda, texto dissolve)
  // enquanto a nova entra — o glide da RN em duas camadas.
  const [anterior, setAnterior] = useState<number | null>(null)
  // Sentido do movimento: avançar (foto entra pela direita) ou voltar.
  const [paraEsquerda, setParaEsquerda] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [reduzir, setReduzir] = useState(false)

  // "Reduzir movimento" congela o carrossel — como o AccessibilityInfo da RN.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzir(mq.matches)
    const aoMudar = (e: MediaQueryListEvent) => setReduzir(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  // A lista de cenas pode encolher (dados novos): nunca aponta pra fora dela.
  const indice = Math.min(ativo, slides.length - 1)

  const irPara = useCallback(
    (destino: number, sentidoEsquerda: boolean) => {
      if (slides.length <= 1) return
      const alvo = (destino + slides.length) % slides.length
      if (alvo === indice) return
      setAnterior(indice)
      setParaEsquerda(sentidoEsquerda)
      setAtivo(alvo)
    },
    [indice, slides.length],
  )

  // Autoplay: 5s por cena, só com o hero à vista, a aba visível e sem o
  // visitante pousado sobre ele. O loop é contínuo, sempre para frente.
  useEffect(() => {
    if (slides.length <= 1 || pausado || !emCena || reduzir) return
    const t = setTimeout(() => irPara(indice + 1, false), DWELL_MS)
    return () => clearTimeout(t)
  }, [indice, pausado, emCena, reduzir, slides.length, irPara])

  useEffect(() => {
    const aoVisibilidade = () => setPausado(document.hidden)
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  // Swipe horizontal troca de cena (o pager da RN); `touch-action: pan-y`
  // deixa a rolagem vertical da página intacta.
  const toqueX = useRef<number | null>(null)
  const aoPressionar = (e: ReactPointerEvent<HTMLElement>) => {
    toqueX.current = e.clientX
    setPausado(true)
  }
  const aoSoltar = (e: ReactPointerEvent<HTMLElement>) => {
    const inicio = toqueX.current
    toqueX.current = null
    if (inicio == null) return
    const dx = e.clientX - inicio
    if (Math.abs(dx) >= SWIPE_MIN_PX) irPara(dx < 0 ? indice + 1 : indice - 1, dx > 0)
  }

  return (
    <section
      ref={ref}
      className="relative h-[min(50svh,540px)] min-h-[360px] overflow-hidden bg-ink [touch-action:pan-y]"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => {
        toqueX.current = null
        setPausado(false)
      }}
      onPointerDown={aoPressionar}
      onPointerUp={aoSoltar}
      onPointerCancel={() => {
        toqueX.current = null
      }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da coleção"
    >
      {slides.map((slide, i) => {
        const emFoco = i === indice
        const saindo = i === anterior && !emFoco
        // A primeira cena nasce parada (é o LCP da página): só anima quem
        // entra depois de uma troca.
        const classeCena = reduzir
          ? ''
          : emFoco && anterior !== null
            ? 'edt-cena-entrar'
            : saindo
              ? 'edt-cena-sair'
              : ''
        return (
          <div
            key={i}
            className={`absolute inset-0 ${classeCena} ${paraEsquerda ? 'edt-esq' : ''}`}
            style={{
              opacity: emFoco ? 1 : 0,
              pointerEvents: emFoco ? 'auto' : 'none',
            }}
            aria-hidden={!emFoco}
          >
            {slide.imagem && (
              // Foto 30% mais larga que o quadro: o parallax de 15% nunca
              // mostra a borda. Hero nunca é lazy — a primeira cena é o LCP.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imagem}
                alt=""
                loading="eager"
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding="async"
                draggable={false}
                className="edt-foto absolute inset-y-0 left-[-15%] w-[130%] max-w-none object-cover"
              />
            )}
            <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

            {/* Overlay tipográfico editorial */}
            <div className="edt-texto absolute inset-x-0 bottom-16 flex flex-col gap-[6px] px-screen-x">
              <Sobrelinha className="mb-1" style={{ color: 'rgba(255,255,255,0.85)' }} corFio="rgba(255,255,255,0.55)">
                {slide.eyebrow}
              </Sobrelinha>
              {/* Headline 800 com tracking negativo — o peso é a sofisticação
                  deste arquétipo. O `h1` da página é o nome da loja, abaixo. */}
              <p
                className="line-clamp-2 w-full font-display font-extrabold tracking-[-0.8px] text-white"
                style={{
                  fontSize: 'calc(40px * var(--type-factor, 1))',
                  lineHeight: 'calc(44px * var(--type-factor, 1))',
                }}
              >
                {slide.titulo}
              </p>
              {slide.subtitulo && (
                <p className="truncate font-body text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {slide.subtitulo}
                </p>
              )}
            </div>

            {/* CTA pill escura, discreta, à direita — como na referência. */}
            <div className="edt-texto absolute bottom-[18px] right-screen-x">
              <button
                type="button"
                onClick={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoComprar())}
                className="rounded-pill bg-ink px-[18px] py-[10px] font-body text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 active:opacity-80"
              >
                {slide.cta}
              </button>
            </div>
          </div>
        )
      })}

      {slides.length > 1 && (
        <div className="absolute bottom-[22px] left-screen-x z-[2]">
          <PontosDoHero
            total={slides.length}
            ativo={indice}
            rotulos={slides.map((s) => s.titulo)}
            irPara={(i) => {
              irPara(i, i < indice)
              setPausado(true)
            }}
          />
        </div>
      )}
    </section>
  )
})

// ─────────────────────────────────────────────────────────────
// Meta da loja — tempo, entrega e o relógio vivo, numa linha só
// ─────────────────────────────────────────────────────────────

function MetaDaLoja({ store }: { store: VitrineWebProps['store'] }) {
  const partes = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null,
  ].filter((m): m is string => !!m)

  return (
    <div className="mt-[6px] flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[13px] font-medium text-ink-muted">
      {partes.map((parte, i) => (
        <span key={parte} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          {parte}
        </span>
      ))}
      {/* A RN imprime "Aberto" fixo; aqui só o que os horários dizem. */}
      <StatusAberto
        horarios={store.horarios}
        className={`font-body text-[13px] font-medium text-ink-muted ${partes.length > 0 ? "before:mr-3 before:content-['·']" : ''}`}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Seção — título pesado vs. "Ver tudo" cinza (o contraste da referência)
// ─────────────────────────────────────────────────────────────

function SecaoEditorial({
  secao,
  minimoParaVerTudo,
  children,
}: {
  secao: SecaoCatalogo
  /** Acima de quantas peças aparece o "Ver tudo". */
  minimoParaVerTudo: number
  children: (expandida: boolean) => ReactNode
}) {
  const [expandida, setExpandida] = useState(false)
  return (
    <section id={idDaSecao(secao.chave)} className="mt-[30px] scroll-mt-[calc(var(--inset-top,0px)+70px)]" aria-label={secao.titulo}>
      <div className="mb-[14px] flex items-baseline justify-between px-screen-x">
        <h2
          className="font-display font-bold tracking-[-0.4px] text-ink"
          style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.2 }}
        >
          {secao.titulo}
        </h2>
        {secao.produtos.length > minimoParaVerTudo && (
          <button
            type="button"
            onClick={() => setExpandida((v) => !v)}
            className="-my-2 py-2 pl-3 font-body text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            aria-expanded={expandida}
          >
            {expandida ? 'Ver menos' : 'Ver tudo'}
          </button>
        )}
      </div>
      {children(expandida)}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Rail de vitrine — cards retrato 3:4 sem chrome, com peek
// ─────────────────────────────────────────────────────────────

/** Vão entre cards (RN: 12). */
const GAP_RAIL = 12
/**
 * Dois cards inteiros + o peek do terceiro na borda (RN: coluna útil / 2.18).
 * Em CSS: a coluna útil é 100% menos os dois gutters.
 */
const LARGURA_CARD_RAIL = `calc((100% - 2 * var(--space-screen-x, 24px) - ${GAP_RAIL}px) / 2.18)`
const LARGURA_CARD_GRADE = `calc((100% - ${GAP_RAIL}px) / 2)`

function RailVitrine({
  produtos,
  expandida,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  expandida: boolean
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  if (expandida) {
    return (
      <ul className="m-0 flex list-none flex-wrap px-screen-x p-0" style={{ gap: GAP_RAIL }}>
        {produtos.map((p, idx) => (
          <li key={p.id} className="shrink-0" style={{ width: LARGURA_CARD_GRADE }}>
            <CardVitrine produto={p} primeiro={idx === 0} aoTocar={() => aoAbrirProduto(p)} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul
      className="m-0 flex list-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-screen-x px-screen-x p-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: GAP_RAIL }}
    >
      {produtos.map((p, idx) => (
        <li key={p.id} className="shrink-0 snap-start" style={{ width: LARGURA_CARD_RAIL }}>
          <CardVitrine produto={p} primeiro={idx === 0} aoTocar={() => aoAbrirProduto(p)} />
        </li>
      ))}
    </ul>
  )
}

/** Card sem chrome: foto 3:4, badge branca, nome e preço soltos embaixo. */
function CardVitrine({
  produto,
  primeiro,
  aoTocar,
}: {
  produto: ProdutoCatalogo
  primeiro: boolean
  aoTocar: () => void
}) {
  const desc = descontoPct(produto)
  const badge = desc > 0 ? `-${desc}%` : primeiro ? 'Novo' : null

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80"
    >
      <span className="relative block overflow-hidden rounded-lg bg-canvasAlt" style={{ aspectRatio: '3 / 4' }}>
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block h-full w-full object-cover"
          />
        )}
        {badge && <BadgeCard>{badge}</BadgeCard>}
      </span>
      <span className="mt-[10px] block truncate font-body text-[15px] font-semibold text-ink">{produto.nome}</span>
      <PrecoEditorial produto={produto} tamanho={14} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Lista compacta (thumb + nome + preço) — colunas de 2, com peek
// ─────────────────────────────────────────────────────────────

/** Vão entre colunas (RN: 16) e largura da coluna (RN: 52% da coluna útil). */
const GAP_COLUNAS = 16
const LARGURA_COLUNA = 'calc((100% - 2 * var(--space-screen-x, 24px)) * 0.52)'

function ListaCompacta({
  produtos,
  expandida,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  expandida: boolean
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  if (expandida) {
    return (
      <ul className="m-0 flex list-none flex-col gap-[18px] px-screen-x p-0">
        {produtos.map((p) => (
          <li key={p.id}>
            <ItemCompacto produto={p} aoTocar={() => aoAbrirProduto(p)} />
          </li>
        ))}
      </ul>
    )
  }

  // Chunk em colunas de 2 itens empilhados, roláveis na horizontal.
  const colunas: ProdutoCatalogo[][] = []
  for (let i = 0; i < produtos.length; i += 2) colunas.push(produtos.slice(i, i + 2))

  return (
    <div
      className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-screen-x px-screen-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: GAP_COLUNAS }}
    >
      {colunas.map((coluna, i) => (
        <ul key={i} className="m-0 flex shrink-0 snap-start list-none flex-col gap-[18px] p-0" style={{ width: LARGURA_COLUNA }}>
          {coluna.map((p) => (
            <li key={p.id}>
              <ItemCompacto produto={p} aoTocar={() => aoAbrirProduto(p)} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

function ItemCompacto({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-90 active:opacity-80"
    >
      <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-md bg-canvasAlt">
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block h-full w-full object-cover"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="line-clamp-2 font-body text-[14px] font-semibold leading-[18px] text-ink">{produto.nome}</span>
        <PrecoEditorial produto={produto} tamanho={13} />
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a coleção ainda por chegar, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioEditorial({ store }: { store: VitrineWebProps['store'] }) {
  return (
    <section className="mt-[30px] px-screen-x" aria-label="Coleção">
      <div className="border-y border-line py-12 text-center">
        <Sobrelinha className="items-center text-ink-muted" corFio="var(--line, #ECECEC)">
          Em breve
        </Sobrelinha>
        <p
          className="mt-5 font-display font-extrabold tracking-[-0.5px] text-ink"
          style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15 }}
        >
          A coleção ainda não chegou
        </p>
        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
          {store.nome} ainda não colocou peças na vitrine. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — nome pesado, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoEditorial({ store }: { store: VitrineWebProps['store'] }) {
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

  return (
    <footer className="mt-12 flex flex-col items-center px-screen-x pb-12 pt-10 text-center">
      {/* Fio curto em ink — a régua da referência antes do fecho. */}
      <div className="h-px w-9 bg-ink" aria-hidden />

      <p
        className="mt-6 max-w-full truncate font-display font-extrabold tracking-[-0.5px] text-ink"
        style={{ fontSize: 'calc(20px * var(--type-factor, 1))' }}
      >
        {store.nome}
      </p>

      {meta.length > 0 && (
        <p className="mt-3 font-body text-[11px] font-medium uppercase tracking-[2.2px] text-ink-muted" suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[12px] font-medium text-ink-muted" />

      {store.telefone && (
        <a href={`tel:${store.telefone}`} className="mt-4 font-body text-[13px] text-ink-muted underline-offset-2 hover:underline">
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
