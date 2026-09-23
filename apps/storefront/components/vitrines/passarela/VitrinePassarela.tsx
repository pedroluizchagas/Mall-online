'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatarHorario,
  horarioDeHoje,
  normalizeStoreConteudo,
  relogioDaLoja,
  useCartStore,
} from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  exigeEscolha,
  idDaSecao,
  precoFinalDe,
  prefereMenosMovimento,
  repartirDescricao,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  BotaoPassarela,
  ChipEstoque,
  MonogramaCoroado,
  PillRapida,
  VEU_HERO,
  comAlfa,
  type EstadoRapido,
} from './passarela-ui'

/**
 * Vitrine passarela — layout PRÓPRIO do arquétipo `mono` para moda
 * monocromática (docs/store-theme/02 §A8 e 05 "Vitrine passarela";
 * referência: Homelander). Port web de
 * apps/mobile-consumer/components/loja/LojaPassarela.tsx.
 *
 * DNA destilado da referência:
 * - MUNDO SEM COR: página branca, tinta quase-preta e fotografia em preto e
 *   branco. A única mancha de cor do sistema inteiro é o CHIP de escassez;
 * - COMÉRCIO NO CARD: a pill "adicionar" flutua SOBRE a foto e coloca a peça
 *   na sacola sem abrir o produto — é a diferença estrutural que separa este
 *   arquétipo do editorial, onde toda compra passa pelo PDP;
 * - cards de canto redondo em PALCO CINZA: primeiro uma coluna quase
 *   full-width (os destaques), depois grades de 2;
 * - linha NOME à esquerda / PREÇO à direita escrita direto na página;
 * - títulos de seção em peso REGULAR gigante — a elegância vem do tamanho,
 *   não do bold;
 * - MONOGRAMA COROADO como único ornamento. Zero animação contínua.
 *
 * Sem fonte-DNA local: a voz é o PESO da fonte do tema (400 gigante nos
 * títulos, 600 nas âncoras). A estética P&B vem da FOTOGRAFIA do lojista —
 * nenhum filtro é aplicado aqui.
 *
 * O que NÃO veio da RN: o botão "voltar" (a loja é a raiz do host — a logo da
 * casa ocupa o lugar), a barra de menu inferior (navegação do app), a virada
 * de status bar e a saída radial na tinta. A consulta assíncrona de variações
 * também não: `detalhes` já chega do servidor, então a decisão "abre o produto
 * ou entra direto" é local e síncrona. A guarda de troca de loja é do próprio
 * `useCartStore` (+ `TrocaLojaDialog` no host) — aqui só não se acende o
 * flash "NA SACOLA" quando a peça ficou pendente.
 */

const ID_PECAS = 'pecas'
/** Duração do flash "NA SACOLA ✓" (RN: 1400ms). */
const FLASH_MS = 1400

function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/**
 * O texto do chip — ou nada. A única cor do design é reservada ao que é de
 * fato urgente. A RN acende também com `metadata.estoque ≤ 40`, mas a coluna
 * real (`stock_quantity`) está FORA da view pública `public_catalog_products`
 * (D2 — sem estoque/SKU) e `metadata.estoque` é campo livre que a view não
 * garante; aqui o chip só acende com promoção. Pendência do plano de
 * convergência: expor escassez na view e reativar "Só N na loja".
 */
function chipDe(p: ProdutoCatalogo): string | null {
  return temPromo(p) ? 'Oferta' : null
}

function inicialDe(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || 'M'
}

export function VitrinePassarela({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const adicionarItem = useCartStore((s) => s.adicionarItem)

  // ── Estado da adição rápida ──
  /** Ids em flash "NA SACOLA ✓" (some sozinho). */
  const [confirmados, setConfirmados] = useState<string[]>([])
  /** Timer do flash por produto — re-adicionar reinicia o do próprio id. */
  const timersFlash = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const timers = timersFlash.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  // Fotos da casa: banner na frente, produtos completando.
  const fotos = useMemo(() => {
    const urls = [store.banner_url, ...secoes.flatMap((s) => s.produtos).map((p) => p.foto_url)].filter(
      (u): u is string => !!u,
    )
    return Array.from(new Set(urls))
  }, [store.banner_url, secoes])

  // Voz do hero e do "sobre": a campanha do lojista na frente; sem ela, a
  // descrição repartida como na RN. O manifesto, quando existe, é o "sobre".
  const { manchete: mancheteDerivada, detalhe } = useMemo(
    () => repartirDescricao(store.descricao),
    [store.descricao],
  )
  const manchete = campanha?.titulo ?? mancheteDerivada
  const sobre = conteudo.manifesto ?? detalhe

  // Coluna de destaques (a tela 2 da referência): os ids eleitos pelo lojista
  // em `conteudo.destaques`; sem eles, a seção que se chama "destaques" (ou
  // parecido); sem ela, as primeiras peças com foto.
  const todos = useMemo(() => secoes.flatMap((s) => s.produtos), [secoes])
  const destaquesDoLojista = useMemo(() => {
    const ids = conteudo.destaques ?? []
    if (ids.length === 0) return []
    const porId = new Map(todos.map((p) => [p.id, p]))
    return ids.map((id) => porId.get(id)).filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
  }, [conteudo.destaques, todos])

  // Sem seção "destaques" nomeada, a coluna é a PRIMEIRA seção com fotos — e
  // não "as primeiras peças do catálogo": só assim a regra de remoção abaixo
  // tem uma seção para avaliar (revisão visual 2026-09-19: a coluna repetia
  // as três entradas e a grade "Entradas" as repetia de novo logo abaixo).
  const secaoDestaque = useMemo(
    () =>
      destaquesDoLojista.length > 0
        ? undefined
        : (secoes.find((s) => /destaque|novidade|lançament|new|essencia/i.test(s.titulo)) ??
          secoes.find((s) => s.produtos.some((p) => p.foto_url))),
    [destaquesDoLojista.length, secoes],
  )
  const destaques = useMemo(
    () =>
      (destaquesDoLojista.length > 0
        ? destaquesDoLojista
        : (secaoDestaque?.produtos ?? todos).filter((p) => p.foto_url)
      ).slice(0, 3),
    [destaquesDoLojista, secaoDestaque, todos],
  )
  // A seção eleita só SAI das grades quando a coluna mostra todos os seus
  // itens — senão as peças que não couberam sumiriam da loja inteira (a mesma
  // regra que a vitrine forno aprendeu do jeito difícil).
  const secoesGrade = useMemo(
    () => secoes.filter((s) => s !== secaoDestaque || destaques.length < s.produtos.length),
    [secoes, secaoDestaque, destaques],
  )

  const vazio = todos.length === 0

  const rolarParaPecas = useCallback(() => {
    document.getElementById(ID_PECAS)?.scrollIntoView({
      behavior: prefereMenosMovimento() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  const estadoDe = (p: ProdutoCatalogo): EstadoRapido => (confirmados.includes(p.id) ? 'adicionado' : 'pronta')

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoPassarela — palco cinza, ficha
        // nome/preço e CTA que inverte para claro) no lugar do ProductModal
        // quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        /**
         * A adição rápida da referência: a peça entra na sacola direto da
         * grade. Peça com variação (tamanho, cor) ou modificador NUNCA entra
         * às cegas — abre o produto, que é onde a escolha existe.
         */
        const adicaoRapida = (p: ProdutoCatalogo) => {
          if (exigeEscolha(detalhes[p.id])) {
            aoAbrirProduto(p)
            return
          }
          adicionarItem(
            {
              product_id: p.id,
              nome: p.nome,
              preco: precoFinalDe(p),
              quantidade: 1,
              foto_url: p.foto_url ?? undefined,
            },
            store.id,
            store.nome,
            store.taxa_entrega ?? 0,
          )
          // Com outra loja na sacola o store NÃO adiciona — deixa pendente
          // para o TrocaLojaDialog. Sem flash: a peça ainda não entrou.
          if (useCartStore.getState().pendingTrocaLoja) return

          setConfirmados((atual) => (atual.includes(p.id) ? atual : [...atual, p.id]))
          // Tocar de novo na mesma peça reinicia o flash dela, em vez de
          // deixar o timer antigo apagá-lo antes da hora.
          clearTimeout(timersFlash.current.get(p.id))
          timersFlash.current.set(
            p.id,
            setTimeout(() => {
              timersFlash.current.delete(p.id)
              setConfirmados((atual) => atual.filter((x) => x !== p.id))
            }, FLASH_MS),
          )
        }

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* Chrome: dois botões claros com fio e sombra — legíveis sobre a
                foto e sobre o branco sem trocar de estado. À esquerda a casa
                (logo ou monograma) leva ao topo; à direita, a sacola. `h-0`
                sticky: fica sobre a rolagem sem empurrar nada. */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 h-0">
              <div className="pointer-events-none flex items-start justify-between px-screen-x pt-3">
                <div className="pointer-events-auto">
                  <BotaoPassarela href="/" rotulo={`${store.nome} — início da loja`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="font-display text-[15px] font-bold leading-none text-ink" aria-hidden>
                        {inicialDe(store.nome)}
                      </span>
                    )}
                  </BotaoPassarela>
                </div>
                <div className="pointer-events-auto">
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <BotaoPassarela
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

            {/* ── Hero: foto de moda full-bleed sob o véu de duas bandas ── */}
            <HeroPassarela
              nome={store.nome}
              eyebrow={campanha?.eyebrow ?? null}
              manchete={manchete}
              subtitulo={campanha?.subtitulo ?? null}
              cta={campanha?.cta ?? 'Ver peças'}
              foto={fotos[0] ?? null}
              aoVerPecas={rolarParaPecas}
            />

            {vazio ? (
              <VazioPassarela store={store} />
            ) : (
              <>
                {/* ── Destaques: a coluna única, um card por vez ── */}
                {destaques.length > 0 && (
                  <section className="flex flex-col gap-[30px] px-screen-x pt-[34px]" aria-label="Destaques">
                    {destaques.map((p) => (
                      <CardPassarela
                        key={p.id}
                        produto={p}
                        proporcao="100 / 115"
                        estado={estadoDe(p)}
                        aoAdicionar={() => adicaoRapida(p)}
                        aoAbrir={() => aoAbrirProduto(p)}
                      />
                    ))}
                  </section>
                )}

                {/* ── Grades de 2, uma por seção ── */}
                <div id={ID_PECAS} className="scroll-mt-[calc(var(--inset-top,0px)+12px)]">
                  {secoesGrade.map((secao) => (
                    <GradePassarela
                      key={secao.chave}
                      secao={secao}
                      estadoDe={estadoDe}
                      aoAdicionar={adicaoRapida}
                      aoAbrirProduto={aoAbrirProduto}
                    />
                  ))}
                </div>

                {/* ── Sobre: o silêncio do design, só texto entre dois fios ── */}
                {sobre && <SobrePassarela texto={sobre} />}
              </>
            )}

            {/* ── Fecho: monograma coroado, nome e relógio ── */}
            <FechoPassarela store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — foto de moda full-bleed com véu, manchete e pill branca
// ─────────────────────────────────────────────────────────────

function HeroPassarela({
  nome,
  eyebrow,
  manchete,
  subtitulo,
  cta,
  foto,
  aoVerPecas,
}: {
  nome: string
  /** Sobrelinha da campanha; null → o nome da casa faz o papel. */
  eyebrow: string | null
  /** null → o nome da casa é que vira a manchete, e o sobretítulo some. */
  manchete: string | null
  subtitulo: string | null
  cta: string
  foto: string | null
  aoVerPecas: () => void
}) {
  // Sobretítulo só quando a manchete NÃO é o próprio nome — senão o nome
  // apareceria duas vezes, uma embaixo da outra.
  const sobretitulo = eyebrow ?? (manchete ? nome : null)
  const titulo = manchete ?? nome
  // 88% da tela na RN; aqui com teto e piso para não virar faixa nem abismo.
  const altura = 'h-[88svh] max-h-[760px] min-h-[480px]'

  // Sem foto o hero não vira retângulo branco vazio: vira o bloco de tinta
  // com o monograma, que é o mesmo mundo por outro caminho.
  if (!foto) {
    return (
      <header className={`relative flex ${altura} flex-col items-center justify-center bg-ink px-[34px] text-center text-canvas`}>
        <MonogramaCoroado inicial={inicialDe(nome)} tamanho={64} cor="var(--bg, #FFFFFF)" />
        {sobretitulo && (
          <p className="mt-[22px] font-body text-[11.5px] font-semibold uppercase tracking-[3px] opacity-85">
            {sobretitulo}
          </p>
        )}
        <h1
          className={`${sobretitulo ? 'mt-[10px]' : 'mt-[22px]'} line-clamp-3 font-display font-semibold`}
          style={{
            fontSize: 'calc(26px * var(--type-factor, 1))',
            lineHeight: 'calc(34px * var(--type-factor, 1))',
          }}
        >
          {titulo}
        </h1>
        {subtitulo && <p className="mt-3 line-clamp-2 max-w-[36ch] font-body text-[14px] leading-[21px] opacity-80">{subtitulo}</p>}
        <button
          type="button"
          onClick={aoVerPecas}
          className="mt-[26px] rounded-full bg-white px-[34px] py-[15px] font-body text-[12px] font-semibold uppercase tracking-[1.6px] text-[#111111] shadow-soft transition-opacity hover:opacity-90 active:opacity-85"
        >
          {cta}
        </button>
      </header>
    )
  }

  return (
    <header className={`relative ${altura} overflow-hidden bg-ink`}>
      {/* Hero é o LCP da página: nunca lazy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* O mesmo gradiente de duas bandas dos outros heros full-bleed da casa:
          denso no topo para o chrome claro, transparente no miolo e denso na
          base para o texto. */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-[30px] pb-11 text-center">
        {sobretitulo && (
          <p
            className="font-body text-[11.5px] font-semibold uppercase tracking-[3px]"
            style={{ color: comAlfa('#FFFFFF', 0.85) }}
          >
            {sobretitulo}
          </p>
        )}

        <h1
          className={`${sobretitulo ? 'mt-[14px]' : ''} line-clamp-3 font-display font-semibold text-white`}
          style={{
            fontSize: 'calc(29px * var(--type-factor, 1))',
            lineHeight: 'calc(37px * var(--type-factor, 1))',
          }}
        >
          {titulo}
        </h1>

        {subtitulo && (
          <p className="mt-3 line-clamp-2 max-w-[36ch] font-body text-[14px] leading-[21px]" style={{ color: comAlfa('#FFFFFF', 0.85) }}>
            {subtitulo}
          </p>
        )}

        {/* A pill branca "VER PEÇAS" — rola até a grade. */}
        <button
          type="button"
          onClick={aoVerPecas}
          className="mt-[26px] rounded-full bg-white px-[34px] py-[15px] font-body text-[12px] font-semibold uppercase tracking-[1.6px] text-[#111111] shadow-soft transition-opacity hover:opacity-90 active:opacity-85"
        >
          {cta}
        </button>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Card — foto em palco cinza, pill de adição e a linha nome/preço
// ─────────────────────────────────────────────────────────────

function CardPassarela({
  produto,
  proporcao,
  estado,
  compacto = false,
  aoAdicionar,
  aoAbrir,
}: {
  produto: ProdutoCatalogo
  /** `aspect-ratio` do palco ("100 / 115" = altura 1,15× a largura). */
  proporcao: string
  estado: EstadoRapido
  compacto?: boolean
  aoAdicionar: () => void
  aoAbrir: () => void
}) {
  const chip = chipDe(produto)
  const promo = temPromo(produto)
  const respiro = compacto ? 'inset-x-[10px] bottom-[10px]' : 'inset-x-4 bottom-4'

  return (
    <article className="min-w-0">
      {/* Palco: a foto é IRMÃ da pill, não mãe dela — tocar na pill compra,
          tocar na foto abre a peça, e os dois gestos nunca se confundem. */}
      <div
        className={`relative overflow-hidden bg-surfaceMuted ${compacto ? 'rounded-[20px]' : 'rounded-[24px]'}`}
        style={{ aspectRatio: proporcao }}
      >
        <button
          type="button"
          onClick={aoAbrir}
          aria-label={`Ver ${produto.nome}`}
          className="absolute inset-0 block h-full w-full transition-opacity active:opacity-90"
        >
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
        </button>

        {chip && <ChipEstoque texto={chip} className="absolute left-3 top-3" />}

        <PillRapida
          estado={estado}
          compacta={compacto}
          rotulo={estado === 'adicionado' ? `${produto.nome} na sacola` : `Adicionar ${produto.nome} à sacola`}
          aoTocar={aoAdicionar}
          className={`absolute ${respiro}`}
        />
      </div>

      {/* A ficha: NOME à esquerda, PREÇO à direita, escrita direto na página. */}
      <div className="mt-3 flex items-start gap-[10px]">
        <h3
          className={`min-w-0 flex-1 font-body font-semibold text-ink ${
            compacto ? 'text-[14px] leading-[19px]' : 'text-[16px] leading-[22px]'
          } line-clamp-2`}
        >
          {produto.nome}
        </h3>
        <div className="flex shrink-0 flex-col items-end">
          <span className={`font-body font-semibold text-ink ${compacto ? 'text-[14px]' : 'text-[16px]'}`}>
            {formatarReais(precoFinalDe(produto))}
          </span>
          {promo && (
            <span className={`font-body text-ink-muted line-through ${compacto ? 'text-[11.5px]' : 'text-[13px]'}`}>
              {formatarReais(produto.preco)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────
// Grade — título em peso leve gigante e duas colunas
// ─────────────────────────────────────────────────────────────

function GradePassarela({
  secao,
  estadoDe,
  aoAdicionar,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  estadoDe: (p: ProdutoCatalogo) => EstadoRapido
  aoAdicionar: (p: ProdutoCatalogo) => void
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  if (secao.produtos.length === 0) return null

  return (
    <section id={idDaSecao(secao.chave)} className="scroll-mt-[calc(var(--inset-top,0px)+64px)] px-screen-x pt-[54px]" aria-label={secao.titulo}>
      <h2
        className="text-center font-display font-normal tracking-[-0.4px] text-ink"
        // Peso 400 de propósito: a assinatura tipográfica da referência é o
        // título GRANDE e LEVE. Subir para 600 aqui mata o arquétipo.
        style={{
          fontSize: 'calc(34px * var(--type-factor, 1))',
          lineHeight: 'calc(42px * var(--type-factor, 1))',
        }}
      >
        {secao.titulo}
      </h2>

      <div className="mt-[26px] grid grid-cols-2 gap-3">
        {secao.produtos.map((p) => (
          <CardPassarela
            key={p.id}
            produto={p}
            proporcao="100 / 130"
            compacto
            estado={estadoDe(p)}
            aoAdicionar={() => aoAdicionar(p)}
            aoAbrir={() => aoAbrirProduto(p)}
          />
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Sobre — o texto da casa entre dois fios, sem ornamento
// ─────────────────────────────────────────────────────────────

function SobrePassarela({ texto }: { texto: string }) {
  return (
    <section className="mx-screen-x mt-14 border-y border-line py-[30px]" aria-label="Sobre a loja">
      <p className="mx-auto max-w-[44ch] text-center font-body text-[15px] leading-[25px] text-ink-muted">{texto}</p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Vazio — a loja ainda sem peças, na mesma voz
// ─────────────────────────────────────────────────────────────

function VazioPassarela({ store }: { store: VitrineWebProps['store'] }) {
  return (
    <section id={ID_PECAS} className="scroll-mt-[calc(var(--inset-top,0px)+12px)] px-screen-x pt-[54px]" aria-label="Peças">
      <h2
        className="text-center font-display font-normal tracking-[-0.4px] text-ink"
        style={{
          fontSize: 'calc(34px * var(--type-factor, 1))',
          lineHeight: 'calc(42px * var(--type-factor, 1))',
        }}
      >
        Em breve
      </h2>
      <div className="mt-[26px] border-y border-line py-[30px] text-center">
        <p className="mx-auto max-w-[34ch] font-body text-[15px] leading-[25px] text-ink-muted">
          {store.nome} ainda não colocou peças na passarela. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Fecho — o monograma coroado, o nome e o relógio vivo
// ─────────────────────────────────────────────────────────────

function FechoPassarela({ store }: { store: VitrineWebProps['store'] }) {
  // Hora de parede da LOJA, viva. Nasce vazia para o servidor (UTC) e o
  // cliente não divergirem na hidratação; meio minuto basta pra nunca mostrar
  // hora velha sem acordar a página à toa.
  const agora = useRelogioDaLoja()

  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const hora = agora ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
  const tempo = store.tempo_entrega
  // A RN imprime "ABERTO" fixo quando não há horário; aqui só o que os
  // horários dizem (o `StatusAberto` abaixo cuida disso).
  const meta = [hoje ? `Hoje ${formatarHorario(hoje)}` : null, tempo != null ? `${tempo} min` : null, hora].filter(
    (m): m is string => !!m,
  )

  return (
    <footer className="mt-14 flex flex-col items-center border-t border-line px-6 pb-12 pt-10 text-center">
      <MonogramaCoroado inicial={inicialDe(store.nome)} tamanho={34} cor="var(--ink, #111111)" />

      <p className="mt-4 line-clamp-2 font-body text-[13px] font-bold uppercase tracking-[3.4px] text-ink">{store.nome}</p>

      {meta.length > 0 && (
        <p className="mt-[10px] font-body text-[11px] font-medium uppercase tracking-[1.6px] text-ink-muted" suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}

      <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[12px] tracking-[0.4px] text-ink-muted" />

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
