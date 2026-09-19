'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
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
import { BotaoAdesivo, FotoAdesivo, Rabisco, SeloRecortado, comAlfa, larg, tokenComAlfa } from './horta-ui'

/**
 * Vitrine horta — layout PRÓPRIO do arquétipo `garden` para comida saudável e
 * cafés naturais (docs/store-theme/02 §A6 e 05 "Vitrine horta"; referência:
 * Sonder & Sprout). Port web de
 * apps/mobile-consumer/components/loja/LojaHorta.tsx.
 *
 * DNA destilado da referência:
 * - PÁGINA CREME com seções FULL-BLEED empilhadas (o oposto da ritual, onde
 *   tudo flutua em cartão): as faixas coloridas sangram de borda a borda;
 * - HERO verde-floresta com o wordmark GIGANTE em caps gordas ROSA empilhado
 *   em duas linhas e um SELO RECORTADO creme carregando o conector "&";
 * - FOTO-ADESIVO (moldura branca de cantos assimétricos, levemente girada)
 *   pendurada na virada do verde para o creme;
 * - FAVORITOS em cartões PASTEL alternados (rosa/caramelo) com selo girado no
 *   canto, e a ficha do item escrita DIRETO no creme (rótulo tan + nome em
 *   serifa + linha de ingredientes);
 * - SOBRE com assinatura MANUSCRITA e pill rosa que rola até o cardápio;
 * - VISITE em caramelo com o horário de hoje, e fecho em faixa verde.
 *
 * Três vozes tipográficas: serifa macia (display do tema) nos títulos, sans
 * arredondada (body) no corpo, e duas fontes que são DNA DESTE layout — a
 * Baloo 2 gorda do wordmark e a Caveat da assinatura — carregadas pela
 * `FonteDna`, não pela pele.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — no lugar,
 * a logo/inicial da casa leva ao topo), a barra de menu inferior
 * (Início/Explorar/Pedidos/Perfil é navegação do app), a virada da status bar
 * e a transição de saída radial. A sacola vive no chrome (sem FAB — regra das
 * vitrines).
 */

// ── DNA fixo da vitrine (independe da paleta; ela troca creme/verde) ──
/** Rosa-pastel dos cartões, pills e do wordmark sobre o verde. */
const ROSA = '#F2BCC9'
/** Caramelo da seção "visite" e dos cartões alternados. */
const CARAMELO = '#DCA57F'
/** Amarelo do blob decorativo — NUNCA carrega texto. */
const AMARELO = '#F2C34E'
/**
 * Tinta ÚNICA de tudo que é escrito sobre os pastéis. Fixa (e não `--ink`)
 * porque as paletas curadas trocam a tinta do tema: no vinho da `beterraba`
 * o texto do cartão rosa cairia abaixo de AA. 7,68:1 no rosa e 5,83:1 no
 * caramelo — validado para as três peles.
 */
const TINTA_PASTEL = '#22391B'
/** Rótulo de categoria escrito direto no creme (4,88:1 na pele default). */
const TAN_ROTULO = '#8A6038'

/** Frases da faixa marquee — humor de marca, neutro de nicho. */
const MARQUEE = ['SABOR DE VERDADE', 'INGREDIENTES DA ESTAÇÃO', 'FEITO À MÃO', 'SEM ATALHOS']

/**
 * As duas fontes que são DNA DESTE layout: a Baloo gorda do wordmark e a
 * Caveat da assinatura. Enquanto não chegam (ou se falharem), caem no
 * display/body do tema. Muda o sabor da assinatura, nunca o layout.
 */
const BALOO: CSSProperties = {
  fontFamily: '"Baloo 2", var(--font-display), var(--font-jakarta), sans-serif',
  fontWeight: 800,
}
const CAVEAT: CSSProperties = {
  fontFamily: '"Caveat", var(--font-body), cursive',
  fontWeight: 700,
}

/** Largura média das caixas-altas da Baloo 2 em em — para o "adjustsFontSizeToFit". */
const LARGURA_CAPS = 0.66

const ID_CARDAPIO = 'cardapio'

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * Foto do CARTÃO pastel: o `recorte` (PNG de fundo transparente) quando o
 * lojista subiu um — o adesivo solto da referência, `contain` —, senão a foto
 * enquadrada com raio.
 */
function fotoCartao(p: ProdutoCatalogo): { src: string; recorte: boolean } | null {
  const meta = lerMetadataProduto(p.metadata)
  if (meta.recorte) return { src: meta.recorte, recorte: true }
  if (p.foto_url) return { src: p.foto_url, recorte: false }
  return null
}

/**
 * Wordmark em duas linhas com o conector virando selo, como na referência.
 * "Broto & Grão" → linhas BROTO / GRÃO e o "&" carimbado entre elas. Sem
 * conector, o selo carrega a inicial da casa e a quebra cai depois da 1ª
 * palavra — a silhueta de duas linhas é a assinatura do hero.
 */
function partirWordmark(nome: string): { linhas: string[]; selo: string } {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return { linhas: [''], selo: '?' }

  const iConector = palavras.findIndex((p, i) => i > 0 && i < palavras.length - 1 && /^(&|e|and)$/i.test(p))
  if (iConector > 0) {
    return {
      linhas: [
        palavras.slice(0, iConector).join(' ').toUpperCase(),
        palavras.slice(iConector + 1).join(' ').toUpperCase(),
      ],
      // "e"/"and" também viram "&": o que o selo carrega é o glifo do
      // carimbo, não a palavra literal do nome.
      selo: '&',
    }
  }

  const linhas =
    palavras.length > 1
      ? [palavras[0].toUpperCase(), palavras.slice(1).join(' ').toUpperCase()]
      : [palavras[0].toUpperCase()]
  return { linhas, selo: palavras[0].charAt(0).toUpperCase() }
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

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Hora de parede da LOJA, viva. Nasce vazia para o servidor (UTC) e o cliente
 * não divergirem na hidratação; meio minuto basta pra nunca mostrar hora
 * velha sem acordar a página à toa.
 */
function useRelogioLoja(): Date | null {
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 30_000)
    return () => clearInterval(id)
  }, [])
  return agora
}

export function VitrineHorta({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha
  const agora = useRelogioLoja()

  // Fotos da casa: banner na frente, produtos completando — o hero, o bloco
  // "sobre" e o "visite" pegam uma cada, sem repetir.
  const fotos = useMemo(() => {
    const urls = [store.banner_url, ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls))
  }, [store.banner_url, secoes])

  // Seção de favoritos (o carrossel-assinatura); sem ela, os primeiros itens
  // com foto servem de vitrine — o cartão nunca fica vazio.
  const secaoFavoritos = useMemo(
    () => secoes.find((s) => /favorit|destaque|especia|assinatura/i.test(s.titulo)),
    [secoes],
  )
  const favoritos = useMemo(
    () =>
      (secaoFavoritos?.produtos ?? secoes.flatMap((s) => s.produtos).filter((p) => fotoCartao(p) !== null)).slice(
        0,
        6,
      ),
    [secaoFavoritos, secoes],
  )
  // A seção eleita só sai do cardápio quando o carrossel mostra TODOS os seus
  // itens (a regra que a vitrine forno aprendeu do jeito difícil): com 6 de
  // teto, uma "Favoritos" de 9 itens esconderia 3 da loja inteira.
  const secoesCardapio = useMemo(
    () => secoes.filter((s) => s !== secaoFavoritos || favoritos.length < s.produtos.length),
    [secoes, secaoFavoritos, favoritos],
  )

  // Texto da casa: o `conteudo.manifesto` do lojista quando existe, senão a
  // descrição da loja (a derivação da RN).
  const textoDaCasa = (conteudo.manifesto ?? store.descricao)?.trim() || null

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
        // TODO(2b): PDP própria (ProdutoHorta — palco pastel estável pelo id,
        // selo no canto e CTA rosa que vira verde "NA SACOLA ✓") no lugar do
        // ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <FonteDna
              familias={[
                ['Baloo 2', [800]],
                ['Caveat', [700]],
              ]}
            />
            <CartPersistence />

            {/* Chrome: dois botões-adesivo fixos. Creme com fio e sombra —
                legíveis tanto sobre o verde do hero quanto sobre o creme da
                página. À esquerda a casa (logo ou inicial) leva ao topo; à
                direita, a sacola. `h-0` sticky: fica sobre a rolagem sem
                empurrar nada. */}
            <div className="sticky top-0 z-30 h-0">
              <div className="pointer-events-none flex items-start justify-between px-screen-x pt-3">
                <div className="pointer-events-auto">
                  <BotaoAdesivo href="/" rotulo={`${store.nome} — início da loja`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-[18px] leading-none text-ink" style={BALOO} aria-hidden>
                        {store.nome.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </BotaoAdesivo>
                </div>
                <div className="pointer-events-auto">
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <BotaoAdesivo
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

            {/* ── Hero: verde, wordmark com selo e a foto-adesivo pendurada ── */}
            {/* O z-index mora AQUI, e não no hero: é este o irmão direto das
                outras seções, e é o que deixa a foto-adesivo pender por cima
                do creme em vez de ser coberta por ele. */}
            <div className="relative z-[2]">
              <HeroHorta
                nome={store.nome}
                titulo={campanha?.titulo ?? store.nome}
                eyebrow={campanha?.eyebrow ?? null}
                subtitulo={campanha?.subtitulo ?? null}
                foto={fotos[0] ?? null}
              />
            </div>

            {/* Respiro do creme onde a foto-adesivo do hero se pendura. */}
            <div className={fotos[0] ? 'h-[92px]' : 'h-6'} aria-hidden />

            {/* ── Faixa marquee: o ticker verde de manifesto ── */}
            <MarqueeHorta frases={MARQUEE} />

            {vazio ? (
              <VazioHorta />
            ) : (
              <>
                {/* ── Favoritos: cartões pastel com selo, ficha no creme ── */}
                {favoritos.length > 0 && (
                  <FavoritosHorta
                    nome={store.nome}
                    rotulo={secaoFavoritos?.titulo ?? 'Da casa'}
                    produtos={favoritos}
                    aoAbrirProduto={aoAbrirProduto}
                  />
                )}

                {/* ── Sobre: texto da casa, assinatura manuscrita e pill rosa ── */}
                {textoDaCasa && (
                  <SobreHorta
                    nome={store.nome}
                    texto={textoDaCasa}
                    cta={campanha?.cta ?? 'Ver cardápio'}
                    foto={fotos[1] ?? fotos[0] ?? null}
                    aoVerCardapio={rolarParaCardapio}
                  />
                )}

                {/* ── Cardápio: a lista completa em serifa sobre o creme ── */}
                <section id={ID_CARDAPIO} className="scroll-mt-3 px-screen-x pt-10" aria-label="Cardápio">
                  {secoesCardapio.map((secao) => (
                    <SecaoCardapio key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                  ))}
                </section>
              </>
            )}

            {/* ── Visite: faixa caramelo com o horário de hoje ── */}
            <VisiteHorta
              store={store}
              agora={agora}
              foto={fotos[2] ?? fotos[0] ?? null}
              aoPedir={rolarParaCardapio}
            />

            {/* ── Fecho: faixa verde com selo, nome e relógio ── */}
            <FechoHorta store={store} agora={agora} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — verde, wordmark rosa com selo e foto-adesivo pendurada
// ─────────────────────────────────────────────────────────────

function HeroHorta({
  nome,
  titulo,
  eyebrow,
  subtitulo,
  foto,
}: {
  nome: string
  titulo: string
  eyebrow: string | null
  subtitulo: string | null
  foto: string | null
}) {
  const { linhas, selo } = partirWordmark(titulo)
  const campanhaDiferente = titulo !== nome
  const ladoSelo = larg(0.27)
  const linhaClasse = 'block max-w-full whitespace-nowrap text-center leading-[1.05] tracking-[-0.5px]'

  return (
    <header className="relative flex min-h-[min(70svh,680px)] flex-col items-center bg-accent pt-[86px]">
      {/* Blobs tom-sobre-tom: o relevo orgânico do fundo da referência. Num
          wrapper `overflow-hidden` próprio para a foto continuar pendendo. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute aspect-square rounded-full"
          style={{
            top: `calc(-1 * ${larg(0.25)})`,
            right: `calc(-1 * ${larg(0.3)})`,
            width: larg(0.9),
            backgroundColor: comAlfa('#FFFFFF', 0.05),
          }}
        />
        <div
          className="absolute top-[37%] aspect-square rounded-full"
          style={{
            left: `calc(-1 * ${larg(0.35)})`,
            width: larg(0.8),
            backgroundColor: comAlfa('#FFFFFF', 0.04),
          }}
        />
      </div>

      {eyebrow && (
        <p
          className="relative mb-3 font-body text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: comAlfa(ROSA, 0.95) }}
        >
          {eyebrow}
        </p>
      )}

      {/* Wordmark: linhas gordas em rosa com o selo carimbado no meio. */}
      <h1 className="relative flex w-full flex-col items-center px-[18px]" style={{ color: ROSA }}>
        <span className={linhaClasse} style={{ ...BALOO, fontSize: corpoQueCabe(linhas[0], 0.185) }}>
          {linhas[0]}
        </span>

        {/* Negativos dos dois lados: o selo morde as duas linhas, como o
            carimbo da referência. z-index porque o irmão seguinte (a 2ª
            linha) desenharia por cima dele. Sem 2ª linha, ele só morde a 1ª. */}
        <SeloRecortado
          tamanho={ladoSelo}
          cor="var(--accent-ink, #F7F1DE)"
          rotacao={-8}
          className="z-[2]"
          style={{
            marginTop: `calc(${ladoSelo} * -0.34)`,
            marginBottom: linhas[1] ? `calc(${ladoSelo} * -0.34)` : 0,
          }}
        >
          <span className="text-accent" style={{ ...BALOO, fontSize: `calc(${ladoSelo} * 0.42)`, lineHeight: 1 }}>
            {selo}
          </span>
        </SeloRecortado>

        {linhas[1] && (
          <span className={linhaClasse} style={{ ...BALOO, fontSize: corpoQueCabe(linhas[1], 0.185) }}>
            {linhas[1]}
          </span>
        )}
      </h1>

      {/* O nome da casa só aparece aqui quando a campanha tomou o wordmark. */}
      {campanhaDiferente && (
        <p
          className="relative mt-3 font-body text-[13px] font-semibold uppercase tracking-[1.6px]"
          style={{ color: tokenComAlfa('--accent-ink', 0.85, '#F7F1DE') }}
        >
          {nome}
        </p>
      )}

      <Rabisco
        largura={larg(0.16)}
        cor={tokenComAlfa('--accent-ink', 0.75, '#F7F1DE')}
        className="relative ml-[22px] mt-[18px] self-start"
      />

      {/* Parágrafo só quando o lojista o escreveu: a referência é wordmark,
          selo e foto. */}
      {subtitulo && (
        <p
          className="relative mt-3 max-w-[34ch] px-screen-x text-center font-body text-[15px] font-medium leading-snug"
          style={{ color: tokenComAlfa('--accent-ink', 0.9, '#F7F1DE') }}
        >
          {subtitulo}
        </p>
      )}

      {/* O `flex: 1` da RN: empurra a foto para a virada do bloco. */}
      <div className="min-h-[26px] flex-1" aria-hidden />

      {/* A foto-adesivo pendura na virada do verde para o creme. */}
      {foto ? (
        <FotoAdesivo
          src={foto}
          largura={larg(0.82)}
          proporcao={0.78}
          rotacao={-2.5}
          carregamento="eager"
          className="relative -mb-[84px]"
        />
      ) : (
        <div className="pb-6" aria-hidden />
      )}
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Marquee — o manifesto rolando em faixa verde
// ─────────────────────────────────────────────────────────────

/** Largura estimada de uma frase em caps 12,5px/1,6 + o "✦" com margens (px). */
function larguraEstimada(frase: string): number {
  return frase.length * 9.6 + 11 + 28
}

/**
 * Faixa verde com o manifesto em loop contínuo. Só CSS: o trilho tem DUAS
 * cópias idênticas de um bloco e anda a largura de uma (-50%) — o salto é
 * invisível. O bloco repete as frases até passar folgado da coluna (480px),
 * para nunca aparecer buraco no fim.
 *
 * ~32 px/s (passo de horta, mais calmo que o da lanchonete), estimado pela
 * contagem de caracteres. Com "reduzir movimento" a faixa fica ESTÁTICA,
 * como na RN.
 */
function MarqueeHorta({ frases }: { frases: string[] }) {
  const limpas = frases.map((f) => f.trim()).filter(Boolean)
  if (limpas.length === 0) return null

  // Repete até o bloco ter ~1000px estimados: ≥ 2× a coluna mais larga.
  const bloco: string[] = []
  let largura = 0
  while (largura < 1000 || bloco.length < limpas.length) {
    for (const f of limpas) {
      bloco.push(f)
      largura += larguraEstimada(f)
    }
  }
  const duracao = Math.max(10, Math.round(largura / 32))

  const Copia = ({ oculta }: { oculta?: boolean }) => (
    <span className="flex shrink-0 items-center" aria-hidden={oculta || undefined}>
      {bloco.map((frase, i) => (
        <span key={`${frase}-${i}`} className="flex items-center">
          <span className="font-body text-[12.5px] font-bold tracking-[1.6px] text-accent-ink">{frase}</span>
          <span className="mx-[14px] text-[11px]" style={{ color: comAlfa(ROSA, 0.9) }}>
            ✦
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className="overflow-hidden bg-accent py-[13px]"
      role="marquee"
      aria-label={`Manifesto: ${limpas.join(', ')}`}
    >
      <style>{`
        @keyframes horta-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .horta-marquee-trilho { animation: horta-marquee ${duracao}s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .horta-marquee-trilho { animation: none; } }
      `}</style>
      <div className="horta-marquee-trilho flex w-max">
        <Copia />
        <Copia oculta />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Favoritos — cartões pastel com selo, ficha escrita no creme
// ─────────────────────────────────────────────────────────────

function FavoritosHorta({
  nome,
  rotulo,
  produtos,
  aoAbrirProduto,
}: {
  nome: string
  rotulo: string
  produtos: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <section className="pt-11" aria-label="Favoritos">
      <div className="flex flex-col items-center px-screen-x">
        <h2
          className="font-display font-bold text-ink"
          style={{
            fontSize: 'calc(34px * var(--type-factor, 1))',
            lineHeight: 'calc(40px * var(--type-factor, 1))',
          }}
        >
          Favoritos
        </h2>
        <p className="mt-[10px] text-center font-body text-[15px] font-medium leading-[22px] text-ink-muted">
          Feitos com cuidado e pedidos de novo toda semana — os sabores que definem o {nome}.
        </p>
      </div>

      {/* Carrossel com snap: cada cartão ocupa 76% da coluna e para no
          gutter. O `pt` folgado é onde a foto e o selo escapam por cima da
          borda do cartão sem serem cortados pelo scroll. */}
      <div
        className="mt-[34px] flex snap-x snap-mandatory gap-[14px] overflow-x-auto overscroll-x-contain px-screen-x pb-2 pt-[20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingLeft: 'var(--space-screen-x, 24px)' }}
      >
        {produtos.map((p, i) => (
          <CartaoFavorito
            key={p.id}
            produto={p}
            rotulo={rotulo}
            // Pastéis alternados, como a fileira da referência.
            pastel={i % 2 === 0 ? ROSA : CARAMELO}
            aoTocar={() => aoAbrirProduto(p)}
          />
        ))}
      </div>
    </section>
  )
}

function CartaoFavorito({
  produto,
  rotulo,
  pastel,
  aoTocar,
}: {
  produto: ProdutoCatalogo
  rotulo: string
  pastel: string
  aoTocar: () => void
}) {
  const foto = fotoCartao(produto)
  const promo = temPromo(produto)

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="w-[76%] shrink-0 snap-start text-left transition-opacity active:opacity-90"
    >
      <div className="relative rounded-[34px]" style={{ backgroundColor: pastel, aspectRatio: '1 / 1.02' }}>
        {foto && (
          // A foto escapa por cima da borda: é o que dá o ar de adesivo
          // colado no cartão, e não de imagem enquadrada nele.
          <div className="absolute -top-[18px] bottom-4 left-4 right-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.src}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`block h-full w-full ${foto.recorte ? 'object-contain' : 'rounded-[26px] object-cover'}`}
            />
          </div>
        )}

        <SeloRecortado
          tamanho="28%"
          cor="var(--accent, #2E4B26)"
          rotacao={10}
          className="absolute -right-1.5 -top-3"
        >
          <span className="font-body text-[11px] font-bold tracking-[0.6px] text-accent-ink">
            {promo ? 'oferta' : 'da casa'}
          </span>
        </SeloRecortado>
      </div>

      {/* Ficha direto no creme — sem cartão, como na referência. */}
      <div className="mt-4">
        <span
          className="block truncate font-body text-[11px] font-bold uppercase tracking-[1.8px]"
          style={{ color: TAN_ROTULO }}
        >
          {rotulo}
        </span>
        <span
          className="mt-[6px] line-clamp-2 block font-display font-bold text-ink"
          style={{
            fontSize: 'calc(20px * var(--type-factor, 1))',
            lineHeight: 'calc(25px * var(--type-factor, 1))',
          }}
        >
          {produto.nome}
        </span>
        {produto.descricao && (
          <span className="mt-[6px] line-clamp-2 block font-body text-[13.5px] font-medium leading-[19px] text-ink-muted">
            {produto.descricao}
          </span>
        )}
        <span className="mt-[10px] flex items-baseline gap-2 font-body">
          <span className="text-[17px] font-bold text-accent">{formatarReais(precoFinalDe(produto))}</span>
          {promo && (
            <span className="text-[13px] font-medium text-ink-muted line-through">{formatarReais(produto.preco)}</span>
          )}
        </span>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Sobre — o texto da casa com assinatura manuscrita
// ─────────────────────────────────────────────────────────────

function SobreHorta({
  nome,
  texto,
  cta,
  foto,
  aoVerCardapio,
}: {
  nome: string
  texto: string
  cta: string
  foto: string | null
  aoVerCardapio: () => void
}) {
  return (
    <section className="px-screen-x pt-[52px]" aria-label={`Sobre ${nome}`}>
      <h2
        className="font-display font-bold text-ink"
        style={{
          fontSize: 'calc(32px * var(--type-factor, 1))',
          lineHeight: 'calc(38px * var(--type-factor, 1))',
        }}
      >
        Sobre a casa
      </h2>

      <p className="mt-[14px] whitespace-pre-line font-body text-[15.5px] font-medium leading-[25px] text-ink">{texto}</p>

      {/* A assinatura manuscrita — a Caveat é DNA do layout. */}
      <p className="mt-[26px] text-ink" style={{ ...CAVEAT, fontSize: 'calc(30px * var(--type-factor, 1))', lineHeight: 1.1 }}>
        {nome}
      </p>
      <p className="mt-[2px] font-body text-[12px] font-semibold uppercase tracking-[1.4px] text-ink-muted">
        Feito na casa, todo dia
      </p>

      <PillHorta rotulo={cta} href={`#${ID_CARDAPIO}`} aoTocar={aoVerCardapio} />

      {foto && (
        // O wrapper sangra até a borda da coluna e recorta ali: o blob amarelo
        // escapa para fora da página na referência, e sem o recorte ele viraria
        // rolagem horizontal. Respiro vertical para a sombra da foto girada.
        <div className="relative -mx-screen-x mt-[34px] overflow-hidden px-screen-x pb-6 pt-2">
          <div className="relative flex justify-center">
            {/* Blob amarelo atrás da foto — o respingo de cor da referência. */}
            <div
              className="pointer-events-none absolute top-6 aspect-square rounded-full"
              style={{ right: `calc(-1 * ${larg(0.12)})`, width: larg(0.42), backgroundColor: AMARELO }}
              aria-hidden
            />
            <FotoAdesivo src={foto} largura={larg(0.66)} proporcao={1.12} rotacao={3} className="relative" />
          </div>
        </div>
      )}
    </section>
  )
}

/** Pill rosa de ação — o botão desta vitrine (READ MORE / RESERVE TABLE). */
function PillHorta({
  rotulo,
  href,
  aoTocar,
  className,
}: {
  rotulo: string
  href: string
  aoTocar: () => void
  className?: string
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        aoTocar()
      }}
      className={`mt-[22px] inline-flex self-start rounded-full px-[26px] py-[15px] font-body text-[12.5px] font-bold uppercase tracking-[1.6px] transition-opacity hover:opacity-90 active:opacity-80 ${className ?? ''}`}
      style={{ backgroundColor: ROSA, color: TINTA_PASTEL }}
    >
      {rotulo}
    </a>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio — a lista completa em serifa sobre o creme
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
        className="font-display font-bold text-ink"
        style={{
          fontSize: 'calc(24px * var(--type-factor, 1))',
          lineHeight: 'calc(30px * var(--type-factor, 1))',
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.foto_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-[60px] w-[60px] shrink-0 rounded-[20px] object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[17px] font-semibold text-ink">{p.nome}</span>
                  {p.descricao && (
                    <span className="mt-[3px] block truncate font-body text-[13px] font-medium text-ink-muted">
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
// Visite — faixa caramelo com o horário de hoje
// ─────────────────────────────────────────────────────────────

function VisiteHorta({
  store,
  agora,
  foto,
  aoPedir,
}: {
  store: VitrineWebProps['store']
  agora: Date | null
  foto: string | null
  aoPedir: () => void
}) {
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const tempo = store.tempo_entrega
  const taxa = store.taxa_entrega
  const linhas = [
    hoje ? `Hoje das ${hoje.abre} às ${hoje.fecha}` : null,
    tempo != null ? `Entrega em cerca de ${tempo} min` : null,
    taxa === 0 ? 'Entrega grátis no bairro' : taxa != null ? `Taxa de entrega ${formatarReais(taxa)}` : null,
  ].filter((l): l is string => !!l)

  return (
    <section
      className="mt-[42px] flex flex-col px-screen-x pb-10 pt-11"
      style={{ backgroundColor: CARAMELO, color: TINTA_PASTEL }}
      aria-label="Visite a gente"
    >
      <Rabisco largura={larg(0.15)} cor={comAlfa(TINTA_PASTEL, 0.55)} className="mb-2 self-end" />

      <h2
        className="font-display font-bold"
        style={{
          fontSize: 'calc(32px * var(--type-factor, 1))',
          lineHeight: 'calc(38px * var(--type-factor, 1))',
        }}
      >
        Visite a gente
      </h2>

      {linhas.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-[7px] p-0" suppressHydrationWarning>
          {linhas.map((linha) => (
            <li key={linha} className="font-body text-[15px] font-semibold leading-[22px]">
              {linha}
            </li>
          ))}
        </ul>
      )}

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-[7px] self-start font-body text-[15px] font-semibold leading-[22px] underline-offset-2 hover:underline"
        >
          {store.telefone}
        </a>
      )}

      <PillHorta rotulo="Pedir agora" href={`#${ID_CARDAPIO}`} aoTocar={aoPedir} />

      {foto && (
        <div className="mt-8 flex justify-center pb-2">
          <FotoAdesivo src={foto} largura={larg(0.6)} proporcao={0.94} rotacao={-3} />
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a casa ainda sem cardápio, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioHorta() {
  return (
    <section
      id={ID_CARDAPIO}
      className="relative mx-screen-x mt-12 flex flex-col items-center rounded-[34px] px-[26px] pb-10 pt-12 text-center"
      style={{ backgroundColor: ROSA, color: TINTA_PASTEL }}
    >
      <SeloRecortado tamanho={64} cor="var(--accent, #2E4B26)" rotacao={8} className="absolute -right-1.5 -top-3">
        <span className="font-body text-[11px] font-bold tracking-[0.6px] text-accent-ink">em breve</span>
      </SeloRecortado>
      <p
        className="font-display font-bold"
        style={{
          fontSize: 'calc(26px * var(--type-factor, 1))',
          lineHeight: 'calc(31px * var(--type-factor, 1))',
        }}
      >
        A horta ainda está brotando
      </p>
      <p className="mt-3 font-body text-[15px] font-medium leading-[23px]" style={{ color: comAlfa(TINTA_PASTEL, 0.8) }}>
        Esta casa ainda não colocou o cardápio na vitrine. Volte em breve.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — faixa verde com selo, nome e relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoHorta({ store, agora }: { store: VitrineWebProps['store']; agora: Date | null }) {
  const relogio = agora ?? relogioDaLoja()
  const hoje = horarioDeHoje(store.horarios, relogio)
  // Nunca inventar "ABERTO": sem horários informados, a palavra não entra.
  const aberta = abertoAgora(store.horarios, relogio)
  const hora = agora ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
  const tempo = store.tempo_entrega
  const meta = [
    aberta === null ? null : aberta ? 'ABERTO' : 'FECHADO',
    hoje ? `HOJE ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} MIN` : null,
    hora,
  ].filter((m): m is string => !!m)

  const nome = store.nome.toUpperCase()
  const tinta = (a: number) => tokenComAlfa('--accent-ink', a, '#F7F1DE')

  return (
    <footer className="flex flex-col items-center bg-accent px-6 pb-12 pt-10 text-center text-accent-ink">
      <SeloRecortado tamanho={62} cor={ROSA} rotacao={-6}>
        <span style={{ ...BALOO, fontSize: 26, lineHeight: 1, color: TINTA_PASTEL }}>
          {store.nome.trim().charAt(0).toUpperCase()}
        </span>
      </SeloRecortado>

      <p
        className="mt-4 max-w-full whitespace-nowrap"
        style={{ ...BALOO, fontSize: `min(30px, ${corpoQueCabe(nome, 0.19, 0.88)})`, lineHeight: 1.1 }}
      >
        {nome}
      </p>

      {meta.length > 0 && (
        <p
          className="mt-[10px] font-body text-[11px] font-semibold uppercase tracking-[1.8px]"
          style={{ color: tinta(0.85) }}
          suppressHydrationWarning
        >
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto
        horarios={store.horarios}
        className="mt-2 font-body text-[12px] font-semibold tracking-[0.6px]"
      />

      <div
        className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t pt-5 font-body text-[11px]"
        style={{ borderColor: tinta(0.18), color: tinta(0.7) }}
      >
        <a href="https://mallevo.com.br" className="font-bold transition-colors hover:text-accent-ink">
          Uma loja do Mallevo
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="transition-colors hover:text-accent-ink">
            Termos
          </a>
          <a href="/privacidade" className="transition-colors hover:text-accent-ink">
            Privacidade
          </a>
        </span>
      </div>
    </footer>
  )
}
