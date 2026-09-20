'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  AcaoMagazine,
  CAIXA_HERO,
  CardMagazine,
  DWELL_MS,
  FLASH_MS,
  FaixaAnuncio,
  GLIDE_MS,
  ITENS_FECHADOS,
  MarcaDaCasa,
  PillAccent,
  PontosDoHero,
  TituloCentrado,
  VEU_HERO,
  VEU_TILE,
  descontoPct,
  precoFinalDe,
} from './magazine-ui'

/**
 * Vitrine magazine — layout PRÓPRIO do arquétipo `magazine` para lojas de
 * departamento que vendem de tudo (docs/store-theme/02 §A3 e 05 "Vitrine
 * magazine"; referência: Revive). Port web de
 * apps/mobile-consumer/components/loja/LojaMagazine.tsx.
 *
 * DNA destilado da referência:
 * - FAIXA-ANÚNCIO no topo + header claro com WORDMARK EM SERIFA — o bloco
 *   inteiro gruda no topo, como na RN;
 * - hero com CAIXA EMOLDURADA translúcida centrada (eyebrow + título em
 *   serifa caps + parágrafo + pill "Ver ofertas ›");
 * - "Compre por categoria" em TILES de foto cheia com o nome centrado, que
 *   rolam até a seção;
 * - grid de produtos com chip NOVO, CHIP VERDE de oferta e o botão
 *   "Adicionar" em pill contornada dentro do próprio cartão (adição rápida;
 *   item com variação abre o detalhe);
 * - "Ver tudo ›" em pill centrada expandindo a seção.
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), o coração
 * de favorito (o web não tem favoritos), a barra de menu inferior, a status
 * bar e a transição radial. A sacola vive no header.
 */

const ID_OFERTAS = 'ofertas'
/** Faixa (31px) + header (60px): as âncoras param abaixo do bloco grudado. */
const ALTURA_CHROME = 91

interface SlideMagazine {
  imagem: string | null
  eyebrow: string
  titulo: string
  paragrafo: string | null
  cta: string
  produto: ProdutoCatalogo | null
}

/** Item COM variação/modificador nunca entra às cegas. */
function exigeEscolha(detalhe: ProdutoDetalhe | undefined): boolean {
  if (!detalhe) return false
  return detalhe.optionGroups.length + detalhe.modifierGroups.length > 0
}

export function VitrineMagazine({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])
  const maxDesc = useMemo(() => Math.max(0, ...todos.map(descontoPct)), [todos])

  // Cenas do hero: a campanha (o lojista manda; sem ela, a derivação da RN —
  // maior desconto do catálogo ou o nome da casa) e até três itens com foto,
  // `destaques` na frente.
  const slides = useMemo<SlideMagazine[]>(() => {
    const abertura: SlideMagazine = {
      imagem: store.banner_url ?? null,
      eyebrow: campanha?.eyebrow ?? 'Ofertas da semana',
      titulo: campanha?.titulo ?? (maxDesc > 0 ? `Até ${maxDesc}% off` : store.nome),
      paragrafo: campanha ? campanha.subtitulo ?? null : store.descricao ?? null,
      cta: campanha?.cta ?? 'Ver ofertas',
      produto: null,
    }
    const secaoDe = new Map<string, string>()
    secoesComItens.forEach((s) => s.produtos.forEach((p) => secaoDe.set(p.id, s.titulo)))
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const fonte = escolhidos.length > 0 ? escolhidos : todos.filter((p) => p.foto_url)
    const itens = fonte.slice(0, 3).map(
      (p): SlideMagazine => ({
        imagem: p.foto_url,
        eyebrow: escolhidos.length > 0 ? 'Em destaque' : secaoDe.get(p.id) ?? '',
        titulo: p.nome,
        paragrafo: formatarReais(precoFinalDe(p)),
        cta: 'Ver produto',
        produto: p,
      }),
    )
    return [abertura, ...itens]
  }, [store.banner_url, store.nome, store.descricao, campanha, conteudo.destaques, todos, secoesComItens, maxDesc])

  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()

  const textoFaixa = maxDesc > 0 ? `Até ${maxDesc}% off em ofertas da semana` : conteudo.manifesto ?? 'Tudo para a sua casa em um só lugar'

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

  const [expandidas, setExpandidas] = useState<string[]>([])
  const alternarExpandida = (chave: string) =>
    setExpandidas((atual) => (atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]))

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
        // TODO(2b): PDP própria (ProdutoMagazine — galeria contida, título
        // serif, linhas Entrega/Vendido/Troca e barra de compra fixa) no
        // lugar do ProductModal quando o produto não tem variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        // Item com variação ou carrinho de outra loja (a guarda vive no store
        // + TrocaLojaDialog) nunca entra às cegas.
        const adicionarRapido = (p: ProdutoCatalogo) => {
          if (exigeEscolha(detalhes[p.id])) {
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

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Bloco grudado: faixa-anúncio + header claro com wordmark ── */}
            <div className="sticky top-0 z-30">
              <FaixaAnuncio>{textoFaixa}</FaixaAnuncio>
              <header className="flex h-[60px] items-center border-b border-line bg-surface px-[calc(var(--space-screen-x,24px)-8px)]">
                <MarcaDaCasa nome={store.nome} logoUrl={store.logo_url} />
                <a
                  href="/"
                  className="min-w-0 flex-1 truncate px-2 text-center font-display text-[21px] font-semibold tracking-[0.3px] text-ink"
                >
                  {store.nome}
                </a>
                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <AcaoMagazine
                      icone="bag"
                      contador={totalItens}
                      rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'}
                      aoTocar={abrirSacola}
                    />
                  )}
                </Sacola>
              </header>
            </div>

            {/* ── Hero com caixa emoldurada ── */}
            <HeroMagazine ref={heroRef} slides={slides} emCena={heroEmCena} aoAbrirProduto={aoAbrirProduto} aoVerOfertas={() => rolarPara(ID_OFERTAS)} />

            {todos.length === 0 ? (
              <VazioMagazine nome={store.nome} />
            ) : (
              <>
                {/* ── Compre por categoria: tiles de foto cheia ── */}
                {secoesComItens.length > 1 && (
                  <section id={ID_OFERTAS} className="mt-7" aria-labelledby="titulo-categorias" style={{ scrollMarginTop: ALTURA_CHROME }}>
                    <TituloCentrado id="titulo-categorias">Compre por categoria</TituloCentrado>
                    <ul className="flex flex-col gap-3 px-screen-x">
                      {secoesComItens.map((s) => {
                        const capa = s.produtos.find((p) => p.foto_url)?.foto_url
                        return (
                          <li key={s.chave}>
                            <a
                              href={`#${idDaSecao(s.chave)}`}
                              onClick={(e) => {
                                e.preventDefault()
                                rolarPara(idDaSecao(s.chave))
                              }}
                              className="relative block h-[140px] overflow-hidden rounded-lg bg-surfaceMuted transition-opacity hover:opacity-95"
                            >
                              {capa && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={capa} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                              )}
                              <span className="absolute inset-0 flex items-center justify-center px-6" style={{ backgroundColor: VEU_TILE }}>
                                <span
                                  className="line-clamp-2 text-center font-display font-semibold text-white"
                                  style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.15 }}
                                >
                                  {s.titulo}
                                </span>
                              </span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {/* Com uma seção só não há tiles: o CTA do hero desce direto aos produtos. */}
                {secoesComItens.length === 1 && <div id={ID_OFERTAS} style={{ scrollMarginTop: ALTURA_CHROME }} aria-hidden />}

                {/* ── Seções de produtos ── */}
                {secoesComItens.map((secao) => {
                  const expandida = expandidas.includes(secao.chave)
                  const visiveis = expandida ? secao.produtos : secao.produtos.slice(0, ITENS_FECHADOS)
                  const idSecao = idDaSecao(secao.chave)
                  const idGrade = `${idSecao}-grade`
                  return (
                    <section key={secao.chave} id={idSecao} className="mt-[30px]" aria-labelledby={`${idSecao}-titulo`} style={{ scrollMarginTop: ALTURA_CHROME }}>
                      <TituloCentrado id={`${idSecao}-titulo`}>{secao.titulo}</TituloCentrado>
                      <div id={idGrade} className="grid grid-cols-2 gap-3 px-screen-x">
                        {visiveis.map((p, idx) => (
                          <CardMagazine
                            key={p.id}
                            produto={p}
                            destaque={idx === 0}
                            adicionado={adicionados.includes(p.id)}
                            aoTocar={() => aoAbrirProduto(p)}
                            aoAdicionar={() => adicionarRapido(p)}
                          />
                        ))}
                      </div>
                      {secao.produtos.length > ITENS_FECHADOS && (
                        <div className="mt-4 flex justify-center">
                          <PillAccent aoTocar={() => alternarExpandida(secao.chave)} aria-expanded={expandida} aria-controls={idGrade}>
                            {expandida ? 'Ver menos' : 'Ver tudo'}
                          </PillAccent>
                        </div>
                      )}
                    </section>
                  )
                })}
              </>
            )}

            <FechoMagazine store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — a caixa emoldurada da referência, em cadência constante
// ─────────────────────────────────────────────────────────────

const HeroMagazine = forwardRef<
  HTMLElement,
  {
    slides: SlideMagazine[]
    emCena: boolean
    aoAbrirProduto: (p: ProdutoCatalogo) => void
    aoVerOfertas: () => void
  }
>(function HeroMagazine({ slides, emCena, aoAbrirProduto, aoVerOfertas }, ref) {
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
      className="relative h-[42svh] max-h-[480px] min-h-[320px] select-none overflow-hidden bg-canvasAlt"
      style={{ touchAction: 'pan-y' }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Ofertas e destaques"
      {...handlers}
    >
      <div className="flex h-full" style={{ transform: `translateX(-${pos * 100}%)`, transition: transicao }}>
        {slidesRender.map((slide, i) => {
          const emFoco = i === pos
          const deslocamento = Math.max(-1, Math.min(1, pos - i)) * 8
          return (
            <div key={i} className="relative flex h-full w-full shrink-0 items-center overflow-hidden" aria-hidden={!emFoco}>
              {slide.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.imagem}
                  alt=""
                  loading="eager"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  decoding="async"
                  draggable={false}
                  className="absolute top-0 h-full w-[116%] max-w-none object-cover"
                  style={{ left: '-8%', transform: reduzir ? undefined : `translateX(${deslocamento}%)`, transition: transicao }}
                />
              )}
              <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

              {/* A caixa emoldurada da referência */}
              <div
                className="relative mx-[calc(var(--space-screen-x,24px)+8px)] flex w-full flex-col items-center gap-2 rounded-md px-[18px] py-5 text-center"
                style={{
                  backgroundColor: CAIXA_HERO,
                  opacity: emFoco ? 1 : 0,
                  visibility: emFoco ? 'visible' : 'hidden',
                  transition: semTransicao ? 'none' : `opacity ${GLIDE_MS}ms ease, visibility 0s linear ${emFoco ? 0 : GLIDE_MS}ms`,
                  pointerEvents: emFoco ? 'auto' : 'none',
                }}
              >
                <p className="font-body text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {slide.eyebrow}
                </p>
                {i === 0 ? (
                  <h1
                    className="line-clamp-2 font-display font-semibold uppercase tracking-[1px] text-white"
                    style={{ fontSize: 'calc(28px * var(--type-factor, 1))', lineHeight: 'calc(34px * var(--type-factor, 1))' }}
                  >
                    {slide.titulo}
                  </h1>
                ) : (
                  <p
                    className="line-clamp-2 font-display font-semibold uppercase tracking-[1px] text-white"
                    style={{ fontSize: 'calc(28px * var(--type-factor, 1))', lineHeight: 'calc(34px * var(--type-factor, 1))' }}
                  >
                    {slide.titulo}
                  </p>
                )}
                {slide.paragrafo && (
                  <p className="line-clamp-2 font-body text-[13px] leading-[19px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
                    {slide.paragrafo}
                  </p>
                )}
                <PillAccent className="mt-[6px]" aoTocar={() => (slide.produto ? aoAbrirProduto(slide.produto) : aoVerOfertas())}>
                  {slide.cta}
                </PillAccent>
              </div>
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className="absolute inset-x-0 bottom-[10px] z-[2]">
          <PontosDoHero total={n} ativo={indice} rotulos={slides.map((s) => s.titulo)} irPara={irPara} />
        </div>
      )}
    </section>
  )
})

function VazioMagazine({ nome }: { nome: string }) {
  return (
    <section id={ID_OFERTAS} className="px-screen-x pt-7" aria-label="Ofertas" style={{ scrollMarginTop: ALTURA_CHROME }}>
      <div className="rounded-lg bg-surface px-6 py-12 text-center shadow-soft">
        <p className="font-display text-[22px] font-semibold text-ink">As prateleiras ainda estão sendo montadas</p>
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

function FechoMagazine({ store }: { store: VitrineWebProps['store'] }) {
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
    <footer className="mt-12 border-t border-line bg-surface px-screen-x pb-12 pt-8 text-center">
      <p className="truncate font-display text-[21px] font-semibold tracking-[0.3px] text-ink">{store.nome}</p>
      {meta.length > 0 && (
        <p className="mt-2 font-body text-[13px] text-ink-muted" suppressHydrationWarning>
          {meta.join('  ·  ')}
        </p>
      )}
      <StatusAberto horarios={store.horarios} className="mt-2 justify-center font-body text-[13px] font-semibold text-ink-muted" />
      {store.telefone && (
        <a href={`tel:${store.telefone}`} className="mt-3 inline-block font-body text-[13px] text-ink-muted underline-offset-2 hover:underline">
          {store.telefone}
        </a>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[12px] text-ink-muted">
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
