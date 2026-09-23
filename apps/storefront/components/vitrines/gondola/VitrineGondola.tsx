'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatarHorario, horarioDeHoje, normalizeStoreConteudo, relogioDaLoja, useCartStore } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import {
  Sacola,
  StatusAberto,
  exigeEscolha,
  idDaSecao,
  precoFinalDe,
  prefereMenosMovimento,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import {
  AcaoGondola,
  CardGondola,
  CardOferta,
  EstilosGondola,
  FLASH_MS,
  IconeTraco,
  Letreiro,
  MAX_OFERTAS,
  descontoPct,
} from './gondola-ui'

/**
 * Vitrine gôndola — layout PRÓPRIO do arquétipo `market` para mercado &
 * conveniência (default), construção & ferramentas e oficinas
 * (docs/store-theme/02 §I e 05 "Vitrine gôndola"). Port web de
 * apps/mobile-consumer/components/loja/LojaGondola.tsx.
 *
 * DNA destilado:
 * - CABEÇALHO CURTO e brilhante: logo + nome + meta na faixa verde-suave (a
 *   campanha do lojista, quando existe, vira a faixa de anúncio);
 * - BUSCA e CHIPS DE CATEGORIA GRUDADOS no topo: rolam a página até o
 *   corredor e acendem conforme a leitura avança (IntersectionObserver);
 * - OFERTAS DO DIA em trilho compacto com o preço na frente;
 * - GRADE DENSA de 3 colunas por corredor: foto pequena, nome em duas
 *   linhas, PREÇO GRANDE com unidade e ADIÇÃO RÁPIDA no cartão ("+" que
 *   vira contador; item com variação/modificador abre o produto).
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), a barra de
 * menu inferior, a status bar e a transição radial. A sacola vive no header.
 */

const ID_OFERTAS = 'ofertas'
/** Header (52) + busca (50) + chips (52): as âncoras param abaixo do bloco grudado. */
const ALTURA_CHROME = 154

export function VitrineGondola({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])
  const ofertas = useMemo(
    () => todos.filter((p) => descontoPct(p) > 0).sort((a, b) => descontoPct(b) - descontoPct(a)).slice(0, MAX_OFERTAS),
    [todos],
  )

  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const resultado = useMemo(
    () => (termo ? todos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.descricao ?? '').toLowerCase().includes(termo)) : []),
    [todos, termo],
  )

  // Chips: a seção visível mais alta acende (o `aoRolar` da RN num observer).
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(secoesComItens[0]?.chave ?? null)
  useEffect(() => {
    if (secoesComItens.length < 2 || typeof IntersectionObserver === 'undefined') return
    const alvos = secoesComItens
      .map((s) => document.getElementById(idDaSecao(s.chave)))
      .filter((el): el is HTMLElement => el !== null)
    const visiveis = new Map<string, number>()
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.set(e.target.id, e.boundingClientRect.top)
          else visiveis.delete(e.target.id)
        }
        if (visiveis.size === 0) return
        const [topoId] = [...visiveis.entries()].sort((a, b) => a[1] - b[1])[0]
        const chave = secoesComItens.find((s) => idDaSecao(s.chave) === topoId)?.chave
        if (chave) setSecaoAtiva(chave)
      },
      { rootMargin: `-${ALTURA_CHROME}px 0px -55% 0px`, threshold: [0, 0.1] },
    )
    alvos.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [secoesComItens])

  const rolarPara = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth', block: 'start' })
  }, [])

  // ── Adição rápida: o "+" vira contador com a sacola ──
  const adicionarItem = useCartStore((s) => s.adicionarItem)
  const itensSacola = useCartStore((s) => s.itens)
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  const naSacola = useMemo(() => {
    const m = new Map<string, number>()
    if (!montado) return m
    for (const i of itensSacola) m.set(i.product_id, (m.get(i.product_id) ?? 0) + i.quantidade)
    return m
  }, [itensSacola, montado])
  const [flash, setFlash] = useState<string[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach(clearTimeout)
      t.clear()
    }
  }, [])

  const meta = [
    store.tempo_entrega != null ? `Entrega em ${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Frete grátis' : store.taxa_entrega != null ? `Frete ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)
  const iniciais = store.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoGondola — palco contido, preço grande
        // com unidade e contador de quantidade) no lugar do ProductModal.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

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
          setFlash((a) => (a.includes(p.id) ? a : [...a, p.id]))
          clearTimeout(timers.current.get(p.id))
          timers.current.set(
            p.id,
            setTimeout(() => {
              timers.current.delete(p.id)
              setFlash((a) => a.filter((x) => x !== p.id))
            }, FLASH_MS),
          )
        }

        const grade = (produtos: ProdutoCatalogo[]) => (
          <div className="grid grid-cols-3 gap-2">
            {produtos.map((p) => (
              <CardGondola
                key={p.id}
                produto={p}
                quantidade={naSacola.get(p.id) ?? 0}
                acabouDeEntrar={flash.includes(p.id)}
                aoTocar={() => aoAbrirProduto(p)}
                aoAdicionar={() => adicionarRapido(p)}
              />
            ))}
          </div>
        )

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <EstilosGondola />
            <CartPersistence />

            {/* ── Bloco grudado: header claro + busca + chips ── */}
            <div className="sticky top-[var(--inset-top,0px)] z-30 border-b border-line bg-surface shadow-soft">
              <div className="flex h-[52px] items-center px-[calc(var(--space-screen-x,24px)-8px)]">
                <AcaoGondola href="/" rotulo={`${store.nome} — início da loja`}>
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.logo_url}
                      alt=""
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="h-8 w-8 rounded-sm object-cover"
                      style={{ boxShadow: '0 0 0 1px var(--line, #E4E4E7)' }}
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent font-display text-[12px] font-extrabold text-accent-ink" aria-hidden>
                      {iniciais}
                    </span>
                  )}
                </AcaoGondola>
                <a href="/" className="min-w-0 flex-1 truncate px-2 text-center font-display text-[16px] font-extrabold text-ink">
                  {store.nome}
                </a>
                <Sacola>
                  {({ abrir: abrirSacola, totalItens }) => (
                    <AcaoGondola icone="bag" contador={totalItens} rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'} aoTocar={abrirSacola} />
                  )}
                </Sacola>
              </div>

              <form role="search" onSubmit={(e) => e.preventDefault()} className="mx-screen-x flex h-[42px] items-center gap-2 rounded-md bg-surfaceMuted px-3">
                <IconeTraco nome="search" tamanho={17} className="shrink-0 text-ink-muted" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar na loja"
                  aria-label="Buscar na loja"
                  enterKeyHint="search"
                  className="min-w-0 flex-1 bg-transparent font-body text-[14.5px] text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
                />
                {busca.length > 0 && (
                  <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="flex h-7 w-7 shrink-0 items-center justify-center text-ink-soft">
                    <IconeTraco nome="close-circle" tamanho={17} />
                  </button>
                )}
              </form>

              {!termo && secoesComItens.length > 1 ? (
                <nav aria-label="Corredores" className="flex gap-1.5 overflow-x-auto px-screen-x py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {secoesComItens.map((s) => {
                    const ativa = s.chave === secaoAtiva
                    return (
                      <a
                        key={s.chave}
                        href={`#${idDaSecao(s.chave)}`}
                        aria-current={ativa ? 'true' : undefined}
                        onClick={(e) => {
                          e.preventDefault()
                          setSecaoAtiva(s.chave)
                          rolarPara(idDaSecao(s.chave))
                        }}
                        className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-pill px-[13px] font-body text-[12.5px] font-bold transition-colors ${
                          ativa ? 'bg-accent text-accent-ink' : 'bg-surfaceMuted text-ink hover:bg-accent-soft'
                        }`}
                      >
                        {s.titulo}
                      </a>
                    )
                  })}
                </nav>
              ) : (
                <div className="h-2.5" aria-hidden />
              )}
            </div>

            {/* ── Cabeçalho curto da loja na faixa verde-suave ── */}
            <section className="mx-screen-x mt-3 flex items-center gap-3 rounded-md bg-accent-soft p-3" aria-label="Sobre a loja">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm ${store.logo_url ? 'bg-surface' : 'bg-accent'}`}>
                {store.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-[15px] font-extrabold text-accent-ink">{iniciais}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display font-extrabold text-ink" style={{ fontSize: 'calc(17px * var(--type-factor, 1))' }}>
                  {campanha?.titulo ?? store.nome}
                </h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-body text-[12px] font-semibold leading-4 text-ink-muted">
                  {(campanha?.subtitulo ? [campanha.subtitulo, ...meta] : meta).map((m, i) => (
                    <span key={m}>
                      {i > 0 && <span aria-hidden>· </span>}
                      {m}
                    </span>
                  ))}
                  <StatusAberto horarios={store.horarios} className="font-body text-[12px] font-semibold text-ink-muted" />
                </p>
              </div>
            </section>

            {termo ? (
              <section className="px-screen-x pt-4" aria-live="polite" aria-label="Resultados da busca">
                <p className="mb-2.5 font-body text-[13px] font-semibold text-ink-muted">
                  {resultado.length} {resultado.length === 1 ? 'resultado' : 'resultados'} para “{busca.trim()}”
                </p>
                {resultado.length > 0 ? grade(resultado) : <p className="py-6 text-center font-body text-[14px] text-ink-muted">Nada com esse nome. Tente outra palavra.</p>}
              </section>
            ) : todos.length === 0 ? (
              <section className="px-screen-x pt-6" aria-label="Corredores">
                <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
                  <p className="font-display text-[18px] font-extrabold text-ink">As prateleiras ainda estão vazias</p>
                  <p className="mx-auto mt-2 max-w-[34ch] font-body text-[13.5px] leading-5 text-ink-muted">{store.nome} ainda não colocou produtos na vitrine. Volte em breve.</p>
                </div>
              </section>
            ) : (
              <>
                {ofertas.length > 0 && (
                  <section id={ID_OFERTAS} className="pt-[18px]" aria-labelledby="letreiro-ofertas" style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${ALTURA_CHROME}px)` }}>
                    <div className="px-screen-x">
                      <Letreiro id="letreiro-ofertas" titulo="Ofertas do dia" contagem={ofertas.length} />
                    </div>
                    <div className="flex snap-x gap-2 overflow-x-auto px-screen-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {ofertas.map((p) => (
                        <CardOferta key={p.id} produto={p} aoTocar={() => aoAbrirProduto(p)} />
                      ))}
                    </div>
                  </section>
                )}

                {secoesComItens.map((secao: SecaoCatalogo) => (
                  <section key={secao.chave} id={idDaSecao(secao.chave)} className="px-screen-x pt-[22px]" aria-labelledby={`${idDaSecao(secao.chave)}-titulo`} style={{ scrollMarginTop: `calc(var(--inset-top, 0px) + ${ALTURA_CHROME}px)` }}>
                    <Letreiro id={`${idDaSecao(secao.chave)}-titulo`} titulo={secao.titulo} contagem={secao.produtos.length} />
                    {grade(secao.produtos)}
                  </section>
                ))}
              </>
            )}

            <FechoGondola store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

function FechoGondola({ store }: { store: VitrineWebProps['store'] }) {
  const agora = useRelogioDaLoja()
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  return (
    <footer className="mt-10 border-t border-line bg-surface px-screen-x pb-12 pt-6">
      <p className="font-display text-[17px] font-extrabold text-ink">{store.nome}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[12.5px] font-semibold text-ink-muted">
        {hoje && <span suppressHydrationWarning>Hoje {formatarHorario(hoje)}</span>}
        <StatusAberto horarios={store.horarios} className="font-body text-[12.5px] font-semibold text-ink-muted" />
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
