'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
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
  BotaoForno,
  CirculosConcentricos,
  Coroa,
  Fatia,
  IconeTraco,
  PizzaRedonda,
  RabiscoCozinha,
  comAlfa,
  larg,
  tokenComAlfa,
} from './forno-ui'

/**
 * Vitrine forno — layout PRÓPRIO do arquétipo `slice` para pizzarias e
 * cantinas (docs/store-theme/02 §A7 e 05 "Vitrine forno"; referência:
 * Restaurin / "Pizza Lounge"). Port web de
 * apps/mobile-consumer/components/loja/LojaForno.tsx.
 *
 * DNA destilado da referência:
 * - QUATRO CORES EM BLOCOS CHAPADOS full-bleed: creme de página, PRETO de
 *   forno (hero e fecho), OURO (o cardápio-pôster) e o vermelho do tema, que
 *   aqui não é só CTA — é a TINTA de todo o display sobre o creme;
 * - UMA GROTESCA SÓ, esmagada em caps, trocando de cor por seção: ouro sobre
 *   o preto, vermelho sobre o ouro, vermelho sobre o creme;
 * - COROA real do logo isolada acima do wordmark e nos badges;
 * - PIZZA EM RECORTE REDONDO, sem moldura, vazando de um bloco para o outro;
 * - CARDÁPIO-PÔSTER: um item por vez sobre o ouro, disco grande e nome
 *   gigante embaixo;
 * - ALVO: a pizza sobre anéis concêntricos num cartão vermelho, com o nome da
 *   casa em ouro atravessando e sendo cortado pelas bordas.
 *
 * Duas vozes só de peso: a fonte do tema no corpo e nos títulos menores, e a
 * Archivo Black que é DNA DESTE layout — carregada pela `FonteDna`, não pela
 * pele. Zero animação contínua: a referência não tem marquee.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host), a pílula
 * de menu inferior (Início/Explorar/Pedidos/Perfil é navegação do app), a
 * virada da status bar e a transição de saída radial. A sacola vive no header
 * (sem FAB — regra das vitrines).
 */

// ── DNA fixo da vitrine (independe da paleta; ela troca o creme e o vermelho) ──
/** Preto de forno: o bloco do hero e o do fecho. */
const PRETO_FORNO = '#1A150F'
/** Ouro do cardápio-pôster e do wordmark sobre o preto (8,66:1). */
const OURO = '#F2A31B'
/**
 * Creme ÚNICO de tudo que é escrito sobre o preto e sobre o accent. Fixo (e
 * não `--bg`) pelo mesmo motivo da horta: as paletas curadas trocam o creme
 * da página, e o contraste sobre os blocos precisa valer nas três peles.
 */
const CREME_FIXO = '#F6EFDE'
/** Tinta de todo texto PEQUENO sobre o ouro (8,66:1). */
const TINTA_OURO = '#1A150F'

/** Frase do statement quando a casa não tem uma curta o bastante. */
const STATEMENT_PADRAO = 'UMA EXPERIÊNCIA DE PIZZA INESQUECÍVEL'

/** Disco do hero (fração da coluna) e o quanto ele desce sobre o bloco seguinte. */
const DISCO_HERO = 0.92
const VAZAMENTO = DISCO_HERO * 0.3 // 27,6% da largura

/**
 * A Archivo Black é DNA do layout: enquanto não chega (ou se falhar), cai no
 * display do tema. Muda o esmagamento da voz, nunca o layout.
 */
const BLACK: CSSProperties = {
  fontFamily: '"Archivo Black", var(--font-display), var(--font-jakarta), sans-serif',
  fontWeight: 400,
}

/** Largura média das caixas-altas da Archivo Black em em — para o "adjustsFontSizeToFit". */
const LARGURA_CAPS = 0.74

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * Foto do DISCO: o `recorte` (PNG de fundo transparente) quando o lojista
 * subiu um, senão a foto. Sobre o ouro e o vermelho, o recorte é a pizza
 * solta da referência; a foto entra no círculo puro.
 */
function fotoDisco(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/**
 * Wordmark empilhado do hero: "Forno Real" → FORNO / REAL. Duas linhas é a
 * silhueta da referência ("PIZZA LOUNGE"); nome de uma palavra fica em uma só.
 */
function partirWordmark(nome: string): string[] {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return ['']
  if (palavras.length === 1) return [palavras[0].toUpperCase()]
  return [palavras[0].toUpperCase(), palavras.slice(1).join(' ').toUpperCase()]
}

/**
 * O `adjustsFontSizeToFit` da RN em CSS: a linha nasce no corpo pedido
 * (fração da coluna) e só encolhe quando a contagem de caracteres não cabe em
 * `ocupacao` da largura.
 */
function corpoQueCabe(texto: string, fracaoMax: number, ocupacao = 0.92): string {
  const chars = Math.max(texto.length, 1)
  const fracao = Math.min(fracaoMax, ocupacao / (chars * LARGURA_CAPS))
  return larg(fracao)
}

/**
 * Reparte o texto da casa entre as DUAS vozes que o mostram, para o mesmo
 * texto não aparecer duas vezes na mesma rolagem: o STATEMENT leva a primeira
 * oração em caps gigantes (o manifesto da referência) e o cartão da casa leva
 * o que sobra. Oração curta ou longa demais não vira caps gigantes — aí o
 * statement usa a frase de DNA e o cartão fica com o texto inteiro.
 */
function repartirDescricao(descricao: string | null | undefined): {
  manifesto: string
  detalhe: string | null
} {
  const texto = descricao?.trim() ?? ''
  if (!texto) return { manifesto: STATEMENT_PADRAO, detalhe: null }

  const corte = texto.search(/[—.!?]/)
  const primeira = (corte === -1 ? texto : texto.slice(0, corte)).trim()
  if (primeira.length < 8 || primeira.length > 54) {
    return { manifesto: STATEMENT_PADRAO, detalhe: texto }
  }
  const resto = corte === -1 ? '' : texto.slice(corte + 1).trim()
  return { manifesto: primeira.toUpperCase(), detalhe: resto || null }
}

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const ID_CARDAPIO = 'cardapio'

export function VitrineForno({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  // Fotos da casa: banner na frente, produtos completando — o hero e o alvo
  // pegam uma cada, sem repetir.
  const fotos = useMemo(() => {
    const urls = [store.banner_url, ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls))
  }, [store.banner_url, secoes])

  // Seção do pôster (o cartaz de ouro); sem ela, os primeiros itens com foto
  // servem de cartaz — o bloco nunca fica vazio.
  const secaoPoster = useMemo(
    () => secoes.find((s) => /pizza|favorit|destaque|especia|da casa/i.test(s.titulo)),
    [secoes],
  )
  const doPoster = useMemo(
    () =>
      (secaoPoster?.produtos ?? secoes.flatMap((s) => s.produtos))
        .filter((p) => fotoDisco(p) !== null)
        .slice(0, 4),
    [secaoPoster, secoes],
  )
  // A seção do cartaz só sai do cardápio quando o cartaz mostra TODOS os seus
  // itens. Numa pizzaria de verdade "Pizzas" tem 18 sabores e o cartaz leva 4:
  // tirá-la esconderia os outros 14 da loja inteira — e, se nenhum item tivesse
  // foto, o cartaz nem renderiza e a seção sumiria por completo. Repetir 4
  // itens no cardápio é barato; perder produto, não.
  const secoesCardapio = useMemo(
    () => secoes.filter((s) => s !== secaoPoster || doPoster.length < s.produtos.length),
    [secoes, secaoPoster, doPoster],
  )

  // O manifesto do statement e o texto do cartão da casa saem do MESMO texto,
  // repartido — o `conteudo.manifesto` do lojista quando existe, senão a
  // descrição da loja (a derivação da RN). O hero não o imprime: a referência
  // não tem parágrafo no hero — é wordmark, botão e pizza.
  const { manifesto, detalhe } = useMemo(
    () => repartirDescricao(conteudo.manifesto ?? store.descricao),
    [conteudo.manifesto, store.descricao],
  )

  const vazio = secoes.every((s) => s.produtos.length === 0)

  const rolarParaCardapio = useCallback(() => {
    document.getElementById(ID_CARDAPIO)?.scrollIntoView({
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
        // TODO(2b): PDP própria (ProdutoForno — palco de anéis concêntricos)
        // no lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <FonteDna familias={[['Archivo Black', [400]]]} />
            <CartPersistence />

            {/* Chrome: dois botões creme com fio e sombra — legíveis sobre o
                preto do hero, o ouro do pôster e o creme da página. À
                esquerda a casa (logo ou coroa) leva ao topo; à direita, a
                sacola. `h-0` sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-0 z-30 h-0">
              <div className="pointer-events-none flex items-start justify-between px-screen-x pt-3">
                <div className="pointer-events-auto">
                  <BotaoForno href="/" rotulo={`${store.nome} — início da loja`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <Coroa tamanho={20} cor="var(--ink, #111216)" />
                    )}
                  </BotaoForno>
                </div>
                <div className="pointer-events-auto">
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <BotaoForno
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

            {/* ── Hero: bloco preto, coroa, wordmark ouro e o disco vazando ── */}
            {/* O z-index mora AQUI, e não no hero: é este o irmão direto das
                outras seções, e é o que deixa o disco descer por cima do ouro
                em vez de ser coberto por ele. */}
            <div className="relative z-[2]">
              <HeroForno
                nome={store.nome}
                titulo={campanha?.titulo ?? store.nome}
                eyebrow={campanha?.eyebrow ?? null}
                subtitulo={campanha?.subtitulo ?? null}
                cta={campanha?.cta ?? 'Ver cardápio'}
                foto={fotos[0] ?? null}
                // Só há para onde vazar se o bloco de ouro vier logo abaixo:
                // sem pôster, o disco desceria por cima do statement no creme.
                vazar={doPoster.length > 0}
                aoVerCardapio={rolarParaCardapio}
              />
            </div>

            {vazio ? (
              <VazioForno />
            ) : (
              <>
                {/* ── Cardápio-pôster: um disco por vez sobre o ouro ── */}
                <PosterForno
                  rotulo={secaoPoster?.titulo ?? 'As pizzas da casa'}
                  produtos={doPoster}
                  temDiscoVazando={!!fotos[0]}
                  aoAbrirProduto={aoAbrirProduto}
                />

                {/* ── Statement: o manifesto em caps vermelhas sobre o creme ── */}
                <StatementForno frase={manifesto} />

                {/* ── Alvo: a pizza sobre os anéis, no cartão vermelho ── */}
                {fotos.length > 0 && <AlvoForno nome={store.nome} foto={fotos[1] ?? fotos[0]} />}

                {/* ── A casa: badges redondos, texto e o line-art fantasma ── */}
                {detalhe && <CasaForno nome={store.nome} descricao={detalhe} />}

                {/* ── Cardápio: a lista completa sobre o creme ── */}
                <section id={ID_CARDAPIO} className="scroll-mt-3 px-screen-x pt-11" aria-label="Cardápio">
                  {secoesCardapio.map((secao) => (
                    <SecaoCardapio key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ))}
                </section>
              </>
            )}

            {/* ── Fecho: bloco preto com coroa, nome e relógio ── */}
            <FechoForno store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — bloco preto, coroa, wordmark ouro e o disco vazando
// ─────────────────────────────────────────────────────────────

function HeroForno({
  nome,
  titulo,
  eyebrow,
  subtitulo,
  cta,
  foto,
  vazar,
  aoVerCardapio,
}: {
  nome: string
  titulo: string
  eyebrow: string | null
  subtitulo: string | null
  cta: string
  foto: string | null
  vazar: boolean
  aoVerCardapio: () => void
}) {
  const linhas = partirWordmark(titulo)
  const campanhaDiferente = titulo !== nome

  return (
    <header
      className="relative flex min-h-[min(82svh,760px)] flex-col items-center pt-[84px]"
      style={{ backgroundColor: PRETO_FORNO }}
    >
      {/* Veios de mármore: o relevo quase imperceptível do fundo da ref. Num
          wrapper `overflow-hidden` próprio para o disco continuar vazando. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[20%] -top-[30vw] aspect-[11/9] w-[110%] rounded-full"
          style={{ backgroundColor: comAlfa('#FFFFFF', 0.03) }}
        />
        <div
          className="absolute -right-[40%] top-[30%] aspect-[95/75] w-[95%] rounded-full"
          style={{ backgroundColor: comAlfa('#FFFFFF', 0.025) }}
        />
      </div>

      <Coroa tamanho={larg(0.1)} cor={OURO} className="relative" />

      {eyebrow && (
        <p
          className="relative mt-4 font-body text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: comAlfa(CREME_FIXO, 0.85) }}
        >
          {eyebrow}
        </p>
      )}

      {/* Wordmark: as linhas esmagadas em ouro sobre o preto. */}
      <h1 className="relative mt-[14px] flex w-full flex-col items-center px-[18px]" style={{ color: OURO }}>
        {/* Índice como chave: "Pizza Pizza" partiria em duas linhas iguais. */}
        {linhas.map((linha, i) => (
          <span
            key={i}
            className="block max-w-full whitespace-nowrap text-center leading-[1.02] tracking-[-1px]"
            style={{ ...BLACK, fontSize: corpoQueCabe(linha, 0.19) }}
          >
            {linha}
          </span>
        ))}
      </h1>

      {/* O nome da casa só aparece aqui quando a campanha tomou o wordmark. */}
      {campanhaDiferente && (
        <p
          className="relative mt-3 font-body text-[13px] font-semibold uppercase tracking-[1.6px]"
          style={{ color: comAlfa(CREME_FIXO, 0.8) }}
        >
          {nome}
        </p>
      )}

      {/* Parágrafo só quando o lojista o escreveu: a referência é wordmark,
          botão e pizza. */}
      {subtitulo && (
        <p
          className="relative mt-4 max-w-[34ch] px-screen-x text-center font-body text-[15px] font-medium leading-snug"
          style={{ color: comAlfa(CREME_FIXO, 0.85) }}
        >
          {subtitulo}
        </p>
      )}

      {/* CTA: o retângulo-pill vermelho da referência. */}
      <a
        href={`#${ID_CARDAPIO}`}
        onClick={(e) => {
          e.preventDefault()
          aoVerCardapio()
        }}
        className="relative mt-[30px] inline-flex items-center gap-2 rounded-[14px] bg-accent px-[30px] py-4 font-body text-[13px] font-bold uppercase tracking-[1.6px] text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
      >
        {cta}
        <IconeTraco nome="chevron-down" tamanho={15} espessura={2.4} />
      </a>

      {/* O `flex: 1` da RN: empurra o disco para o pé do bloco. */}
      <div className="min-h-[30px] flex-1" aria-hidden />

      {/* O disco desce por cima do ouro — o overlap da referência. */}
      {foto ? (
        <PizzaRedonda
          src={foto}
          alt=""
          tamanho={`${DISCO_HERO * 100}%`}
          sombra
          carregamento="eager"
          className="relative"
          style={{ marginBottom: vazar ? `-${(VAZAMENTO * 100).toFixed(1)}%` : 24 }}
        />
      ) : (
        <div className="pb-4" aria-hidden />
      )}
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio-pôster — um disco por vez sobre o bloco de ouro
// ─────────────────────────────────────────────────────────────

function PosterForno({
  rotulo,
  produtos,
  temDiscoVazando,
  aoAbrirProduto,
}: {
  rotulo: string
  produtos: ProdutoCatalogo[]
  temDiscoVazando: boolean
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const [indice, setIndice] = useState(0)

  const aoRolar = useCallback(() => {
    const el = trilhoRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setIndice((atual) => (atual === i ? atual : i))
  }, [])

  const irPara = useCallback((i: number) => {
    const el = trilhoRef.current
    if (!el) return
    const alvo = Math.max(0, Math.min(i, el.children.length - 1))
    el.scrollTo({ left: alvo * el.clientWidth, behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })
  }, [])

  if (produtos.length === 0) return null
  const varios = produtos.length > 1

  return (
    <section
      className="relative flex flex-col items-center pb-12"
      style={{
        backgroundColor: OURO,
        // O respiro do topo é o que o disco do hero ocupa; sem disco, o bloco
        // volta ao seu próprio respiro. `%` de padding é relativo à largura —
        // o mesmo referencial do disco.
        paddingTop: temDiscoVazando ? `calc(${(VAZAMENTO * 100).toFixed(1)}% + 34px)` : 46,
      }}
      aria-label={rotulo}
    >
      <h2
        className="px-screen-x text-center font-body text-[12px] font-bold uppercase tracking-[2.4px]"
        style={{ color: TINTA_OURO }}
      >
        {rotulo}
      </h2>

      {/* Um item por vez: trilho com snap horizontal, cada cartaz ocupa a
          coluna inteira. Sem animação própria — só o scroll do visitante. */}
      <div
        ref={trilhoRef}
        onScroll={aoRolar}
        className="mt-10 flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {produtos.map((p) => (
          <ItemPoster key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
        ))}
      </div>

      {varios && (
        <div className="mt-7 flex items-center gap-4">
          <BotaoPager direcao="chevron-left" rotulo="Anterior" desabilitado={indice === 0} aoTocar={() => irPara(indice - 1)} />
          <div className="flex items-center gap-2" role="tablist" aria-label="Posição no cartaz">
            {produtos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === indice}
                aria-label={`${i + 1} de ${produtos.length}: ${p.nome}`}
                onClick={() => irPara(i)}
                className="h-2 rounded-full transition-[width,opacity] duration-200 motion-reduce:transition-none"
                style={{
                  width: i === indice ? 22 : 8,
                  backgroundColor: TINTA_OURO,
                  opacity: i === indice ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <BotaoPager
            direcao="chevron-right"
            rotulo="Próximo"
            desabilitado={indice >= produtos.length - 1}
            aoTocar={() => irPara(indice + 1)}
          />
        </div>
      )}
    </section>
  )
}

/** Setas do pager: fio na tinta do ouro, sem preenchimento. */
function BotaoPager({
  direcao,
  rotulo,
  desabilitado,
  aoTocar,
}: {
  direcao: 'chevron-left' | 'chevron-right'
  rotulo: string
  desabilitado: boolean
  aoTocar: () => void
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={aoTocar}
      className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] transition-opacity disabled:opacity-30"
      style={{ borderColor: comAlfa(TINTA_OURO, 0.35), color: TINTA_OURO }}
    >
      <IconeTraco nome={direcao} tamanho={16} espessura={2.2} />
    </button>
  )
}

function ItemPoster({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const promo = temPromo(produto)
  const disco = fotoDisco(produto)

  return (
    <div className="flex w-full shrink-0 snap-center flex-col items-center px-screen-x">
      <button
        type="button"
        onClick={aoTocar}
        className="flex w-full flex-col items-center text-center transition-opacity active:opacity-90"
      >
        {disco && (
          <PizzaRedonda
            src={disco.src}
            alt=""
            tamanho="72%"
            // Recorte é PNG solto: sem fio e sem círculo — a pizza já é redonda.
            anel={disco.recorte ? undefined : comAlfa(TINTA_OURO, 0.15)}
            style={disco.recorte ? { borderRadius: 0, objectFit: 'contain' } : undefined}
          />
        )}

        {/* O nome gigante em vermelho sobre o ouro. O par de cores vale como
            AA LARGE (≥ 3), e "large" é ≥ 24px em peso — o corpo base é 37px e
            nomes compridos ganham até 3 linhas em vez de encolher. */}
        <span
          className="mt-4 line-clamp-3 w-full text-accent uppercase tracking-[-0.8px]"
          style={{
            ...BLACK,
            fontSize: 'calc(37px * var(--type-factor, 1))',
            lineHeight: 'calc(38px * var(--type-factor, 1))',
          }}
        >
          {produto.nome}
        </span>

        <span className="mt-[10px] flex items-baseline gap-2 font-body">
          <span className="text-[15px] font-bold tracking-[0.4px]" style={{ color: TINTA_OURO }}>
            {formatarReais(precoFinalDe(produto))}
          </span>
          {promo && (
            <span className="text-[13px] font-medium line-through" style={{ color: comAlfa(TINTA_OURO, 0.65) }}>
              {formatarReais(produto.preco)}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Statement — o manifesto em caps vermelhas sobre o creme
// ─────────────────────────────────────────────────────────────

function StatementForno({ frase }: { frase: string }) {
  return (
    <section className="px-screen-x pb-[34px] pt-[54px]" aria-label="Manifesto da casa">
      <p
        className="text-center text-accent tracking-[-0.6px]"
        style={{
          ...BLACK,
          fontSize: 'calc(31px * var(--type-factor, 1))',
          lineHeight: 'calc(33px * var(--type-factor, 1))',
        }}
      >
        {frase}
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Alvo — a pizza sobre os anéis, no cartão vermelho
// ─────────────────────────────────────────────────────────────

function AlvoForno({ nome, foto }: { nome: string; foto: string }) {
  return (
    <section
      className="mx-screen-x flex flex-col items-center overflow-hidden rounded-[28px] bg-accent pb-[30px] pt-[18px]"
      aria-label="Direto do forno"
    >
      {/* O nome atravessa o cartão e é CORTADO pelas bordas, como a palavra
          gigante que corre atrás da pizza na referência. Bem mais largo que o
          cartão (200%): o texto fica inteiro, e é a borda que o corta —
          `items-center` do flex centra o excesso para os dois lados. */}
      <span
        aria-hidden
        className="block w-[200%] shrink-0 whitespace-nowrap text-center leading-[1.1] tracking-[-1.5px]"
        style={{ ...BLACK, color: OURO, fontSize: larg(0.19) }}
      >
        {nome.toUpperCase()}
      </span>

      <div className="relative -mt-[5%] flex aspect-square w-[90%] items-center justify-center">
        <CirculosConcentricos cor={comAlfa(CREME_FIXO, 0.28)} className="absolute inset-0 h-full w-full" />
        <PizzaRedonda src={foto} alt="" tamanho="62%" className="relative" />
      </div>

      <p
        className="mt-[10px] font-body text-[11.5px] font-bold uppercase tracking-[2.2px]"
        style={{ color: comAlfa(CREME_FIXO, 0.9) }}
      >
        Direto do forno
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// A casa — badges redondos e o line-art fantasma de cozinha
// ─────────────────────────────────────────────────────────────

function CasaForno({ nome, descricao }: { nome: string; descricao: string }) {
  const fantasma = tokenComAlfa('--ink', 0.09)
  return (
    <section
      className="relative mx-screen-x mt-[22px] flex flex-col items-center overflow-hidden rounded-[28px] border border-line bg-surface px-[26px] py-[34px]"
      aria-label={`Sobre ${nome}`}
    >
      {/* Fantasmas de cozinha nos cantos — traço quase invisível, como na ref. */}
      <RabiscoCozinha largura={larg(0.09)} cor={fantasma} motivo="garfo" className="absolute left-[14px] top-4" />
      <RabiscoCozinha
        largura={larg(0.26)}
        cor={fantasma}
        motivo="raminho"
        className="absolute bottom-[10px] right-2"
      />

      <div className="relative flex gap-[10px]">
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent">
          <Coroa tamanho={22} cor="var(--accent-ink, #111216)" />
        </span>
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent">
          <Fatia tamanho={21} cor="var(--accent-ink, #111216)" />
        </span>
      </div>

      <h2
        className="relative mt-[18px] text-center font-display font-extrabold uppercase tracking-[0.2px] text-accent"
        style={{
          fontSize: 'calc(21px * var(--type-factor, 1))',
          lineHeight: 'calc(26px * var(--type-factor, 1))',
        }}
      >
        {nome}
      </h2>

      <p className="relative mt-3 text-center font-body text-[15px] leading-[23px] text-ink-muted">{descricao}</p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — a lista completa sobre o creme
// ─────────────────────────────────────────────────────────────

function SecaoCardapio({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <div id={idDaSecao(secao.chave)} className="mb-[30px] scroll-mt-16">
      <h2
        className="font-display font-extrabold uppercase tracking-[0.6px] text-accent"
        style={{
          fontSize: 'calc(20px * var(--type-factor, 1))',
          lineHeight: 'calc(26px * var(--type-factor, 1))',
        }}
      >
        {secao.titulo}
      </h2>
      <div className="mb-1 mt-3 h-px bg-line" aria-hidden />

      <ul className="m-0 list-none p-0">
        {secao.produtos.map((p) => {
          const promo = temPromo(p)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => aoAbrirProduto(p)}
                className="flex w-full items-center gap-[14px] py-[14px] text-left transition-opacity hover:opacity-80 active:opacity-70"
              >
                {p.foto_url && (
                  <PizzaRedonda src={p.foto_url} alt="" tamanho={56} anel={tokenComAlfa('--ink', 0.1)} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-[16px] font-bold text-ink">{p.nome}</span>
                  {p.descricao && (
                    <span className="mt-[3px] block truncate font-body text-[13px] text-ink-muted">
                      {p.descricao}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end font-body">
                  <span className="text-[15px] font-bold text-accent">{formatarReais(precoFinalDe(p))}</span>
                  {promo && (
                    <span className="text-[12px] font-medium text-ink-muted line-through">
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
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioForno() {
  return (
    <section
      id={ID_CARDAPIO}
      className="mx-screen-x mt-12 flex flex-col items-center rounded-[28px] border border-line bg-surface px-[26px] py-[40px] text-center"
    >
      <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent">
        <Fatia tamanho={21} cor="var(--accent-ink, #111216)" />
      </span>
      <p
        className="mt-5 text-accent tracking-[-0.4px]"
        style={{
          ...BLACK,
          fontSize: 'calc(24px * var(--type-factor, 1))',
          lineHeight: 'calc(27px * var(--type-factor, 1))',
        }}
      >
        O FORNO AINDA ESTÁ ESQUENTANDO
      </p>
      <p className="mt-3 font-body text-[15px] leading-[23px] text-ink-muted">
        Esta casa ainda não colocou o cardápio na vitrine. Volte em breve.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — bloco preto com coroa, nome e relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoForno({ store }: { store: VitrineWebProps['store'] }) {
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
  const hora = agora
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null
  const tempo = store.tempo_entrega
  const meta = [
    hoje ? `HOJE ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} MIN` : null,
    store.taxa_entrega === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter((m): m is string => !!m)

  const nome = store.nome.toUpperCase()
  const linha = comAlfa(CREME_FIXO, 0.14)

  return (
    <footer
      className="mt-[34px] flex flex-col items-center px-6 pb-12 pt-[42px] text-center"
      style={{ backgroundColor: PRETO_FORNO }}
    >
      <Coroa tamanho={larg(0.075)} cor={OURO} />

      <p
        className="mt-[14px] max-w-full whitespace-nowrap tracking-[-0.5px]"
        style={{ ...BLACK, color: OURO, fontSize: `min(32px, ${corpoQueCabe(nome, 0.19, 0.88)})` }}
      >
        {nome}
      </p>

      {meta.length > 0 && (
        <p
          className="mt-3 font-body text-[11px] font-semibold tracking-[1.8px]"
          style={{ color: comAlfa(CREME_FIXO, 0.85) }}
          suppressHydrationWarning
        >
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto
        horarios={store.horarios}
        className="mt-2 font-body text-[12px] font-semibold tracking-[0.6px] text-[#F6EFDE]/70"
      />

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-4 font-body text-[13px] font-semibold underline-offset-2 hover:underline"
          style={{ color: comAlfa(CREME_FIXO, 0.85) }}
        >
          {store.telefone}
        </a>
      )}

      <div
        className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t pt-5 font-body text-[11px]"
        style={{ borderColor: linha, color: comAlfa(CREME_FIXO, 0.62) }}
      >
        <a href="https://mallevo.com.br" className="font-bold transition-colors hover:text-[#F6EFDE]">
          Uma loja do Mallevo
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="transition-colors hover:text-[#F6EFDE]">
            Termos
          </a>
          <a href="/privacidade" className="transition-colors hover:text-[#F6EFDE]">
            Privacidade
          </a>
        </span>
      </div>
    </footer>
  )
}
