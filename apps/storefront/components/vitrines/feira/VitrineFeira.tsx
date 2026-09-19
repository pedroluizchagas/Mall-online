'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
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
  BotaoFeira,
  CREME_FEIRA,
  ChipCronometro,
  DiscoCategoria,
  DiscoFoto,
  IconeTraco,
  SeloOferta,
  VERDE_MATA,
  comAlfa,
} from './feira-ui'

/**
 * Vitrine feira — layout PRÓPRIO do arquétipo `fresh` para hortifruti e
 * mercados frescos (docs/store-theme/02 §A9 e 05 "Vitrine feira"; referência:
 * mockup de app grocery). Port web de
 * apps/mobile-consumer/components/loja/LojaFeira.tsx.
 *
 * DNA destilado da referência:
 * - HERO-CARTÃO verde-mata (cartão com gutter, NÃO full-bleed) com manchete
 *   clara, pill de ação e uma COLAGEM de discos de foto sangrando o canto;
 *   vira pager com scroll-snap quando há mais de uma foto, com dots;
 * - CHIPS CIRCULARES de categoria com foto, que rolam a página até a seção;
 * - OFERTAS com CRONÔMETRO — recorte transversal do catálogo, contando até a
 *   virada do dia;
 * - CARDS soltos com sombra suave, selo de oferta no canto e preço com
 *   UNIDADE ("/kg"), que é o jeito de vender de uma quitanda.
 *
 * A página é clara do topo ao pé. O LIMA de ação só existe como FUNDO (pill,
 * selo, cronômetro, contador): como tinta sobre a página clara ele reprova
 * AA, então títulos e preço levam o VERDE_MATA fixo. Sem fonte-DNA: a voz é a
 * Plus Jakarta Sans do tema.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host), a barra
 * de menu inferior (Início/Explorar/Pedidos/Perfil é navegação do app), a
 * status bar e a transição de saída radial. A sacola vive no header (sem FAB
 * — regra das vitrines).
 */

/** Teto de itens no bloco de ofertas — o resto continua nos corredores. */
const MAX_OFERTAS = 6

/** Teto de slides do hero, como a referência. */
const MAX_SLIDES = 3

const ID_OFERTAS = 'ofertas'

/** Manchete creme sobre o verde do hero. */
const estiloManchete = {
  color: CREME_FEIRA,
  fontSize: 'calc(21px * var(--type-factor, 1))',
  lineHeight: 'calc(27px * var(--type-factor, 1))',
} as const

/** Títulos de seção: verde-mata fixo sobre a página clara (o lima é só fundo). */
const estiloTituloSecao = {
  color: VERDE_MATA,
  fontSize: 'calc(20px * var(--type-factor, 1))',
  lineHeight: 'calc(26px * var(--type-factor, 1))',
} as const

function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/** Unidade de venda publicada pelo lojista (`products.metadata.unidade`). */
function unidadeDe(p: ProdutoCatalogo): string | null {
  const u = lerMetadataProduto(p.metadata).unidade
  return u && u.trim() ? u.trim() : null
}

/**
 * Segundos que faltam para a virada do dia no relógio da LOJA — o prazo das
 * ofertas. Lê `relogioDaLoja` (e não `new Date()`): o visitante pode estar
 * em outro fuso, e a oferta acaba quando a quitanda vira o dia.
 */
function segundosAteViradaDoDia(agora: Date): number {
  const virada = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 0, 0)
  return Math.max(0, Math.floor((virada.getTime() - agora.getTime()) / 1000))
}

/**
 * Reparte a descrição entre as duas vozes que a mostram (mesmo racional das
 * vitrines forno e passarela): a 1ª oração vira a manchete do hero e o resto
 * vira o subtexto, para o mesmo texto não aparecer duas vezes na mesma tela.
 * `manchete` null → o hero grita o nome da casa.
 */
function repartirDescricao(descricao: string | null | undefined): {
  manchete: string | null
  detalhe: string | null
} {
  const texto = descricao?.trim() ?? ''
  if (!texto) return { manchete: null, detalhe: null }

  const corte = texto.search(/[—.!?]/)
  const primeira = (corte === -1 ? texto : texto.slice(0, corte)).trim()
  if (primeira.length < 8 || primeira.length > 64) {
    return { manchete: null, detalhe: texto }
  }
  const resto = corte === -1 ? '' : texto.slice(corte + 1).trim()
  return { manchete: primeira, detalhe: resto || null }
}

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function rolarAte(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
    block: 'start',
  })
}

export function VitrineFeira({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const todos = useMemo(() => secoes.flatMap((s) => s.produtos), [secoes])

  // Fotos da casa: a galeria do lojista na frente, depois o banner e os
  // produtos completando — a colagem do hero se serve daqui.
  const fotos = useMemo(() => {
    const urls = [...(conteudo.galeria_casa ?? []), store.banner_url, ...todos.map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls))
  }, [conteudo.galeria_casa, store.banner_url, todos])

  // A campanha do lojista manda no hero; sem ela, a derivação da RN (a
  // descrição repartida em manchete + detalhe).
  const { manchete, detalhe } = useMemo(() => {
    if (campanha) return { manchete: campanha.titulo, detalhe: campanha.subtitulo ?? null }
    return repartirDescricao(store.descricao)
  }, [campanha, store.descricao])

  /**
   * Ofertas: recorte TRANSVERSAL do catálogo. Nenhuma seção é removida dos
   * corredores por causa disto — o bloco é uma vitrine do que já está lá, e
   * produto nenhum deixa de ter o seu lugar na lista.
   */
  const ofertas = useMemo(() => todos.filter(temPromo).slice(0, MAX_OFERTAS), [todos])

  const secoesComProduto = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const vazio = secoesComProduto.length === 0

  const idDaAcao = ofertas.length > 0 ? ID_OFERTAS : secoesComProduto[0] ? idDaSecao(secoesComProduto[0].chave) : null

  const aoAgir = useCallback(() => {
    if (idDaAcao) rolarAte(idDaAcao)
  }, [idDaAcao])

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoFeira — preço grande com unidade e
        // ficha de especificações) no lugar do ProductModal quando o produto
        // não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas pb-12 pt-[66px] text-ink">
            <CartPersistence />

            {/* Chrome: dois botões claros com fio e sombra sobre o claro da
                página. À esquerda a casa (logo ou folha) leva ao topo; à
                direita, a sacola. `h-0` sticky: fica sobre a rolagem sem
                empurrar nada. */}
            <div className="sticky top-0 z-30 -mt-[66px] mb-[66px] h-0">
              <div className="pointer-events-none flex items-start justify-between px-screen-x pt-2">
                <div className="pointer-events-auto">
                  <BotaoFeira href="/" rotulo={`${store.nome} — início da loja`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <IconeTraco nome="folha" cor={VERDE_MATA} />
                    )}
                  </BotaoFeira>
                </div>
                <div className="pointer-events-auto">
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <BotaoFeira
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

            {/* ── Hero: o cartão verde-mata com a colagem de frescos ── */}
            <HeroFeira
              nome={store.nome}
              eyebrow={campanha?.eyebrow ?? null}
              manchete={manchete}
              detalhe={detalhe}
              cta={campanha?.cta ?? (ofertas.length > 0 ? 'Ver ofertas' : 'Ver produtos')}
              fotos={fotos}
              alvo={idDaAcao}
              aoAgir={aoAgir}
            />

            {vazio ? (
              <VazioFeira />
            ) : (
              <>
                {/* ── Chips circulares: a fileira de categorias da referência ── */}
                <nav
                  className="mt-[26px] flex gap-3 overflow-x-auto px-screen-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Seções da loja"
                >
                  {secoesComProduto.map((s) => {
                    const id = idDaSecao(s.chave)
                    return (
                      <DiscoCategoria
                        key={s.chave}
                        src={s.produtos.find((p) => p.foto_url)?.foto_url ?? null}
                        rotulo={s.titulo}
                        href={`#${id}`}
                        aoTocar={(e: MouseEvent<HTMLAnchorElement>) => {
                          e.preventDefault()
                          rolarAte(id)
                        }}
                      />
                    )
                  })}
                </nav>

                {/* ── Ofertas: recorte transversal, com o relógio correndo ── */}
                {ofertas.length > 0 && <OfertasFeira produtos={ofertas} aoAbrirProduto={aoAbrirProduto} />}

                {/* ── Corredores: uma grade por seção, com TODOS os produtos ── */}
                {secoesComProduto.map((secao) => (
                  <CorredorFeira key={secao.chave} secao={secao} aoAbrirProduto={aoAbrirProduto} />
                ))}
              </>
            )}

            {/* ── Fecho: o cartão verde com o relógio da casa ── */}
            <FechoFeira store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — cartão verde-mata com colagem de frescos e pill de ação
// ─────────────────────────────────────────────────────────────

function HeroFeira({
  nome,
  eyebrow,
  manchete,
  detalhe,
  cta,
  fotos,
  alvo,
  aoAgir,
}: {
  nome: string
  eyebrow: string | null
  manchete: string | null
  detalhe: string | null
  cta: string
  fotos: string[]
  alvo: string | null
  aoAgir: () => void
}) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const [slideAtivo, setSlideAtivo] = useState(0)

  // Cada slide come uma foto principal e mostra a seguinte no disco pequeno,
  // então N fotos rendem no máximo N slides — teto de 3, como a referência.
  const slides = Math.min(Math.max(fotos.length, 1), MAX_SLIDES)
  const varios = slides > 1

  const aoRolar = useCallback(() => {
    const el = trilhoRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setSlideAtivo((atual) => (atual === i ? atual : i))
  }, [])

  const irPara = useCallback((i: number) => {
    const el = trilhoRef.current
    if (!el) return
    const idx = Math.max(0, Math.min(i, el.children.length - 1))
    el.scrollTo({ left: idx * el.clientWidth, behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })
  }, [])

  // O sobretítulo com o NOME da casa só entra quando a manchete tomou o
  // título — sem manchete, o nome já É o título e sairia repetido. A
  // eyebrow da campanha, quando escrita, toma o lugar dele.
  const sobretitulo = eyebrow ?? (manchete ? nome : null)

  return (
    <header aria-label={nome}>
      {/* Um cartão por slide: trilho com snap horizontal, cada slide ocupa a
          coluna inteira (o "largura explícita" da RN). */}
      <div
        ref={trilhoRef}
        onScroll={varios ? aoRolar : undefined}
        className={`flex w-full ${varios ? 'snap-x snap-mandatory overflow-x-auto overscroll-x-contain' : 'overflow-hidden'} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {Array.from({ length: slides }, (_, i) => (
          <div key={i} className="w-full shrink-0 snap-center px-screen-x">
            <div
              className="relative flex min-h-[196px] flex-col justify-center overflow-hidden rounded-lg p-5"
              style={{ backgroundColor: VERDE_MATA }}
            >
              {/* Colagem: disco grande sangrando o canto + disco menor por
                  cima — a fruta "saindo" do cartão da referência. Medidas em
                  fração da LARGURA do cartão; o deslocamento vertical é
                  fração do próprio disco (6/52 e 5/24), porque `top` em %
                  seria da altura do cartão. */}
              {fotos.length > 0 && (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <DiscoFoto
                    src={fotos[i % fotos.length]}
                    largura="52%"
                    className="absolute -right-[12%] top-0"
                    style={{ transform: 'translateY(-11.5%)' }}
                  />
                  {fotos.length > 1 && (
                    <DiscoFoto
                      src={fotos[(i + 1) % fotos.length]}
                      largura="24%"
                      aro={VERDE_MATA}
                      className="absolute bottom-0 right-[26%]"
                      style={{ transform: 'translateY(20.8%)' }}
                    />
                  )}
                </div>
              )}

              <div className="relative w-[58%]">
                {sobretitulo && (
                  <p
                    className="mb-[7px] truncate font-body text-[10.5px] font-semibold uppercase tracking-[2px]"
                    style={{ color: comAlfa(CREME_FEIRA, 0.72) }}
                  >
                    {sobretitulo}
                  </p>
                )}

                {/* Só o primeiro slide é o h1 da página; os demais repetem a
                    manchete como cópia visual. */}
                {i === 0 ? (
                  <h1 className="line-clamp-3 font-display font-bold" style={estiloManchete}>
                    {manchete ?? nome}
                  </h1>
                ) : (
                  <p className="line-clamp-3 font-display font-bold" style={estiloManchete} aria-hidden>
                    {manchete ?? nome}
                  </p>
                )}

                {detalhe && (
                  <p
                    className="mt-2 line-clamp-2 font-body text-[12px] leading-[17px]"
                    style={{ color: comAlfa(CREME_FEIRA, 0.75) }}
                  >
                    {detalhe}
                  </p>
                )}

                {alvo && (
                  <a
                    href={`#${alvo}`}
                    onClick={(e) => {
                      e.preventDefault()
                      aoAgir()
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-[11px] font-body text-[11.5px] font-bold uppercase tracking-[1.1px] text-accent-ink transition-opacity hover:opacity-90 active:opacity-85"
                    tabIndex={i === 0 ? 0 : -1}
                    aria-hidden={i !== 0}
                  >
                    {cta}
                    <IconeTraco nome="chevron-down" tamanho={13} espessura={2.4} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {varios && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Posição no hero">
          {Array.from({ length: slides }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === slideAtivo}
              aria-label={`Foto ${i + 1} de ${slides}`}
              onClick={() => irPara(i)}
              // Alvo de toque de 24px em volta de um ponto de 6px.
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className="block h-1.5 w-1.5 rounded-full bg-ink transition-opacity duration-200 motion-reduce:transition-none"
                style={{ opacity: i === slideAtivo ? 1 : 0.25 }}
              />
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Ofertas — recorte transversal com o relógio até a virada do dia
// ─────────────────────────────────────────────────────────────

function OfertasFeira({
  produtos,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  // Nasce vazio para o servidor e o cliente não divergirem na hidratação. O
  // relógio é o único tique desta vitrine: recalcula do RELÓGIO a cada
  // segundo (em vez de decrementar) para não acumular deriva e para virar o
  // dia sozinho quando passa da meia-noite.
  const [restam, setRestam] = useState<number | null>(null)
  useEffect(() => {
    const bater = () => setRestam(segundosAteViradaDoDia(relogioDaLoja()))
    bater()
    const id = setInterval(bater, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section id={ID_OFERTAS} className="scroll-mt-[70px] px-screen-x pt-[34px]" aria-label="Ofertas do dia">
      <div className="flex items-center gap-[10px]">
        <h2 className="font-display font-bold" style={estiloTituloSecao}>
          Ofertas do dia
        </h2>
        <ChipCronometro segundos={restam} />
      </div>

      <GradeFeira produtos={produtos} aoAbrirProduto={aoAbrirProduto} />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Corredor — uma seção do cardápio, com todos os seus produtos
// ─────────────────────────────────────────────────────────────

function CorredorFeira({
  secao,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <section
      id={idDaSecao(secao.chave)}
      className="scroll-mt-[70px] px-screen-x pt-[34px]"
      aria-label={secao.titulo}
    >
      <h2
        className="font-display font-bold"
        style={{
          ...estiloTituloSecao,
          fontSize: 'calc(19px * var(--type-factor, 1))',
          lineHeight: 'calc(25px * var(--type-factor, 1))',
        }}
      >
        {secao.titulo}
      </h2>

      <GradeFeira produtos={secao.produtos} aoAbrirProduto={aoAbrirProduto} />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Grade e card — a banca: foto, nome, descrição e preço por unidade
// ─────────────────────────────────────────────────────────────

function GradeFeira({
  produtos,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-3 p-0">
      {produtos.map((p) => (
        <li key={p.id} className="min-w-0">
          <CardFeira produto={p} aoTocar={() => aoAbrirProduto(p)} />
        </li>
      ))}
    </ul>
  )
}

function CardFeira({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const promo = temPromo(produto)
  const unidade = unidadeDe(produto)

  return (
    <button
      type="button"
      onClick={aoTocar}
      className="relative flex h-full w-full flex-col rounded-md bg-surface p-[10px] text-left shadow-soft transition-opacity hover:opacity-90 active:opacity-85"
    >
      <span className="block aspect-square w-full overflow-hidden rounded-sm bg-surfaceMuted">
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </span>

      {/* O canto que na referência era o coração de favorito. */}
      {promo && <SeloOferta className="absolute right-[18px] top-[18px]" />}

      <span className="mt-[10px] line-clamp-2 font-body text-[14px] font-semibold leading-[19px] text-ink">
        {produto.nome}
      </span>

      {produto.descricao && (
        <span className="mt-[3px] block w-full truncate font-body text-[11.5px] text-ink-muted">
          {produto.descricao}
        </span>
      )}

      {/* O preço com a UNIDADE ao lado — o jeito de vender de uma quitanda. */}
      <span className="mt-2 flex flex-wrap items-baseline font-body">
        <span className="text-[15px] font-bold" style={{ color: VERDE_MATA }}>
          {formatarReais(precoFinalDe(produto))}
        </span>
        {unidade && <span className="ml-[3px] text-[11.5px] text-ink-muted">/{unidade}</span>}
        {promo && (
          <span className="ml-[7px] text-[11.5px] text-ink-muted line-through">{formatarReais(produto.preco)}</span>
        )}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a banca ainda sem produtos, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioFeira() {
  return (
    <section className="mx-screen-x mt-[26px] flex flex-col items-center rounded-lg bg-surface px-[26px] py-10 text-center shadow-soft">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <IconeTraco nome="folha" tamanho={26} cor="var(--accent-ink, #111216)" espessura={1.8} />
      </span>
      <p
        className="mt-5 font-display font-bold"
        style={{
          color: VERDE_MATA,
          fontSize: 'calc(20px * var(--type-factor, 1))',
          lineHeight: 'calc(26px * var(--type-factor, 1))',
        }}
      >
        A banca ainda está sendo montada
      </p>
      <p className="mt-2 font-body text-[14px] leading-[20px] text-ink-muted">
        Esta casa ainda não colocou produtos na vitrine. Volte em breve.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — cartão verde com o relógio vivo da casa
// ─────────────────────────────────────────────────────────────

function FechoFeira({ store }: { store: VitrineWebProps['store'] }) {
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
  // Sem horários, nada de "ABERTO" inventado (regra da convergência) — o
  // `StatusAberto` abaixo já cala quando a loja não informou.
  const meta = [
    hoje ? `HOJE ${formatarHorario(hoje)}` : null,
    tempo != null ? `${tempo} MIN` : null,
    store.taxa_entrega === 0 ? 'ENTREGA GRÁTIS' : null,
    hora,
  ].filter((m): m is string => !!m)

  const linha = comAlfa(CREME_FEIRA, 0.14)

  return (
    <footer
      className="mx-screen-x mt-10 flex flex-col items-center rounded-lg px-6 pb-6 pt-[30px] text-center"
      style={{ backgroundColor: VERDE_MATA }}
    >
      <p
        className="line-clamp-2 font-display font-bold"
        style={{
          color: CREME_FEIRA,
          fontSize: 'calc(22px * var(--type-factor, 1))',
          lineHeight: 'calc(28px * var(--type-factor, 1))',
        }}
      >
        {store.nome}
      </p>

      {meta.length > 0 && (
        <p
          className="mt-[10px] font-body text-[11px] font-medium tracking-[1.4px]"
          style={{ color: comAlfa(CREME_FEIRA, 0.8) }}
          suppressHydrationWarning
        >
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto
        horarios={store.horarios}
        className="mt-2 font-body text-[12px] font-semibold tracking-[0.4px] text-[#F4F7EC]/75"
      />

      {store.telefone && (
        <a
          href={`tel:${store.telefone}`}
          className="mt-4 font-body text-[13px] font-semibold underline-offset-2 hover:underline"
          style={{ color: comAlfa(CREME_FEIRA, 0.85) }}
        >
          {store.telefone}
        </a>
      )}

      <div
        className="mt-7 flex w-full flex-wrap items-center justify-between gap-3 border-t pt-4 font-body text-[11px]"
        style={{ borderColor: linha, color: comAlfa(CREME_FEIRA, 0.62) }}
      >
        <a href="https://mallevo.com.br" className="font-bold transition-colors hover:text-[#F4F7EC]">
          Uma loja do Mallevo
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="transition-colors hover:text-[#F4F7EC]">
            Termos
          </a>
          <a href="/privacidade" className="transition-colors hover:text-[#F4F7EC]">
            Privacidade
          </a>
        </span>
      </div>
    </footer>
  )
}
