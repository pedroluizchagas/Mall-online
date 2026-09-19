'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  abertoAgora,
  formatarHorario,
  horarioDeHoje,
  lerMetadataProduto,
  normalizeStoreConteudo,
  relogioDaLoja,
} from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import { FonteDna, Sacola, StatusAberto, idDaSecao } from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  ALTURA_PILL,
  CREME,
  CasaNaPill,
  Cartao,
  DiscoSacola,
  EstilosEspeciais,
  GUTTER,
  GradienteHero,
  IconeTraco,
  MANIFESTO_PADRAO,
  Miniatura,
  NomeVizinho,
  RAIO_CARTAO,
  ROSA_MENU,
  Veu,
  WordmarkGroovy,
  larg,
  largCartao,
  prefereMenosMovimento,
  tokenComAlfa,
} from './ritual-ui'

/**
 * Vitrine ritual — layout PRÓPRIO do arquétipo `ritual` para açaiterias e
 * alimentação lifestyle (docs/store-theme/02 §A5 e 05 "Vitrine ritual";
 * referência: OCHA). Port web de
 * apps/mobile-consumer/components/loja/LojaRitual.tsx.
 *
 * DNA destilado da referência:
 * - PÁGINA ROSA onde toda seção é um cartão de canto redondo FLUTUANDO — o
 *   gutter rosa contorna tudo e é a assinatura nº 1 do layout;
 * - PILL FLUTUANTE centrada no topo (casa · status · sacola), fixa o scroll
 *   inteiro — a página é uma família de cartões flutuando no rosa, e o
 *   chrome flutua com ela;
 * - HERO cartão-foto com o wordmark groovy GIGANTE em rosa sobre a foto,
 *   statement de marca em caps condensadas creme, fileira de miniaturas que
 *   trocam a foto por crossfade (só no toque) e um RELÓGIO VIVO no rodapé;
 * - ESPECIAIS: a palavra gigante FIXA no cartão e os produtos deslizando por
 *   cima dela, com os nomes dos vizinhos rotacionados sangrando nos cantos;
 * - CARDÁPIO em cartões creme PURAMENTE TIPOGRÁFICOS (nome + preço, sem foto
 *   e sem descrição), no respiro vertical largo da referência.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — o slot
 * vira a casa), a pílula CREME de menu inferior (Início/Explorar/Pedidos/
 * Perfil é navegação do app), a virada da status bar e a transição de saída
 * radial. A sacola vive na pílula (sem FAB — regra das vitrines). O web ganha
 * uma fileira de ÂNCORAS em pills creme (o vocabulário da barra de menu
 * reaproveitado) antes do cardápio, porque a página web precisa de índice.
 *
 * Tipografia: a pele ritual já traz Anton no display e Nunito no corpo — a
 * Anton só tem peso 400, então o display aqui não pede bold (o navegador
 * sintetizaria um negrito falso). A Shrikhand do wordmark é DNA do layout,
 * carregada pela `FonteDna`.
 */

/** Teto de itens no cartão de especiais. */
const MAX_ESPECIAIS = 6
/** Fotos do hero (banner/galeria + produtos). */
const MAX_FOTOS_HERO = 4
/** Altura da pílula + folgas: o hero começa abaixo dela. */
const TOPO_HERO = 6 + ALTURA_PILL + 16

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * Foto do PALCO dos especiais: o `recorte` (PNG de fundo transparente) quando
 * o lojista subiu um → cutout SOLTO em `contain`, sem moldura entre ele e a
 * palavra; foto comum entra emoldurada em cover.
 */
function fotoPalco(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/** "HH:MM" da hora de parede da loja. */
function horaCurta(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Relógio vivo da loja. Nasce VAZIO para o servidor (UTC) e o cliente não
 * divergirem na hidratação; bate a cada meio minuto — basta para nunca
 * mostrar hora velha sem acordar a página à toa.
 */
function useRelogio(): Date | null {
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 30_000)
    return () => clearInterval(id)
  }, [])
  return agora
}

export function VitrineRitual({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])
  const vazio = todos.length === 0

  // Fotos do hero: as fotos da casa (`galeria_casa`) e o banner na frente,
  // produtos completando até 4.
  const heroFotos = useMemo(() => {
    const urls = [...(conteudo.galeria_casa ?? []), store.banner_url, ...todos.map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls)).slice(0, MAX_FOTOS_HERO)
  }, [conteudo.galeria_casa, store.banner_url, todos])

  // Especiais: os destaques escolhidos pelo lojista, senão a seção "Especiais"
  // da casa, senão os primeiros itens com foto — o cartão-assinatura nunca
  // fica vazio.
  const escolhidos = useMemo(
    () =>
      (conteudo.destaques ?? [])
        .map((id) => todos.find((p) => p.id === id))
        .filter((p): p is ProdutoCatalogo => !!p),
    [conteudo.destaques, todos],
  )
  const secaoEspeciais = useMemo(
    () => (escolhidos.length > 0 ? undefined : secoesComItens.find((s) => /especia/i.test(s.titulo))),
    [escolhidos, secoesComItens],
  )
  const especiais = useMemo(
    () =>
      (escolhidos.length > 0
        ? escolhidos
        : secaoEspeciais?.produtos ?? todos.filter((p) => p.foto_url).slice(0, 4)
      ).slice(0, MAX_ESPECIAIS),
    [escolhidos, secaoEspeciais, todos],
  )
  // Uma seção que virou cartão de especiais não se repete no cardápio — mas
  // só SAI quando o cartão mostra todos os seus itens (a lição da forno:
  // esconder produto é pior que repetir).
  const secoesCardapio = useMemo(
    () =>
      secoesComItens.filter((s) => !(s === secaoEspeciais && s.produtos.length <= MAX_ESPECIAIS)),
    [secoesComItens, secaoEspeciais],
  )

  const tempo = store.tempo_entrega
  const entrega =
    store.taxa_entrega === 0
      ? 'Entrega grátis'
      : store.taxa_entrega != null
        ? `Entrega ${formatarReais(store.taxa_entrega)}`
        : null

  // Loja sem horários → `StatusAberto` não renderiza nada; a pílula então
  // carrega o nome da casa no lugar do status (determinístico, sem relógio).
  const temHorarios = abertoAgora(store.horarios, new Date()) !== null

  const statement = conteudo.campanha?.titulo ?? store.descricao ?? null
  const manifesto = (conteudo.manifesto ?? MANIFESTO_PADRAO).toUpperCase()

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
        // TODO(2b): PDP própria (ProdutoRitual — nome do produto gigante fixo
        // ATRÁS da galeria, ficha sobre o rosa e pill roxa que pisca "NA
        // SACOLA ✓") no lugar do ProductModal quando o produto não tem
        // variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas pb-10 text-ink">
            <FonteDna familias={[['Shrikhand', [400]]]} />
            <EstilosEspeciais />
            <CartPersistence />

            {/* ── Pílula flutuante: o único chrome, fixo o scroll inteiro ──
                `h-0` sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-0 z-30 h-0">
              <div
                className="mx-auto mt-[6px] flex w-max max-w-[calc(100%-28px)] items-center gap-[10px] rounded-full border bg-accent pl-[6px] pr-2 text-accent-ink shadow-floating"
                style={{ height: ALTURA_PILL, borderColor: tokenComAlfa('--accent-ink', 0.18) }}
              >
                <CasaNaPill nome={store.nome} logoUrl={store.logo_url} />

                <div className="flex min-w-0 shrink items-center">
                  {temHorarios ? (
                    <StatusAberto
                      horarios={store.horarios}
                      className="min-w-0 truncate font-display text-[12.5px] uppercase tracking-[0.6px] text-accent-ink"
                    />
                  ) : (
                    <span className="min-w-0 truncate font-display text-[12.5px] uppercase tracking-[0.6px] text-accent-ink">
                      {store.nome}
                    </span>
                  )}
                </div>

                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <DiscoSacola
                      contador={totalItens}
                      rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                      aoTocar={abrirSacola}
                    />
                  )}
                </Sacola>
              </div>
            </div>

            {/* ── Hero: cartão-foto com wordmark groovy e seletor de miniaturas ── */}
            <HeroRitual
              nome={store.nome}
              statement={statement}
              tempo={tempo}
              horarios={store.horarios}
              fotos={heroFotos}
            />

            {/* ── Manifesto: sem cartão, direto no rosa (o respiro da página) ── */}
            <p
              className="mt-[6px] text-center font-display tracking-[0.3px] text-accent"
              style={{
                paddingTop: 44,
                paddingBottom: 44,
                paddingLeft: `calc(var(--space-screen-x, 24px) + 8px)`,
                paddingRight: `calc(var(--space-screen-x, 24px) + 8px)`,
                fontSize: 'calc(27px * var(--type-factor, 1))',
                lineHeight: 'calc(29px * var(--type-factor, 1))',
              }}
            >
              {manifesto}
            </p>

            {vazio ? (
              <VazioRitual />
            ) : (
              <>
                {/* ── Especiais: a palavra gigante atrás dos produtos ── */}
                {especiais.length > 0 && (
                  <EspeciaisRitual
                    produtos={especiais}
                    rotulo={secaoEspeciais?.titulo ?? 'Especiais'}
                    aoAbrirProduto={aoAbrirProduto}
                  />
                )}

                {/* ── Âncoras (só no web): pills creme, o vocabulário da barra
                    de menu da RN reaproveitado como índice do cardápio ── */}
                {secoesCardapio.length > 1 && <NavCardapio secoes={secoesCardapio} rolarPara={rolarPara} />}

                {/* ── Cardápio: cartões creme puramente tipográficos ── */}
                {secoesCardapio.map((secao) => (
                  <CartaoCardapio key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                ))}
              </>
            )}

            {/* ── Fecho: foto do ambiente com a assinatura da casa ── */}
            <FechoRitual store={store} foto={heroFotos[0] ?? null} tempo={tempo} entrega={entrega} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — cartão-foto, wordmark groovy, miniaturas e relógio vivo
// ─────────────────────────────────────────────────────────────

function HeroRitual({
  nome,
  statement,
  tempo,
  horarios,
  fotos,
}: {
  nome: string
  statement: string | null
  tempo: number | null
  horarios: unknown
  fotos: string[]
}) {
  // `base` é a foto assentada; `alvo` é a que está entrando por fusão. O anel
  // marca o DESTINO do toque, não o fim da fusão: quem tocou já vê a seleção
  // mudar enquanto a imagem ainda corre atrás.
  const [base, setBase] = useState(0)
  const [alvo, setAlvo] = useState<number | null>(null)
  const selecionada = alvo ?? base

  // Assenta a foto que entrou quando a fusão (500ms) termina. Timer, e não
  // `onAnimationEnd`: com "reduzir movimento" a animação é `none` e o evento
  // nunca dispararia.
  useEffect(() => {
    if (alvo == null) return
    const id = setTimeout(() => {
      setBase(alvo)
      setAlvo(null)
    }, 520)
    return () => clearTimeout(id)
  }, [alvo])

  /** Troca a foto do hero por fusão; reduce-motion troca a seco. */
  function trocarFoto(i: number) {
    if (i === selecionada) return
    if (prefereMenosMovimento()) {
      setBase(i)
      setAlvo(null)
      return
    }
    // Tocar durante a fusão REDIRECIONA para o novo alvo: a base passa a ser
    // o que já estava entrando — zerar mantendo a base velha daria um salto
    // para trás, mostrando de novo a foto que o usuário acabou de trocar.
    setBase(selecionada)
    setAlvo(i)
  }

  // Relógio vivo do rodapé (o "NEW YORK · 7:23 PM" da referência). O "ABERTO"
  // fixo da RN vira o estado real: loja sem horários não inventa status.
  const agora = useRelogio()
  const aberto = agora ? abertoAgora(horarios, agora) : null
  const linhaRelogio = [
    aberto === true ? 'ABERTO' : aberto === false ? 'FECHADO' : null,
    tempo != null ? `${tempo} MIN` : null,
    agora ? horaCurta(agora) : null,
  ]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <Cartao
      tag="header"
      className="bg-accent"
      style={{ marginTop: TOPO_HERO, height: 'clamp(500px, 78svh, 720px)' }}
      rotulo={`${nome} — apresentação`}
    >
      {fotos[base] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotos[base]} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {alvo != null && fotos[alvo] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={alvo} src={fotos[alvo]} alt="" className="ritual-fusao absolute inset-0 h-full w-full object-cover" />
      )}

      {/* Scrim de duas bandas + véus: o wordmark mora na banda de topo (que
          sozinha entrega no máximo 0,32 — insuficiente sobre banner claro) e
          statement, miniaturas e relógio no terço inferior, onde o gradiente
          é fraco. */}
      <GradienteHero />
      <Veu lado="topo" fracao={0.4} alfa={0.7} />
      <Veu lado="base" fracao={0.66} alfa={0.72} />

      <div className="relative flex h-full flex-col px-[18px] pb-5 pt-[30px]">
        <WordmarkGroovy tag="h1" nome={nome} maxPx={96} />

        <div className="flex-1" />

        {statement && (
          // Três linhas é o teto: o bloco cresce PARA CIMA e, mais alto que
          // isso, a primeira linha escapa da faixa densa do véu.
          <p
            className="text-center font-display uppercase tracking-[0.3px]"
            style={{
              color: CREME,
              fontSize: 'calc(25px * var(--type-factor, 1))',
              lineHeight: 'calc(27px * var(--type-factor, 1))',
              textShadow: '0 1px 6px rgba(0,0,0,0.28)',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {statement}
          </p>
        )}

        {fotos.length > 1 && (
          <div className="mt-[22px] flex justify-center gap-[10px]" role="group" aria-label="Fotos da casa">
            {fotos.map((src, i) => (
              <Miniatura
                key={src}
                src={src}
                indice={i}
                total={fotos.length}
                ativa={i === selecionada}
                aoTocar={() => trocarFoto(i)}
              />
            ))}
          </div>
        )}

        <p
          className="mt-4 min-h-[14px] text-center font-body text-[11px] font-bold tracking-[1.8px]"
          style={{ color: CREME }}
          suppressHydrationWarning
        >
          {linhaRelogio}
        </p>
      </div>
    </Cartao>
  )
}

// ─────────────────────────────────────────────────────────────
// Especiais — a palavra gigante fixa e os produtos passando por cima
// ─────────────────────────────────────────────────────────────

/**
 * O momento-assinatura da referência: "ESPECIAIS" fica CRAVADA no cartão e o
 * pager desliza os produtos por cima dela. O affordance de swipe não são dots
 * — são os nomes dos itens vizinhos, rotacionados e cortados pelos cantos
 * inferiores, que giram junto como um carrossel visto de lado.
 *
 * O `scrollX` da RN vira a CSS var `--ritual-p` (progresso em páginas)
 * escrita no cartão a cada scroll — parallax e deslize saem do CSS, sem
 * re-render; só o índice ativo (arredondado) passa pelo React.
 */
function EspeciaisRitual({
  produtos,
  rotulo,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  rotulo: string
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const cartaoRef = useRef<HTMLElement>(null)
  const trilhoRef = useRef<HTMLDivElement>(null)
  const [ativo, setAtivo] = useState(0)

  const aoRolar = useCallback(() => {
    const trilho = trilhoRef.current
    const cartao = cartaoRef.current
    if (!trilho || !cartao || trilho.clientWidth === 0) return
    const p = trilho.scrollLeft / trilho.clientWidth
    cartao.style.setProperty('--ritual-p', p.toFixed(4))
    const i = Math.round(p)
    setAtivo((atual) => (atual === i ? atual : i))
  }, [])

  // Vizinhos NÃO circulares: o pager não dá a volta, então anunciar um item
  // nas pontas seria prometer um swipe que não acontece.
  const anterior = produtos[ativo - 1]
  const proximo = produtos[ativo + 1]

  return (
    <section
      ref={cartaoRef}
      aria-label={rotulo}
      className="relative mt-3 overflow-hidden bg-accent text-accent-ink"
      style={
        {
          marginLeft: GUTTER,
          marginRight: GUTTER,
          borderRadius: RAIO_CARTAO,
          height: larg(1.5),
          '--ritual-ativo': ativo,
        } as CSSProperties
      }
    >
      {/*
        A palavra sangra pelas bordas de propósito. O corpo vem da LARGURA do
        cartão: "ESPECIAIS" na Anton mede 3,63 em, então 33% da largura garante
        que ela ultrapasse as duas bordas em qualquer tela; a caixa tem 2× a
        largura do cartão e o `overflow: hidden` faz o corte.
      */}
      <span
        className="pointer-events-none absolute whitespace-nowrap text-center font-display uppercase leading-none text-canvas"
        style={{ left: '-50%', right: '-50%', top: '33%', fontSize: largCartao(0.33) }}
        aria-hidden
      >
        ESPECIAIS
      </span>

      <div
        ref={trilhoRef}
        onScroll={aoRolar}
        role="group"
        aria-roledescription="carrossel"
        aria-label={`${rotulo}: ${produtos.length} itens`}
        className="relative flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {produtos.map((p, i) => {
          const foto = fotoPalco(p)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => aoAbrirProduto(p)}
              aria-label={`${p.nome}, ${formatarReais(precoFinalDe(p))}`}
              className="flex h-full w-full shrink-0 snap-center flex-col items-center pb-24 pt-12 text-left transition-opacity active:opacity-90"
            >
              <span className="flex min-h-0 w-full flex-1 items-center justify-center">
                {/* Parallax: a foto fica um passo atrás da página, dando
                    profundidade entre ela e a palavra cravada no fundo. */}
                <span className="ritual-parallax flex max-h-full items-center justify-center" style={{ '--i': i } as CSSProperties}>
                  {foto?.recorte ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={foto.src}
                      alt=""
                      className="max-h-full object-contain"
                      style={{ width: largCartao(0.72), aspectRatio: '1 / 1.05' }}
                      loading={i > 0 ? 'lazy' : undefined}
                    />
                  ) : (
                    <span
                      className="flex max-h-full items-center justify-center overflow-hidden rounded-[24px]"
                      style={{
                        width: largCartao(0.62),
                        aspectRatio: '1 / 1.15',
                        backgroundColor: tokenComAlfa('--accent-ink', 0.12),
                      }}
                    >
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto.src} alt="" className="h-full w-full object-cover" loading={i > 0 ? 'lazy' : undefined} />
                      ) : (
                        <IconeTraco nome="bowl" tamanho={64} cor={tokenComAlfa('--accent-ink', 0.5)} espessura={1.4} />
                      )}
                    </span>
                  )}
                </span>
              </span>

              <span className="mt-5 flex w-full flex-col items-center gap-[5px] px-7">
                <span className="block w-full truncate text-center font-display text-[20px] uppercase tracking-[0.5px]">
                  {p.nome}
                </span>
                <span className="font-body text-[14px] font-semibold" style={{ color: tokenComAlfa('--accent-ink', 0.7) }}>
                  {formatarReais(precoFinalDe(p))}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {anterior && <NomeVizinho nome={anterior.nome} lado="esquerda" />}
      {proximo && <NomeVizinho nome={proximo.nome} lado="direita" />}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Âncoras — pills creme com as seções (só no web)
// ─────────────────────────────────────────────────────────────

function NavCardapio({ secoes, rolarPara }: { secoes: SecaoCatalogo[]; rolarPara: (id: string) => void }) {
  return (
    <nav
      aria-label="Seções do cardápio"
      className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}
    >
      {secoes.map((s) => {
        const id = idDaSecao(s.chave)
        return (
          <a
            key={s.chave}
            href={`#${id}`}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault()
              rolarPara(id)
            }}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-[9px] font-body text-[11px] font-bold uppercase tracking-[1.6px] transition-opacity hover:opacity-80"
            style={{ backgroundColor: CREME, color: ROSA_MENU }}
          >
            {s.titulo}
          </a>
        )
      })}
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — cartão creme puramente tipográfico
// ─────────────────────────────────────────────────────────────

/**
 * O cardápio da referência não tem foto nem descrição: só nome e preço em
 * caps rosa sobre o creme, com respiro vertical largo. O produto é vendido
 * pelo hero e pelos especiais; aqui manda a lista limpa.
 */
function CartaoCardapio({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <Cartao
      id={idDaSecao(secao.chave)}
      rotulo={secao.titulo}
      className="mt-3 scroll-mt-[76px] px-[22px] py-[26px]"
      style={{ backgroundColor: CREME }}
    >
      {/* Sem opacidade: num cardápio sem foto e sem descrição, o título é o
          único ponto de orientação da lista. A hierarquia sai do corpo 11 e
          do tracking, não de apagar a tinta abaixo de AA. */}
      <h2 className="font-body text-[11px] font-bold uppercase tracking-[2.2px]" style={{ color: ROSA_MENU }}>
        {secao.titulo}
      </h2>

      <ul className="m-0 mt-2 list-none p-0">
        {secao.produtos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => aoAbrirProduto(p)}
              className="flex w-full items-center gap-[14px] py-[13px] text-left transition-opacity hover:opacity-70 active:opacity-60"
              style={{ color: ROSA_MENU }}
            >
              <span className="min-w-0 flex-1 truncate font-display text-[17px] uppercase tracking-[0.4px]">{p.nome}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {temPromo(p) && (
                  // Tinta cheia: o preço antigo já se distingue pelo corpo
                  // menor e pelo risco. Diluí-lo o levava a 2,3:1 no creme.
                  <span className="font-body text-[12px] font-semibold line-through">{formatarReais(p.preco)}</span>
                )}
                <span className="font-display text-[17px]">{formatarReais(precoFinalDe(p))}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioRitual() {
  return (
    <Cartao className="mt-3 flex flex-col items-center px-[22px] py-10 text-center" style={{ backgroundColor: CREME }} rotulo="Cardápio">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--bg, #F6B8D3)' }}
      >
        <IconeTraco nome="bowl" tamanho={30} cor={ROSA_MENU} espessura={1.8} />
      </span>
      <p
        className="mt-5 font-display uppercase tracking-[0.4px]"
        style={{ color: ROSA_MENU, fontSize: 'calc(24px * var(--type-factor, 1))', lineHeight: 1.1 }}
      >
        O ritual ainda está sendo preparado
      </p>
      <p className="mt-3 max-w-[32ch] font-body text-[14px] font-semibold leading-[21px]" style={{ color: ROSA_MENU }}>
        Esta casa ainda não colocou o cardápio na vitrine. Volte em breve — a tigela vai valer a espera.
      </p>
    </Cartao>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — cartão de ambiente com a assinatura da casa
// ─────────────────────────────────────────────────────────────

function FechoRitual({
  store,
  foto,
  tempo,
  entrega,
}: {
  store: VitrineWebProps['store']
  foto: string | null
  tempo: number | null
  entrega: string | null
}) {
  const agora = useRelogio()
  const hoje = agora ? horarioDeHoje(store.horarios, agora) : null
  const meta = [tempo != null ? `${tempo} min` : null, entrega, hoje ? `Hoje ${formatarHorario(hoje)}` : null].filter(
    (m): m is string => !!m,
  )

  return (
    <>
      {/* Assinatura ancorada na BASE, não centrada: o meio do gradiente de
          duas bandas é transparente, e centrar punha o wordmark exatamente no
          vão — sumia sobre qualquer foto clara. */}
      <Cartao tag="footer" className="mt-3 flex h-[220px] flex-col justify-end bg-accent" rotulo={`${store.nome} — fecho`}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
        <GradienteHero />
        <Veu lado="base" fracao={0.7} alfa={0.7} />

        <div className="relative flex flex-col items-center gap-2 px-6 pb-[22px]">
          <WordmarkGroovy nome={store.nome} maxPx={32} halo={0.22} />
          {meta.length > 0 && (
            <p
              className="text-center font-body text-[11px] font-bold uppercase tracking-[1.8px]"
              style={{ color: CREME }}
              suppressHydrationWarning
            >
              {meta.join('  ·  ')}
            </p>
          )}
          <StatusAberto
            horarios={store.horarios}
            className="font-body text-[11px] font-bold uppercase tracking-[1.8px] text-[#FBF3DC]"
          />
        </div>
      </Cartao>

      {/* Rodapé institucional, direto no rosa. */}
      <div className="mt-6 flex flex-col items-center gap-3 px-screen-x text-center font-body text-ink-muted">
        {store.telefone && (
          <a href={`tel:${store.telefone}`} className="text-[13px] font-semibold underline-offset-2 hover:underline">
            {store.telefone}
          </a>
        )}
        <div
          className="flex w-full flex-wrap items-center justify-between gap-3 border-t pt-5 text-[11px]"
          style={{ borderColor: tokenComAlfa('--ink', 0.18, '#39103B') }}
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
      </div>
    </>
  )
}
