'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { horarioDeHoje, normalizeStoreConteudo, relogioDaLoja } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { ProdutoModalHost } from '@/components/store/ProdutoModalHost'
import { Sacola, StatusAberto, idDaSecao, prefereMenosMovimento, useHeroEmCena } from '@/components/vitrines/_base'
import type { VitrineWebProps } from '@/components/vitrines/tipos'
import type { ProdutoCatalogo } from '@/lib/catalog'
import { AcaoCuidado, CartaoPacote, IconeTraco, Letreiro, LinhaServico } from './cuidado-ui'

/**
 * Vitrine cuidado — layout PRÓPRIO do arquétipo `soft` para salões &
 * estética, pet shop e veterinária (docs/store-theme/02 §E e 05 "Vitrine
 * cuidado"; refs Groomerly, PetPals). Port web de
 * apps/mobile-consumer/components/loja/LojaCuidado.tsx.
 *
 * DNA destilado das referências:
 * - CARTÃO DE BOAS-VINDAS de cantos bem redondos dentro do gutter (a foto
 *   da casa emoldurada), nome em Nunito 800, descrição (a campanha do
 *   lojista manda) e CTA em pill quente;
 * - STATS em moedas arredondadas com fatos da casa (serviços, tempo,
 *   horário de hoje) — só dado real;
 * - PACOTES: a primeira seção (ou os `destaques` do lojista) em
 *   CARTÕES-TIER com preço grande e CHECKLIST da ficha técnica;
 * - demais seções em LISTA ARREDONDADA;
 * - fecho acolhedor com o horário de hoje.
 *
 * O que NÃO veio da RN: o botão "voltar" (a casa ocupa o lugar), a barra de
 * menu inferior, a status bar e a transição radial. A sacola vive no header.
 */

const ID_SERVICOS = 'servicos'
const ALTURA_HEADER = 58
const MAX_PACOTES = 6

export function VitrineCuidado({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])

  // Pacotes: os `destaques` do lojista; sem eles, a primeira seção (a RN).
  const pacotes = useMemo(() => {
    const escolhidos = (conteudo.destaques ?? []).map((id) => todos.find((p) => p.id === id)).filter((p): p is ProdutoCatalogo => !!p)
    const base = escolhidos.length > 0 ? escolhidos : secoesComItens[0]?.produtos ?? []
    return base.slice(0, MAX_PACOTES)
  }, [todos, conteudo.destaques, secoesComItens])
  const tituloPacotes = (conteudo.destaques ?? []).length > 0 ? 'Pacotes em destaque' : secoesComItens[0]?.titulo ?? 'Pacotes'
  // Quando os destaques vêm do lojista, todas as seções seguem na lista.
  const secoesLista = (conteudo.destaques ?? []).length > 0 ? secoesComItens : secoesComItens.slice(1)

  const { heroRef, emCena } = useHeroEmCena<HTMLElement>()
  const headerClaro = !emCena
  const hoje = horarioDeHoje(store.horarios, relogioDaLoja())
  const stats = [
    { rotulo: todos.length === 1 ? 'serviço' : 'serviços', valor: String(todos.length) },
    store.tempo_entrega != null ? { rotulo: 'min', valor: String(store.tempo_entrega) } : null,
    hoje ? { rotulo: 'hoje até', valor: hoje.fecha } : null,
  ].filter((s): s is { rotulo: string; valor: string } => !!s)
  const iniciais = store.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  const rolarParaServicos = useCallback(() => {
    document.getElementById(ID_SERVICOS)?.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth', block: 'start' })
  }, [])

  return (
    <ProdutoModalHost
      secoes={secoes}
      loja={{ id: store.id, nome: store.nome, taxa_entrega: store.taxa_entrega ?? 0 }}
      detalhes={detalhes}
      initialProdutoId={initialProdutoId}
    >
      {(abrir) => {
        // TODO(2b): PDP própria (ProdutoCuidado — folha acolhedora com
        // checklist da ficha) no lugar do ProductModal quando não há variações.
        const aoAbrirProduto = (p: ProdutoCatalogo) => abrir(p.id)

        return (
          <main className="relative min-h-screen bg-canvas text-ink">
            <CartPersistence />

            {/* ── Header: moedas sobre o canvas → surface com fio depois do cartão ── */}
            <div className="sticky top-0 z-30 h-0">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 border-b border-line bg-surface transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ height: ALTURA_HEADER, opacity: headerClaro ? 1 : 0 }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-[calc(var(--space-screen-x,24px)-8px)]" style={{ height: ALTURA_HEADER }}>
                  <AcaoCuidado href="/" rotulo={`${store.nome} — início da loja`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="font-display text-[13px] font-extrabold text-accent" aria-hidden>
                        {iniciais}
                      </span>
                    )}
                  </AcaoCuidado>
                  <a
                    href="/"
                    className="min-w-0 flex-1 truncate px-2 text-center font-display text-[16px] font-extrabold text-ink transition-opacity duration-300 motion-reduce:transition-none"
                    style={{ opacity: headerClaro ? 1 : 0 }}
                    aria-hidden={!headerClaro}
                    tabIndex={headerClaro ? 0 : -1}
                  >
                    {store.nome}
                  </a>
                  <Sacola>
                    {({ abrir: abrirSacola, totalItens }) => (
                      <AcaoCuidado icone="bag" contador={totalItens} rotulo={totalItens > 0 ? `Sacola, ${totalItens} itens` : 'Sacola vazia'} aoTocar={abrirSacola} />
                    )}
                  </Sacola>
                </div>
              </div>
            </div>

            {/* ── Cartão de boas-vindas ── */}
            <section ref={heroRef} className="mx-screen-x mt-[60px] overflow-hidden rounded-xl bg-surface shadow-soft" aria-label="Boas-vindas">
              <div className="h-[190px] bg-accent-soft">
                {store.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.banner_url} alt="" loading="eager" fetchPriority="high" decoding="async" className="block h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-accent">
                    <IconeTraco nome="heart" tamanho={36} espessura={1.8} />
                  </div>
                )}
              </div>
              <div className="px-[18px] pb-[18px]">
                <div className="-mt-[26px] flex items-end gap-3">
                  <span className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-surface shadow-soft ${store.logo_url ? 'bg-surface' : 'bg-accent'}`}>
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-[18px] font-extrabold text-accent-ink">{iniciais}</span>
                    )}
                  </span>
                  <StatusAberto horarios={store.horarios} className="pb-1.5 font-body text-[12px] font-bold text-ink-muted" />
                </div>
                {campanha?.eyebrow && <p className="mt-3 font-body text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-accent">{campanha.eyebrow}</p>}
                <h1
                  className="mt-2 font-display font-extrabold text-ink"
                  style={{ fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 'calc(31px * var(--type-factor, 1))' }}
                >
                  {campanha?.titulo ?? store.nome}
                </h1>
                {(campanha?.subtitulo ?? conteudo.manifesto ?? store.descricao) && (
                  <p className="mt-1.5 line-clamp-3 font-body text-[14px] font-medium leading-[21px] text-ink-muted">
                    {campanha?.subtitulo ?? conteudo.manifesto ?? store.descricao}
                  </p>
                )}

                <ul className="mt-4 flex gap-2 list-none p-0 m-0" aria-label="Fatos da casa">
                  {stats.map((s) => (
                    <li key={s.rotulo} className="flex flex-1 flex-col items-center rounded-lg bg-accent-soft py-2.5">
                      <span className="font-display text-[18px] font-extrabold text-ink">{s.valor}</span>
                      <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.6px] text-ink-muted">{s.rotulo}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`#${ID_SERVICOS}`}
                  onClick={(e) => {
                    e.preventDefault()
                    rolarParaServicos()
                  }}
                  className="mt-4 flex h-12 items-center justify-center gap-2 rounded-pill bg-accent font-body text-[14.5px] font-extrabold text-accent-ink transition-opacity hover:opacity-90"
                >
                  {campanha?.cta ?? 'Ver serviços'}
                  <IconeTraco nome="chevron-down" tamanho={16} espessura={2.4} />
                </a>
              </div>
            </section>

            {todos.length === 0 ? (
              <section id={ID_SERVICOS} className="mx-screen-x mt-7 rounded-xl bg-surface p-8 text-center" aria-label="Serviços">
                <p className="font-display text-[18px] font-extrabold text-ink">A casa ainda está montando a agenda</p>
                <p className="mx-auto mt-2 max-w-[34ch] font-body text-[13.5px] leading-5 text-ink-muted">{store.nome} ainda não colocou serviços na vitrine. Volte em breve.</p>
              </section>
            ) : (
              <>
                {pacotes.length > 0 && (
                  <section id={ID_SERVICOS} className="scroll-mt-16 pt-7" aria-labelledby="letreiro-pacotes">
                    <Letreiro id="letreiro-pacotes" titulo={tituloPacotes} sub="Escolha o pacote e a gente cuida do resto" />
                    <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-screen-x pb-2 list-none m-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {pacotes.map((p, i) => (
                        <li key={p.id} className="w-[72%] shrink-0 snap-start">
                          <CartaoPacote produto={p} destaque={i === 0} aoTocar={() => aoAbrirProduto(p)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {secoesLista.map((secao) => (
                  <section key={secao.chave} id={idDaSecao(secao.chave)} className="scroll-mt-16 pt-7" aria-labelledby={`${idDaSecao(secao.chave)}-titulo`}>
                    <Letreiro id={`${idDaSecao(secao.chave)}-titulo`} titulo={secao.titulo} />
                    <ul className="mx-screen-x divide-y divide-line overflow-hidden rounded-xl bg-surface list-none p-0 m-0">
                      {secao.produtos.map((p) => (
                        <li key={p.id}>
                          <LinhaServico produto={p} aoTocar={() => aoAbrirProduto(p)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </>
            )}

            <FechoCuidado store={store} />
          </main>
        )
      }}
    </ProdutoModalHost>
  )
}

function FechoCuidado({ store }: { store: VitrineWebProps['store'] }) {
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    setAgora(relogioDaLoja())
    const id = setInterval(() => setAgora(relogioDaLoja()), 30_000)
    return () => clearInterval(id)
  }, [])
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  return (
    <footer className="mt-9 flex flex-col items-center px-screen-x pb-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <IconeTraco nome="heart" tamanho={20} espessura={2} />
      </span>
      <p className="mt-3 font-display text-[18px] font-extrabold text-ink">{store.nome}</p>
      {hoje && (
        <p className="mt-1 font-body text-[13px] font-semibold text-ink-muted" suppressHydrationWarning>
          Hoje das {hoje.abre} às {hoje.fecha}
        </p>
      )}
      <StatusAberto horarios={store.horarios} className="mt-1 font-body text-[13px] font-semibold text-ink-muted" />
      {store.telefone && (
        <a href={`tel:${store.telefone}`} className="mt-3 font-body text-[13px] font-semibold text-accent underline-offset-2 hover:underline">
          {store.telefone}
        </a>
      )}
      <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-body text-[12px] text-ink-muted">
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
