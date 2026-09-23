'use client'

import { forwardRef, useCallback, useMemo, useRef, useState } from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  comCopiaDeLoop,
  idDaSecao,
  precoFinalDe,
  prefereMenosMovimento,
  useCarrossel,
  useHeroEmCena,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoArtesa,
  CREME,
  CREME_APAGADO,
  CardArtesa,
  CtaContorno,
  DWELL_MS,
  EtiquetaTipo,
  GLIDE_MS,
  IconeTraco,
  MarcaDaCasa,
  PilulasDoHero,
  PrecoArtesa,
  SecaoNumerada,
  VEU_BANDA,
  VEU_HERO,
  tipoDe,
} from './artesa-ui'

/**
 * Vitrine artesã — layout PRÓPRIO do arquétipo `artisan` para casa &
 * decoração e flores (docs/store-theme/02 §F e 05 "Vitrine artesã";
 * referência-âncora: Graft). Port web de
 * apps/mobile-consumer/components/loja/LojaArtesa.tsx.
 *
 * DNA destilado da referência:
 * - hero full-bleed com o NOME gigante em sans arredondada e CTA de contorno
 *   em pill; header que vira BARRA ESPRESSO (accent) ao rolar;
 * - SEÇÕES NUMERADAS: cada bloco fecha com fio + "0N" à esquerda e o rótulo
 *   à direita — o ritmo de portfólio da referência;
 * - statement em DOIS TONS (o manifesto do lojista ou a descrição: 1ª frase
 *   em ink, resto em accent) e "O que fazemos" em BANDAS de foto de borda a
 *   borda, uma por tipo de peça;
 * - peças autorais em carrossel de UM cartão retrato por vez com SETAS finas;
 * - demais seções em grid de cartões arredondados com chip-etiqueta branco;
 * - fotos da casa (`conteudo.galeria_casa`) numa seção numerada própria.
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), a barra de
 * menu inferior, a status bar e a transição radial; o "Aberto" literal virou
 * o relógio vivo (`StatusAberto`). A sacola vive no header.
 */

const ID_ATELIE = 'atelie'
const ALTURA_HEADER = 58
/** Bandas: mínimo para a seção valer (RN: 3), teto 6. */
const MIN_BANDAS = 3
const MAX_BANDAS = 6

interface SlideArtesa {
  imagem: string | null
  titulo: string
  apoio: string
  cta: string
  produto: ProdutoCatalogo | null
}

/** Statement em dois tons: 1ª frase em ink, o resto em accent. */
function repartirEmDoisTons(texto: string | null | undefined): [string, string] {
  const d = (texto ?? '').trim()
  if (!d) return ['', '']
  const ponto = d.indexOf('.')
  if (ponto < 0 || ponto === d.length - 1) return [d, '']
  return [d.slice(0, ponto + 1), d.slice(ponto + 1).trim()]
}

export function VitrineArtesa({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])

  // Cenas do hero: o nome da casa (ou a campanha) e até três peças com foto —
  // `destaques` na frente; sem eles, a primeira seção (a derivação da RN).
  const slides = useMemo<SlideArtesa[]>(() => {
    const abertura: SlideArtesa = {
      imagem: store.banner_url ?? null,
      titulo: campanha?.titulo ?? store.nome,
      apoio: campanha?.subtitulo ?? (campanha?.eyebrow ?? 'Conheça nosso trabalho'),
      cta: campanha?.cta ?? 'Ver peças',
      produto: null,
    }
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const fonte = escolhidos.length > 0 ? escolhidos : (secoesComItens[0]?.produtos ?? []).filter((p) => p.foto_url)
    const pecas = fonte.slice(0, 3).map(
      (p): SlideArtesa => ({
        imagem: p.foto_url,
        titulo: p.nome,
        apoio: formatarReais(precoFinalDe(p)),
        cta: 'Ver peça',
        produto: p,
      }),
    )
    return [abertura, ...pecas]
  }, [store.banner_url, store.nome, campanha, conteudo.destaques, todos, secoesComItens])

  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()
  const headerEspresso = !heroEmCena

  // Statement: o manifesto do lojista na frente; sem ele, a descrição.
  const [fraseUm, fraseDois] = useMemo(() => repartirEmDoisTons(conteudo.manifesto ?? store.descricao), [conteudo.manifesto, store.descricao])

  const meta = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : store.taxa_entrega != null ? `Entrega ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)

  const galeriaCasa = conteudo.galeria_casa ?? []

  // "O que fazemos": uma banda por TIPO de peça (1ª palavra do nome), com a
  // foto e a linha de apoio vindas da própria peça. Calculado aqui (e não na
  // seção) para a numeração seguir a ordem da página.
  const bandas = useMemo(() => {
    const vistos = new Set<string>()
    const out: { palavra: string; produto: ProdutoCatalogo }[] = []
    for (const p of todos) {
      if (!p.foto_url) continue
      const palavra = tipoDe(p.nome)
      const chave = palavra.toLowerCase()
      if (vistos.has(chave)) continue
      vistos.add(chave)
      out.push({ palavra, produto: p })
      if (out.length >= MAX_BANDAS) break
    }
    return out
  }, [todos])

  const rolarParaAtelie = useCallback(() => {
    document.getElementById(ID_ATELIE)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  // Numeração das seções, na ordem em que existem.
  let numeroSecao = 0
  const numerar = () => String(++numeroSecao).padStart(2, '0')

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoArtesao — ficha técnica de
        // `metadata.especificacoes` em pares separados por fios e CTA pill
        // sólida com seta) no lugar do ProductModal quando o produto não tem
        // variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Header: transparente → barra espresso (accent) ao rolar ── */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bg-accent transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ height: ALTURA_HEADER, opacity: headerEspresso ? 1 : 0 }}
                  aria-hidden
                />
                <div
                  className="relative flex items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]"
                  style={{ height: ALTURA_HEADER }}
                >
                  <MarcaDaCasa nome={store.nome} logoUrl={store.logo_url} />
                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center font-display text-[16px] font-semibold text-accent-ink transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ opacity: headerEspresso ? 1 : 0 }}
                    aria-hidden={!headerEspresso}
                    tabIndex={headerEspresso ? 0 : -1}
                  >
                    {store.nome}
                  </a>
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoArtesa
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

            {/* ── Hero: nome gigante arredondado + CTA de contorno ── */}
            <HeroArtesa ref={heroRef} slides={slides} emCena={heroEmCena} aoAbrirProduto={aoAbrirProduto} aoVerPecas={rolarParaAtelie} />

            {/* ── 01 · Statement em dois tons ── */}
            <SecaoNumerada id={ID_ATELIE} numero={numerar()} rotulo="O ateliê">
              {(fraseUm.length > 0 || fraseDois.length > 0) && (
                <h1
                  className="font-display font-semibold tracking-[-0.3px]"
                  style={{ fontSize: 'calc(27px * var(--type-factor, 1))', lineHeight: 'calc(37px * var(--type-factor, 1))' }}
                >
                  <span className="text-ink">{fraseUm}</span>
                  {fraseDois.length > 0 && <span className="text-accent"> {fraseDois}</span>}
                </h1>
              )}
              <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[13px] font-medium tracking-[0.3px] text-ink-muted">
                {meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
                <StatusAberto horarios={store.horarios} className="font-body text-[13px] font-medium tracking-[0.3px] text-ink-muted" />
              </p>
            </SecaoNumerada>

            {todos.length === 0 ? (
              <VazioArtesa nome={store.nome} numero={numerar()} />
            ) : (
              <>
                {/* ── 02 · "O que fazemos" — bandas de foto ── */}
                {bandas.length >= MIN_BANDAS && (
                  <SecaoNumerada numero={numerar()} rotulo="O que fazemos" conteudoFullBleed>
                    <BandasCriacoes bandas={bandas} aoAbrirProduto={aoAbrirProduto} />
                  </SecaoNumerada>
                )}

                {/* ── 03 · Peças autorais: carrossel de um cartão com setas ── */}
                {secoesComItens[0] && (
                  <SecaoNumerada id={idDaSecao(secoesComItens[0].chave)} numero={numerar()} rotulo={secoesComItens[0].titulo}>
                    <CarrosselPecas produtos={secoesComItens[0].produtos} aoAbrirProduto={aoAbrirProduto} />
                  </SecaoNumerada>
                )}

                {/* ── 04+ · Demais seções em grid ── */}
                {secoesComItens.slice(1).map((secao) => (
                  <SecaoNumerada key={secao.chave} id={idDaSecao(secao.chave)} numero={numerar()} rotulo={secao.titulo}>
                    <div className="grid grid-cols-2 gap-[14px]">
                      {secao.produtos.map((p) => (
                        <CardArtesa key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
                      ))}
                    </div>
                  </SecaoNumerada>
                ))}
              </>
            )}

            {/* ── Fotos da casa — a galeria do lojista, no mesmo ritmo ── */}
            {galeriaCasa.length > 0 && (
              <SecaoNumerada numero={numerar()} rotulo="A casa" conteudoFullBleed>
                <GaleriaDaCasa fotos={galeriaCasa} nome={store.nome} />
              </SecaoNumerada>
            )}

            <FechoArtesa store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — o glide morno de 600ms entre o nome da casa e as peças
// ─────────────────────────────────────────────────────────────

const HeroArtesa = forwardRef<
  HTMLElement,
  {
    slides: SlideArtesa[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerPecas: () => void
  }
>(function HeroArtesa({ slides, emCena, aoAbrirProduto, aoVerPecas }, ref) {
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
      className="relative h-[52svh] max-h-[640px] min-h-[380px] select-none overflow-hidden bg-canvasAlt"
      style={{ touchAction: 'pan-y' }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques do ateliê"
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
                  style={{ left: '-10%', transform: reduzir ? undefined : `translateX(${deslocamento}%)`, transition: transicao }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              <div
                className="absolute inset-x-0 bottom-6 flex flex-col items-start gap-2 px-screen-x pr-[96px]"
                style={{
                  opacity: emFoco ? 1 : 0,
                  visibility: emFoco ? 'visible' : 'hidden',
                  transition: semTransicao ? 'none' : `opacity ${GLIDE_MS}ms ease, visibility 0s linear ${emFoco ? 0 : GLIDE_MS}ms`,
                  pointerEvents: emFoco ? 'auto' : 'none',
                }}
              >
                {/* O nome gigante em sans arredondada — a assinatura da referência. */}
                <p
                  className="line-clamp-2 w-full font-display font-semibold tracking-[-0.5px] text-white"
                  style={{ fontSize: 'calc(44px * var(--type-factor, 1))', lineHeight: 'calc(50px * var(--type-factor, 1))' }}
                >
                  {slide.titulo}
                </p>
                <p className="font-body text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {slide.apoio}
                </p>
                <CtaContorno className="mt-1" aoTocar={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoVerPecas())}>
                  {slide.cta}
                </CtaContorno>
              </div>
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className="absolute bottom-[26px] right-screen-x z-[2]">
          <PilulasDoHero total={n} ativo={indice} rotulos={slides.map((s) => s.titulo)} irPara={irPara} />
        </div>
      )}
    </section>
  )
})

// ─────────────────────────────────────────────────────────────
// "O que fazemos" — bandas de foto empilhadas de borda a borda: título
// claro sobre a imagem escurecida, linha de apoio e seta circulada que
// abre a peça (o menu de serviços da referência, aplicado ao catálogo).
// ─────────────────────────────────────────────────────────────

function BandasCriacoes({
  bandas,
  aoAbrirProduto,
}: {
  bandas: { palavra: string; produto: ProdutoCatalogo }[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <ul className="flex flex-col gap-[3px]">
      {bandas.map(({ palavra, produto }) => (
        <li key={produto.id}>
          <button
            type="button"
            onClick={() => aoAbrirProduto(produto)}
            className="relative block h-[148px] w-full overflow-hidden text-left transition-opacity hover:opacity-95 active:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={produto.foto_url!} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0" style={{ backgroundColor: VEU_BANDA }} aria-hidden />
            <span className="absolute inset-0 flex items-center justify-between gap-4 px-screen-x">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-display text-[27px] font-medium tracking-[-0.2px]" style={{ color: CREME }}>
                  {palavra}
                </span>
                <span className="truncate font-body text-[12px]" style={{ color: CREME_APAGADO }}>
                  {produto.descricao ?? produto.nome}
                </span>
              </span>
              {/* Seta circulada fina — o convite da referência */}
              <span
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[1.2px]"
                style={{ borderColor: 'rgba(255, 250, 242, 0.85)', color: CREME }}
                aria-hidden
              >
                <IconeTraco nome="arrow-up-right" tamanho={18} espessura={1.6} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────
// Carrossel de peças — um cartão retrato por vez, setas finas
// ─────────────────────────────────────────────────────────────

function CarrosselPecas({ produtos, aoAbrirProduto }: { produtos: ProdutoCatalogo[]; aoAbrirProduto: (p: ProdutoCatalogo) => void }) {
  const pagerRef = useRef<HTMLDivElement>(null)
  const [indice, setIndice] = useState(0)
  const total = produtos.length

  const irPara = (prox: number) => {
    const alvo = Math.max(0, Math.min(total - 1, prox))
    const el = pagerRef.current
    if (el) el.scrollTo({ left: alvo * el.clientWidth, behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })
    setIndice(alvo)
  }

  // O dedo também vira a página: o índice segue o scroll-snap.
  const aoRolar = () => {
    const el = pagerRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== indice) setIndice(Math.max(0, Math.min(total - 1, i)))
  }

  const atual = produtos[Math.min(indice, total - 1)]
  if (!atual) return null

  return (
    <div>
      <div
        ref={pagerRef}
        onScroll={aoRolar}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Peças autorais"
      >
        {produtos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => aoAbrirProduto(p)}
            className="relative block w-full shrink-0 snap-start text-left transition-opacity hover:opacity-95"
            aria-hidden={i !== indice}
            tabIndex={i === indice ? 0 : -1}
          >
            <span className="relative block w-full overflow-hidden rounded-xl bg-canvasAlt" style={{ aspectRatio: '2 / 3' }}>
              {p.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.foto_url}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="block h-full w-full object-cover"
                />
              )}
              <EtiquetaTipo nome={p.nome} />
            </span>
          </button>
        ))}
      </div>

      {/* Legenda + posição + setas finas */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]" aria-live="polite">
          <p className="truncate font-display text-[19px] font-semibold text-ink">{atual.nome}</p>
          <PrecoArtesa produto={atual} tamanho={15} />
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-[12px] font-medium tabular-nums text-ink-muted">
            {String(indice + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => irPara(indice - 1)}
            disabled={indice === 0}
            aria-label="Peça anterior"
            className="flex h-8 w-8 items-center justify-center text-accent disabled:text-line"
          >
            <IconeTraco nome="arrow-left" tamanho={26} espessura={1.5} />
          </button>
          <button
            type="button"
            onClick={() => irPara(indice + 1)}
            disabled={indice >= total - 1}
            aria-label="Próxima peça"
            className="flex h-8 w-8 items-center justify-center text-accent disabled:text-line"
          >
            <IconeTraco nome="arrow-right" tamanho={26} espessura={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Fotos da casa — trilho de borda a borda com as fotos do lojista
// ─────────────────────────────────────────────────────────────

function GaleriaDaCasa({ fotos, nome }: { fotos: string[]; nome: string }) {
  return (
    <ul
      className="flex snap-x gap-[3px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={`Fotos de ${nome}`}
    >
      {fotos.map((foto, i) => (
        <li key={`${foto}-${i}`} className="w-[78%] shrink-0 snap-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" loading="lazy" decoding="async" draggable={false} className="block h-[260px] w-full object-cover" />
        </li>
      ))}
    </ul>
  )
}

function VazioArtesa({ nome, numero }: { nome: string; numero: string }) {
  return (
    <SecaoNumerada numero={numero} rotulo="As peças">
      <div className="rounded-lg bg-canvasAlt px-6 py-12 text-center">
        <p className="font-display text-[22px] font-semibold text-ink">O ateliê ainda está arrumando a vitrine</p>
        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[14px] leading-[22px] text-ink-muted">
          {nome} ainda não colocou peças na vitrine. Volte em breve.
        </p>
      </div>
    </SecaoNumerada>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — nome, relógio vivo e os links da casa
// ─────────────────────────────────────────────────────────────

function FechoArtesa({ store }: { store: VitrineWebProps['store'] }) {
  const agora = useRelogioDaLoja()
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())

  return (
    <footer className="mt-12 px-screen-x pb-12 pt-6">
      <p
        className="truncate font-display font-semibold tracking-[-0.3px] text-ink"
        style={{ fontSize: 'calc(24px * var(--type-factor, 1))' }}
      >
        {store.nome}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[13px] text-ink-muted">
        {hoje && <span suppressHydrationWarning>Hoje {formatarHorario(hoje)}</span>}
        <StatusAberto horarios={store.horarios} className="font-body text-[13px] text-ink-muted" />
        {store.telefone && (
          <a href={`tel:${store.telefone}`} className="underline-offset-2 hover:underline">
            {store.telefone}
          </a>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-body text-[12px] text-ink-muted">
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
