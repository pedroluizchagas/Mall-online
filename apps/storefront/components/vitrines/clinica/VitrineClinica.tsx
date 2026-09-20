'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja, useCartStore } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  comCopiaDeLoop,
  idDaSecao,
  prefereMenosMovimento,
  useCarrossel,
  useHeroEmCena,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, ProdutoDetalhe, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoClinica,
  CardClinico,
  CtaFantasma,
  DWELL_MS,
  EstilosClinica,
  FLASH_MS,
  GLIDE_MS,
  IconeTraco,
  ItemConfianca,
  LinhasDoHero,
  MarcaDaCasa,
  Separador,
  VEU_HERO,
  descontoPct,
  exigeReceita,
  larg,
  precoFinalDe,
} from './clinica-ui'

/**
 * Vitrine clínica — layout PRÓPRIO do arquétipo `clinic` para farmácia,
 * saúde & bem-estar e veterinária (docs/store-theme/02 §G e 05 "Vitrine
 * clínica"). Port web de apps/mobile-consumer/components/loja/LojaClinica.tsx.
 *
 * Estrutura no padrão das vitrines-irmãs (hero de fotos com carrossel calmo
 * e CTA fantasma; ABAS de categoria escritas no topo; produtos em CARTÕES
 * QUADRADOS — tocar no cartão abre o produto), com as armas da farmácia:
 * - BUSCA FLUTUANTE sobre a borda do hero, filtrando em tempo real
 *   (nome/princípio ativo);
 * - faixa de CONFIANÇA e cartão de oferta com a foto do item em promoção;
 * - ADIÇÃO RÁPIDA no próprio cartão ("+" com pouso elástico) — item com
 *   `metadata.exige_receita` ganha selo RECEITA e abre o detalhe em vez de
 *   adicionar às cegas; item com variação/modificador idem;
 * - trilho horizontal com cartão "VER TODOS" no fim → expande em grade.
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), a barra de
 * menu inferior, a status bar e a transição radial. A sacola vive no header.
 */

const ID_CATALOGO = 'catalogo'
const ALTURA_HEADER = 58

interface SlideClinica {
  imagem: string | null
  eyebrow: string
  titulo: string
  legenda: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

/** Item COM variação/modificador nunca entra às cegas. */
function exigeEscolha(detalhe: ProdutoDetalhe | undefined): boolean {
  if (!detalhe) return false
  return detalhe.optionGroups.length + detalhe.modifierGroups.length > 0
}

export function VitrineClinica({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])

  const maxDesc = useMemo(() => Math.max(0, ...todos.map(descontoPct)), [todos])
  const produtoPromo = useMemo(
    () => (maxDesc > 0 ? todos.find((p) => descontoPct(p) === maxDesc && p.foto_url) ?? null : null),
    [todos, maxDesc],
  )

  // Cenas do hero: a saudação da casa (a campanha do lojista manda) e até
  // três itens com foto — `destaques` na frente; sem eles, a primeira seção.
  const slides = useMemo<SlideClinica[]>(() => {
    const abertura: SlideClinica = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? store.nome,
      titulo: campanha?.titulo ?? 'Como podemos cuidar de você hoje?',
      legenda:
        campanha?.subtitulo ??
        (campanha
          ? null
          : store.tempo_entrega != null
            ? `Entrega hoje, em até ${store.tempo_entrega} min`
            : 'Entrega rápida na sua porta'),
      cta: campanha?.cta ?? 'Ver produtos',
      produto: null,
    }
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const primeira = secoesComItens[0]
    const fonte = escolhidos.length > 0 ? escolhidos : (primeira?.produtos ?? []).filter((p) => p.foto_url)
    const eyebrowItem = escolhidos.length > 0 ? 'Em destaque' : primeira?.titulo ?? ''
    const destaque = fonte.slice(0, 3).map(
      (p): SlideClinica => ({
        imagem: p.foto_url,
        eyebrow: eyebrowItem,
        titulo: p.nome,
        legenda: formatarReais(precoFinalDe(p)),
        cta: 'Ver produto',
        produto: p,
      }),
    )
    return [abertura, ...destaque]
  }, [store.banner_url, store.nome, store.tempo_entrega, campanha, conteudo.destaques, todos, secoesComItens])

  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()
  const headerClaro = !heroEmCena

  // Busca local: nome e descrição (princípio ativo).
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const resultadoBusca = useMemo(() => {
    if (!termo) return []
    return todos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.descricao ?? '').toLowerCase().includes(termo))
  }, [todos, termo])

  // ── Adição rápida ──
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const [adicionados, setAdicionados] = useState<string[]>([])
  const timersFlash = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const timers = timersFlash.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const rolarParaCatalogo = useCallback(() => {
    document.getElementById(ID_CATALOGO)?.scrollIntoView({
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
        // TODO(2b): PDP própria (ProdutoClinico — foto em palco contido,
        // aviso de receita, linhas de entrega/procedência e barra de compra
        // fixa) no lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        // Item com receita, com variação ou com carrinho de outra loja
        // (a guarda vive no store + TrocaLojaDialog) nunca entra às cegas.
        const adicionarRapido = (p: ProdutoCatalogo) => {
          if (exigeReceita(p) || exigeEscolha(detalhes[p.id])) {
            aoAbrirProduto(p)
            return
          }
          adicionarItem(
            { product_id: p.id, nome: p.nome, preco: precoFinalDe(p), quantidade: 1, foto_url: p.foto_url ?? undefined },
            store.id,
            store.nome,
            store.taxa_entrega ?? 0,
          )
          if (useCartStore.getState().pendingTrocaLoja) return
          setAdicionados((atual) => (atual.includes(p.id) ? atual : [...atual, p.id]))
          clearTimeout(timersFlash.current.get(p.id))
          timersFlash.current.set(
            p.id,
            setTimeout(() => {
              timersFlash.current.delete(p.id)
              setAdicionados((atual) => atual.filter((x) => x !== p.id))
            }, FLASH_MS),
          )
        }

        const cartao = (p: ProdutoCatalogo, className?: string, style?: CSSProperties) => (
          <CardClinico
            key={p.id}
            produto={p}
            adicionado={adicionados.includes(p.id)}
            aoTocar={() => aoAbrirProduto(p)}
            aoAdicionar={() => adicionarRapido(p)}
            className={className}
            style={style}
          />
        )

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <EstilosClinica />
            <CartPersistence />

            {/* ── Header: transparente sobre o hero → surface com fio ── */}
            <div className="sticky top-0 z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 border-b border-line bg-surface transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ height: ALTURA_HEADER, opacity: headerClaro ? 1 : 0 }}
                  aria-hidden
                />
                <div
                  className="relative flex items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]"
                  style={{ height: ALTURA_HEADER }}
                >
                  <MarcaDaCasa nome={store.nome} logoUrl={store.logo_url} escuro={headerClaro} />
                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center font-display text-[16px] font-bold text-ink transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ opacity: headerClaro ? 1 : 0 }}
                    aria-hidden={!headerClaro}
                    tabIndex={headerClaro ? 0 : -1}
                  >
                    {store.nome}
                  </a>
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoClinica
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

            {/* ── Hero de fotos com carrossel calmo ── */}
            <HeroClinica ref={heroRef} slides={slides} emCena={heroEmCena} aoAbrirProduto={aoAbrirProduto} aoVerProdutos={rolarParaCatalogo} />

            {/* ── Busca flutuante sobre a borda do hero ── */}
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="relative z-[1] mx-screen-x -mt-[25px] flex h-[50px] items-center gap-[10px] rounded-md bg-surface px-[14px] shadow-medium"
            >
              <IconeTraco nome="search" tamanho={19} className="shrink-0 text-accent" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto ou princípio ativo"
                aria-label="Buscar produto ou princípio ativo"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent font-body text-[15px] text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
              />
              {busca.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  aria-label="Limpar busca"
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-soft transition-opacity hover:opacity-70"
                >
                  <IconeTraco nome="close-circle" tamanho={18} />
                </button>
              )}
            </form>

            {/* ── Faixa de confiança ── */}
            <ul className="mx-screen-x mt-[14px] flex rounded-lg bg-surface py-[14px] shadow-soft" aria-label="Garantias da loja">
              <ItemConfianca icone="truck" rotulo={store.tempo_entrega != null ? `Entrega ${store.tempo_entrega} min` : 'Entrega rápida'} />
              <Separador />
              <ItemConfianca icone="file" rotulo="Receita na entrega" />
              <Separador />
              <ItemConfianca icone="shield" rotulo="Compra segura" />
            </ul>

            {/* ── Oferta da semana ── */}
            {maxDesc > 0 && !termo && (
              <section
                className="relative mx-screen-x mt-[14px] flex items-center gap-[14px] overflow-hidden rounded-lg bg-accent p-4 text-accent-ink shadow-soft"
                aria-label="Oferta da semana"
              >
                <span className="absolute -bottom-[44px] -left-[34px] h-[130px] w-[130px] rounded-full bg-white/10" aria-hidden />
                <div className="relative flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="font-body text-[10px] font-semibold uppercase tracking-[2px] opacity-80">Ofertas da semana</p>
                  <p className="font-display text-[24px] font-bold leading-tight">Até {maxDesc}% off</p>
                  <p className="font-body text-[12px] font-medium opacity-85">em itens selecionados</p>
                  {produtoPromo && (
                    <button
                      type="button"
                      onClick={() => aoAbrirProduto(produtoPromo)}
                      className="mt-2 self-start rounded-pill bg-white px-[14px] py-2 font-body text-[12.5px] font-bold text-accent transition-opacity hover:opacity-90"
                    >
                      Ver oferta
                    </button>
                  )}
                </div>
                {produtoPromo?.foto_url && (
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={produtoPromo.foto_url} alt="" loading="lazy" decoding="async" className="h-[92px] w-[92px] rounded-md object-cover" />
                    <span className="absolute -right-[6px] -top-[6px] rounded-pill bg-danger px-2 py-[3px] font-body text-[10px] font-extrabold text-white">
                      -{maxDesc}%
                    </span>
                  </div>
                )}
              </section>
            )}

            {termo.length > 0 ? (
              resultadoBusca.length > 0 ? (
                <section className="mt-5 px-screen-x" aria-live="polite" aria-label="Resultados da busca">
                  <p className="mb-3 font-body text-[14px] font-medium text-ink-muted">
                    {resultadoBusca.length} {resultadoBusca.length === 1 ? 'resultado' : 'resultados'} para “{busca.trim()}”
                  </p>
                  <div className="grid grid-cols-2 gap-3">{resultadoBusca.map((p) => cartao(p))}</div>
                </section>
              ) : (
                <section className="flex flex-col items-center gap-[10px] pt-12 text-center" aria-live="polite">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
                    <IconeTraco nome="search" tamanho={26} />
                  </span>
                  <p className="font-body text-[15px] font-semibold text-ink">Nada encontrado para “{busca.trim()}”</p>
                  <p className="font-body text-[13px] text-ink-muted">Tente pelo nome do produto ou princípio ativo</p>
                </section>
              )
            ) : todos.length === 0 ? (
              <VazioClinico nome={store.nome} />
            ) : (
              <CatalogoClinico secoes={secoesComItens} cartao={cartao} />
            )}

            <FechoClinico store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — carrossel calmo com indicadores de linha no topo
// ─────────────────────────────────────────────────────────────

const HeroClinica = forwardRef<
  HTMLElement,
  {
    slides: SlideClinica[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerProdutos: () => void
  }
>(function HeroClinica({ slides, emCena, aoAbrirProduto, aoVerProdutos }, ref) {
  const n = slides.length
  const { pos, indice, reduzir, semTransicao, transicao, irPara, handlers } = useCarrossel({
    total: n,
    emCena,
    dwellMs: DWELL_MS,
    glideMs: GLIDE_MS,
  })
  const slidesRender = comCopiaDeLoop(slides)

  return (
    <section
      ref={ref}
      className="relative h-[46svh] max-h-[520px] min-h-[340px] select-none overflow-hidden bg-canvasAlt"
      style={{ touchAction: 'pan-y' }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da casa"
      {...handlers}
    >
      <div className="flex h-full" style={{ transform: `translateX(-${pos * 100}%)`, transition: transicao }}>
        {slidesRender.map((slide, i) => {
          const emFoco = i === pos
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
                    transition: transicao,
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <div
                className="absolute inset-x-0 bottom-[44px] flex flex-col items-start gap-2 px-screen-x"
                style={{
                  opacity: emFoco ? 1 : 0,
                  visibility: emFoco ? 'visible' : 'hidden',
                  transition: semTransicao ? 'none' : `opacity ${GLIDE_MS}ms ease, visibility 0s linear ${emFoco ? 0 : GLIDE_MS}ms`,
                  pointerEvents: emFoco ? 'auto' : 'none',
                }}
              >
                <p className="font-body text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {slide.eyebrow}
                </p>
                {i === 0 ? (
                  <h1
                    className="line-clamp-2 max-w-[310px] font-display font-bold text-white"
                    style={{ fontSize: 'calc(25px * var(--type-factor, 1))', lineHeight: 'calc(32px * var(--type-factor, 1))' }}
                  >
                    {slide.titulo}
                  </h1>
                ) : (
                  <p
                    className="line-clamp-2 max-w-[310px] font-display font-bold text-white"
                    style={{ fontSize: 'calc(25px * var(--type-factor, 1))', lineHeight: 'calc(32px * var(--type-factor, 1))' }}
                  >
                    {slide.titulo}
                  </p>
                )}
                {slide.legenda && (
                  <p className="truncate font-body text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {slide.legenda}
                  </p>
                )}
                <CtaFantasma className="mt-1" aoTocar={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoVerProdutos())}>
                  {slide.cta}
                </CtaFantasma>
              </div>
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className="absolute inset-x-0 z-[2]" style={{ top: ALTURA_HEADER + 2 }}>
          <LinhasDoHero total={n} ativo={indice} rotulos={slides.map((s) => s.titulo)} irPara={irPara} />
        </div>
      )}
    </section>
  )
})

// ─────────────────────────────────────────────────────────────
// Catálogo — abas escritas + trilho com "Ver todos" / grade
// ─────────────────────────────────────────────────────────────

function CatalogoClinico({
  secoes,
  cartao,
}: {
  secoes: SecaoCatalogo[]
  cartao: (p: ProdutoCatalogo, className?: string, style?: CSSProperties) => ReactNode
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
  const idPainel = idDaSecao(secaoAtiva.chave)

  return (
    <section id={ID_CATALOGO} aria-label="Catálogo" style={{ scrollMarginTop: ALTURA_HEADER }}>
      <div className="mb-[14px] mt-[26px] flex items-baseline">
        <div
          role="tablist"
          aria-label="Seções"
          className="flex min-w-0 flex-1 items-baseline gap-[18px] overflow-x-auto px-screen-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`shrink-0 whitespace-nowrap py-2 font-display transition-colors ${ativa ? 'font-bold text-ink' : 'font-normal text-ink-muted hover:text-ink'}`}
                style={{ fontSize: 'calc(19px * var(--type-factor, 1))' }}
              >
                {s.titulo}
              </button>
            )
          })}
        </div>
        {expandida && (
          <button
            type="button"
            onClick={() => setExpandida(false)}
            aria-expanded
            aria-controls={idPainel}
            className="shrink-0 px-screen-x py-2 font-body text-[13.5px] font-semibold text-accent"
          >
            Ver menos
          </button>
        )}
      </div>

      {expandida ? (
        <div id={idPainel} role="tabpanel" aria-labelledby={`aba-${secaoAtiva.chave}`} className="grid grid-cols-2 gap-3 px-screen-x">
          {secaoAtiva.produtos.map((p) => cartao(p))}
        </div>
      ) : (
        <div
          id={idPainel}
          role="tabpanel"
          aria-labelledby={`aba-${secaoAtiva.chave}`}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-screen-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {secaoAtiva.produtos.map((p) => cartao(p, 'shrink-0 snap-start', { width: larg(0.44) }))}
          {secaoAtiva.produtos.length > 2 && (
            <button
              type="button"
              onClick={() => setExpandida(true)}
              aria-expanded={false}
              aria-controls={idPainel}
              className="flex shrink-0 snap-start flex-col items-center justify-center gap-[10px] rounded-lg bg-accent-soft text-accent transition-opacity hover:opacity-90"
              style={{ width: larg(0.36), height: larg(0.44) }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-ink" aria-hidden>
                <IconeTraco nome="chevron-right" tamanho={20} espessura={2.4} />
              </span>
              <span className="text-center font-body text-[13px] font-bold leading-tight">
                Ver todos
                <br />({secaoAtiva.produtos.length})
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function VazioClinico({ nome }: { nome: string }) {
  return (
    <section id={ID_CATALOGO} className="px-screen-x pt-[26px]" aria-label="Catálogo">
      <div className="rounded-lg bg-surface px-6 py-12 text-center shadow-soft">
        <p className="font-display text-[20px] font-bold text-ink">As prateleiras ainda estão sendo arrumadas</p>
        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
          {nome} ainda não colocou produtos na vitrine. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — nome, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoClinico({ store }: { store: VitrineWebProps['store'] }) {
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 30_000)
    return () => clearInterval(id)
  }, [])
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const meta = [
    hoje ? `Hoje ${formatarHorario(hoje)}` : null,
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : store.taxa_entrega != null ? `Entrega ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)

  return (
    <footer className="mt-12 px-screen-x pb-12 pt-8">
      <div className="rounded-lg bg-surface p-5 shadow-soft">
        <p className="truncate font-display text-[18px] font-bold text-ink">{store.nome}</p>
        {meta.length > 0 && (
          <p className="mt-2 font-body text-[13px] text-ink-muted" suppressHydrationWarning>
            {meta.join('  ·  ')}
          </p>
        )}
        <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[13px] font-semibold text-ink-muted" />
        {store.telefone && (
          <a href={`tel:${store.telefone}`} className="mt-3 inline-block font-body text-[13px] font-semibold text-accent underline-offset-2 hover:underline">
            {store.telefone}
          </a>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 font-body text-[12px] text-ink-muted">
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
