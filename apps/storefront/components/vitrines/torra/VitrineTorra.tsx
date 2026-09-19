'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  AcaoTorra,
  CLASSE_ENTRA,
  CenaDoPoster,
  DURACAO_FUSAO,
  EstilosTorra,
  Grao,
  IconeTraco,
  LetrasEmpilhadas,
  MarcaDagua,
  Marcadores,
  PERMANENCIA,
  PalavraEmEscada,
  comAlfa,
  tokenComAlfa,
} from './torra-ui'

/**
 * Vitrine torra — layout PRÓPRIO do arquétipo `roast` para cafeterias e
 * confeitarias boutique (docs/store-theme/02 §A2 e 05 "Vitrine torra";
 * referência: Kafoska). Port web de
 * apps/mobile-consumer/components/loja/LojaTorra.tsx.
 *
 * DNA destilado da referência:
 * - PÔSTER de abertura: a palavra da casa repetida em degradê âmbar, com o
 *   produto flutuando por cima num cartão que TROCA POR CROSSFADE (700ms de
 *   fusão a cada 4,5s — o ritmo morno do café coando);
 * - o produto é o `metadata.recorte` (PNG transparente) solto sobre as
 *   palavras; sem recorte, a foto em MÁSCARA DE CÁPSULA;
 * - "MENU" GIGANTE NA VERTICAL acompanhando a coluna de cartões;
 * - cardápio em CARTÕES ÂMBAR chapados com a marca d'água do título repetida
 *   ao fundo, itens em caps escuras com preço forte;
 * - verde-floresta profundo + âmbar vibrante, cantos bem redondos.
 *
 * Uma voz só: a `font-display` da pele (Archivo no preset). Sem fonte-DNA.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host), a barra
 * de menu inferior (Início/Explorar/Pedidos/Perfil é navegação do app), a
 * virada da status bar e a transição de saída radial. A sacola vive no header
 * (sem FAB — regra das vitrines). O web ganha o fecho com relógio e links,
 * que na RN era papel da barra.
 */

// ── DNA fixo da vitrine (independe da paleta) ─────────────────
/** Título do cartão âmbar: branco puro, como na referência. */
const BRANCO_CARTAO = '#FFFFFF'
/** Véu da marca d'água sobre o accent. */
const VEU_MARCA = comAlfa('#FFFFFF', 0.16)
/** Sobrelinha do pôster quando a casa não escreveu uma campanha. */
const EYEBROW_PADRAO = 'Torra fresca todo dia'
/** Palavra do pôster quando o nome da casa não dá uma. */
const PALAVRA_PADRAO = 'CAFÉ'
/** Largura do rail do "MENU" (px), como na RN. */
const LARGURA_RAIL = 72
/** Quantos produtos entram em cena no pôster. */
const MAX_DESTAQUES = 4

const ID_MENU = 'menu'

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * Imagem de CENA do pôster: o `recorte` (PNG de fundo transparente) quando o
 * lojista subiu um — o efeito verdadeiro —, senão a foto, que ganha cápsula.
 */
function cenaDe(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/** A palavra do pôster: a primeira do título (campanha ou nome da casa). */
function palavraDe(titulo: string): string {
  return (titulo.trim().split(/\s+/)[0] || PALAVRA_PADRAO).toUpperCase()
}

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** `prefers-reduced-motion` como estado — pausa o crossfade, não só o esconde. */
function useMenosMovimento(): boolean {
  const [menos, setMenos] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setMenos(mq.matches)
    const aoMudar = (e: MediaQueryListEvent) => setMenos(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])
  return menos
}

export function VitrineTorra({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  // Quem entra em cena no pôster: os `destaques` escolhidos pelo lojista, na
  // ordem; sem escolha, a derivação da RN (a primeira seção, com foto).
  const destaques = useMemo(() => {
    const todos = secoes.flatMap((s) => s.produtos)
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && cenaDe(p) !== null)
    const base = escolhidos.length > 0 ? escolhidos : (secoes[0]?.produtos ?? []).filter((p) => cenaDe(p) !== null)
    return base.slice(0, MAX_DESTAQUES)
  }, [secoes, conteudo.destaques])

  const palavra = palavraDe(campanha?.titulo ?? store.nome)
  // Texto curto sob o pôster: a campanha manda; senão o manifesto; senão a
  // descrição (derivação da RN). Clampado em duas linhas como na RN.
  const fraseCasa = campanha?.subtitulo ?? conteudo.manifesto ?? store.descricao ?? null

  const vazio = secoes.every((s) => s.produtos.length === 0)

  // Header: transparente sobre o pôster → surface com fio depois dele. O
  // sentinela é o próprio pôster; ele "passou" quando sai por cima do header.
  const posterRef = useRef<HTMLElement>(null)
  const [depoisDoPoster, setDepoisDoPoster] = useState(false)
  useEffect(() => {
    const el = posterRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entrada]) => setDepoisDoPoster(!entrada.isIntersecting && entrada.boundingClientRect.top < 0),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const rolarParaMenu = useCallback(() => {
    document.getElementById(ID_MENU)?.scrollIntoView({
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
        // TODO(2b): PDP própria (ProdutoTorra — painel verde-floresta com pill
        // âmbar) no lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <EstilosTorra />
            <CartPersistence />

            {/* ── Header: nu sobre o pôster, surface com fio depois dele ── */}
            <header className="sticky top-0 z-30">
              <div
                className={`absolute inset-0 border-b border-line bg-surface transition-opacity duration-200 motion-reduce:transition-none ${
                  depoisDoPoster ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden
              />
              <div className="relative flex h-[52px] items-center gap-2 px-[calc(var(--space-screen-x,24px)-8px)]">
                <AcaoTorra href="/" rotulo={`${store.nome} — início da loja`}>
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <Grao tamanho={24} cor="var(--accent, #F2A33C)" />
                  )}
                </AcaoTorra>
                <p
                  className={`min-w-0 flex-1 truncate text-center font-display text-[15px] font-extrabold uppercase tracking-[1.5px] text-ink transition-opacity duration-200 motion-reduce:transition-none ${
                    depoisDoPoster ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden={!depoisDoPoster}
                >
                  {store.nome}
                </p>
                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <AcaoTorra
                      icone="bag"
                      contador={totalItens}
                      rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                      aoTocar={abrirSacola}
                    />
                  )}
                </Sacola>
              </div>
            </header>

            {/* ── Pôster: palavra repetida em degradê + produto flutuante ── */}
            <PosterTorra
              ref={posterRef}
              palavra={palavra}
              eyebrow={campanha?.eyebrow ?? EYEBROW_PADRAO}
              frase={fraseCasa}
              cta={campanha?.cta ?? null}
              destaques={destaques}
              pausado={depoisDoPoster}
              store={store}
              aoAbrirProduto={aoAbrirProduto}
              aoVerMenu={rolarParaMenu}
            />

            {vazio ? (
              <VazioTorra />
            ) : (
              /* ── MENU vertical + cartões âmbar ── */
              <section id={ID_MENU} className="mt-2 flex scroll-mt-[52px] pr-screen-x" aria-label="Menu">
                <div className="shrink-0 pt-1" style={{ width: LARGURA_RAIL }}>
                  <LetrasEmpilhadas palavra="MENU" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  {secoes.map((secao) => (
                    <CartaoSecao key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Fecho: a casa, o relógio e a assinatura ── */}
            <FechoTorra store={store} palavra={palavra} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Pôster — a palavra em escada e o produto em cena (crossfade)
// ─────────────────────────────────────────────────────────────

const PosterTorra = forwardRef<
  HTMLElement,
  {
    palavra: string
    eyebrow: string
    frase: string | null
    cta: string | null
    destaques: ProdutoCatalogo[]
    /** Fora de vista: o crossfade dorme (como o `depoisDoPoster` da RN). */
    pausado: boolean
    store: VitrineWebProps['store']
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerMenu: () => void
  }
>(function PosterTorra({ palavra, eyebrow, frase, cta, destaques, pausado, store, aoAbrirProduto, aoVerMenu }, ref) {
  const menosMovimento = useMenosMovimento()
  const [indice, setIndice] = useState(0)
  const [proximo, setProximo] = useState<number | null>(null)

  // Catálogo mudou e o índice ficou fora — volta ao primeiro.
  const atual = indice < destaques.length ? indice : 0
  const emCena = destaques[atual]
  const cenaAtual = emCena ? cenaDe(emCena) : null
  const cenaProxima = proximo != null && destaques[proximo] ? cenaDe(destaques[proximo]) : null

  // Permanência: 4,5s em cena, e o seguinte começa a nascer. Dorme quando o
  // pôster saiu de vista ou o visitante pediu menos movimento.
  useEffect(() => {
    if (destaques.length <= 1 || proximo != null || pausado || menosMovimento) return
    const t = setTimeout(() => setProximo((atual + 1) % destaques.length), PERMANENCIA)
    return () => clearTimeout(t)
  }, [atual, proximo, destaques.length, pausado, menosMovimento])

  // Commit no fim da fusão (o `finished` da RN): o seguinte vira o atual.
  useEffect(() => {
    if (proximo == null) return
    const t = setTimeout(() => {
      setIndice(proximo)
      setProximo(null)
    }, menosMovimento ? 0 : DURACAO_FUSAO)
    return () => clearTimeout(t)
  }, [proximo, menosMovimento])

  const escolher = useCallback((i: number) => {
    setProximo(null)
    setIndice(i)
  }, [])

  const meta = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null,
  ].filter((m): m is string => !!m)

  return (
    <section ref={ref} className="flex flex-col items-center pb-[26px] pt-6" aria-label="Destaques da casa">
      <p className="mb-[22px] font-body text-[11px] font-semibold uppercase tracking-[2.6px] text-accent">{eyebrow}</p>

      <div className="relative w-full">
        {/* As quatro linhas da palavra, do suave ao accent cheio */}
        <PalavraEmEscada palavra={palavra} />

        {/* Produto flutuante com crossfade — tocar abre o item. Cartão 46% da
            coluna × 1,5 de altura, centrado sobre as palavras. */}
        {emCena && cenaAtual && (
          <div className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => aoAbrirProduto(emCena)}
              aria-label={`${emCena.nome}, ${formatarReais(precoFinalDe(emCena))}`}
              className="relative block aspect-[2/3] w-full transition-opacity active:opacity-90"
            >
              <CenaDoPoster src={cenaAtual.src} recorte={cenaAtual.recorte} />
              {cenaProxima && (
                <CenaDoPoster
                  key={proximo}
                  src={cenaProxima.src}
                  recorte={cenaProxima.recorte}
                  className={CLASSE_ENTRA}
                />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Nome + preço do item em cena */}
      {emCena && (
        <div className="mt-[22px] flex flex-col items-center gap-1 px-screen-x text-center">
          <p className="font-display text-[19px] font-bold tracking-[0.2px] text-ink">{emCena.nome}</p>
          <p className="font-display text-[16px] font-bold text-accent">{formatarReais(precoFinalDe(emCena))}</p>
        </div>
      )}

      {destaques.length > 1 && (
        <div className="mt-[14px]">
          <Marcadores
            total={destaques.length}
            ativo={atual}
            rotuloDe={(i) => `${i + 1} de ${destaques.length}: ${destaques[i].nome}`}
            aoEscolher={escolher}
          />
        </div>
      )}

      {frase && (
        <p className="mt-[26px] line-clamp-2 px-[calc(var(--space-screen-x,24px)+8px)] text-center font-body text-[15px] font-medium leading-[22px] text-accent">
          {frase}
        </p>
      )}

      {/* Meta da casa: tempo, entrega e o relógio vivo (nunca um "Aberto" inventado). */}
      <div className="mt-[10px] flex flex-wrap items-center justify-center gap-x-2 font-body text-[12.5px] font-medium text-ink-muted">
        {meta.map((m, i) => (
          <span key={m} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>·</span>}
            {m}
          </span>
        ))}
        <StatusAberto
          horarios={store.horarios}
          className={`text-[12.5px] font-medium text-ink-muted ${meta.length > 0 ? "before:content-['·']" : ''}`}
        />
      </div>

      {/* CTA só quando o lojista escreveu um: a referência não tem botão no pôster. */}
      {cta && (
        <a
          href={`#${ID_MENU}`}
          onClick={(e) => {
            e.preventDefault()
            aoVerMenu()
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-pill border-[1.5px] border-accent px-6 py-3 font-body text-[12px] font-bold uppercase tracking-[1.6px] text-accent transition-colors hover:bg-accent hover:text-accent-ink"
        >
          {cta}
          <IconeTraco nome="chevron-down" tamanho={14} espessura={2.4} />
        </a>
      )}
    </section>
  )
})

// ─────────────────────────────────────────────────────────────
// Cartão âmbar de seção — marca d'água repetida + itens em caps escuras
// ─────────────────────────────────────────────────────────────

function CartaoSecao({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  // As tintas escuras sobre o accent saem do `accent-ink` da pele com alfa —
  // o "rgba(34, 21, 3, x)" da RN, válido também nas paletas alternativas.
  const tintaDescricao = tokenComAlfa('--accent-ink', 0.78, '#221503')
  const tintaRiscado = tokenComAlfa('--accent-ink', 0.55, '#221503')

  return (
    <div id={idDaSecao(secao.chave)} className="relative scroll-mt-[60px] overflow-hidden rounded-xl bg-accent p-5">
      <MarcaDagua texto={secao.titulo} cor={VEU_MARCA} />

      <h2
        className="relative mb-[14px] font-display text-[26px] font-extrabold uppercase leading-[1.15] tracking-[0.5px]"
        style={{ color: BRANCO_CARTAO }}
      >
        {secao.titulo}
      </h2>

      <ul className="relative m-0 flex list-none flex-col gap-4 p-0">
        {secao.produtos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => aoAbrirProduto(p)}
              className="block w-full text-left transition-opacity hover:opacity-85 active:opacity-75"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 min-w-0 flex-1 font-display text-[15.5px] font-extrabold uppercase leading-5 tracking-[0.3px] text-accent-ink">
                  {p.nome}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-display text-[15.5px] font-extrabold leading-5 text-accent-ink">
                    {formatarReais(precoFinalDe(p))}
                  </span>
                  {temPromo(p) && (
                    <span className="font-body text-[11px] font-medium line-through" style={{ color: tintaRiscado }}>
                      {formatarReais(p.preco)}
                    </span>
                  )}
                </span>
              </span>
              {p.descricao && (
                <span
                  className="mt-1 line-clamp-2 block max-w-[86%] font-body text-[12.5px] font-medium leading-[17px]"
                  style={{ color: tintaDescricao }}
                >
                  {p.descricao}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioTorra() {
  return (
    <section id={ID_MENU} className="mt-2 flex scroll-mt-[52px] pr-screen-x" aria-label="Menu">
      <div className="shrink-0 pt-1" style={{ width: LARGURA_RAIL }}>
        <LetrasEmpilhadas palavra="MENU" />
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl bg-accent p-5">
        <MarcaDagua texto="Em breve" cor={VEU_MARCA} linhas={6} />
        <div className="relative flex flex-col items-start gap-3">
          <Grao tamanho={28} cor="var(--accent-ink, #221503)" />
          <p className="font-display text-[22px] font-extrabold uppercase leading-[1.1] tracking-[0.3px] text-accent-ink">
            O café ainda está coando
          </p>
          <p
            className="font-body text-[13px] font-medium leading-[18px]"
            style={{ color: tokenComAlfa('--accent-ink', 0.78, '#221503') }}
          >
            Esta casa ainda não colocou o cardápio na vitrine. Volte em breve.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — a palavra uma última vez, relógio vivo e assinatura
// ─────────────────────────────────────────────────────────────

function FechoTorra({ store, palavra }: { store: VitrineWebProps['store']; palavra: string }) {
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
    hoje ? `HOJE ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} MIN` : null,
    store.taxa_entrega === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter((m): m is string => !!m)

  return (
    <footer className="relative mt-10 overflow-hidden border-t border-line bg-surface px-6 pb-12 pt-9 text-center">
      {/* A palavra do pôster, uma última vez, como marca d'água do fecho. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 left-1/2 block -translate-x-1/2 whitespace-nowrap font-display text-[64px] font-extrabold uppercase leading-none tracking-[2px] text-accent opacity-[0.08]"
      >
        {palavra}
      </span>

      <div className="relative flex flex-col items-center">
        <p className="font-display text-[20px] font-extrabold uppercase tracking-[1.5px] text-ink">{store.nome}</p>

        {meta.length > 0 && (
          <p className="mt-3 font-body text-[11px] font-semibold tracking-[1.8px] text-accent" suppressHydrationWarning>
            {meta.join('  ·  ')}
          </p>
        )}

        <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[12px] font-semibold tracking-[0.6px] text-ink-muted" />

        {store.telefone && (
          <a
            href={`tel:${store.telefone}`}
            className="mt-4 font-body text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
          >
            {store.telefone}
          </a>
        )}

        <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[11px] text-ink-muted">
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
      </div>
    </footer>
  )
}
