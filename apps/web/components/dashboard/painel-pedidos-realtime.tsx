'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { money, tempoRelativo } from '@/lib/format'
import { cx } from '@/lib/cx'
import { metaDoStatus, type StatusPedido } from '@/lib/status-pedido'
import { StatusPill } from '@/components/ui/status-pill'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { EmptyState } from './empty-state'
import { PedidoDetalhe } from './pedidos/pedido-detalhe'
import { HaQuantoTempo } from './inicio/ha-quanto-tempo'
import { codigoDoPedido, quantidadeDeItens, rotuloPagamento, type PedidoCompleto } from './pedidos/tipos'

type FiltroKey = 'todos' | 'novo' | 'em_preparo' | 'saiu_para_entrega' | 'entregue'

const FILTROS: { k: FiltroKey; label: string; inclui: (s: StatusPedido) => boolean }[] = [
  { k: 'todos', label: 'Todos', inclui: () => true },
  { k: 'novo', label: 'Novos', inclui: (s) => s === 'novo' },
  {
    k: 'em_preparo',
    label: 'Em preparo',
    inclui: (s) => s === 'confirmado' || s === 'em_preparo' || s === 'aguardando_entregador',
  },
  { k: 'saiu_para_entrega', label: 'Em entrega', inclui: (s) => s === 'saiu_para_entrega' },
  { k: 'entregue', label: 'Entregues', inclui: (s) => s === 'entregue' },
]
const FILTROS_VALIDOS = FILTROS.map((f) => f.k)

/** Na lista completa, os pedidos se agrupam pelo que pedem do lojista. */
const GRUPOS: { titulo: string; inclui: (s: StatusPedido) => boolean }[] = [
  { titulo: 'Pedem sua ação', inclui: (s) => s === 'novo' || s === 'confirmado' || s === 'em_preparo' },
  { titulo: 'A caminho', inclui: (s) => s === 'aguardando_entregador' || s === 'saiu_para_entrega' },
  { titulo: 'Finalizados', inclui: (s) => s === 'entregue' || s === 'cancelado' },
]

const SELECT_PEDIDO = `
  id, status, payment_status, forma_pagamento,
  subtotal, taxa_entrega, total, platform_fee_amount, criado_em,
  endereco_entrega, observacoes,
  tipo, agendamento_inicio_at, agendamento_fim_at, staff_id,
  service_staff:service_staff!staff_id (id, nome, cor),
  consumers (id, nome, telefone),
  order_items (
    id, nome, quantidade, preco_unit, subtotal, observacoes, modifiers,
    variant_id,
    product_variants (
      product_variant_options (
        product_options ( valor, product_option_groups ( nome ) )
      )
    )
  ),
  delivery_assignments (id, status, valor_entrega, couriers (id, nome, telefone, foto_url))
`

/** Normaliza para busca: minúsculas, sem acentos. */
function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

const CHAVE_SOM = 'pedidos-som'
const XL = '(min-width: 1280px)'

/**
 * Pedidos — o balcão ao vivo. À esquerda, a fila em cartões (agrupada pelo
 * que cada pedido pede do lojista); à direita, o pedido aberto com a
 * marquise dele e a próxima ação. Pedido novo chega pelo Realtime com o MESMO
 * som do app do lojista. Abaixo de 1280px, o cartão abre /pedidos/[id].
 */
export function PainelPedidosRealtime({ pedidosIniciais }: { pedidosIniciais: PedidoCompleto[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [pedidos, setPedidos] = useState<PedidoCompleto[]>(pedidosIniciais)
  // `router.refresh()` (ex.: depois de atribuir um entregador) traz a lista nova do servidor.
  useEffect(() => setPedidos(pedidosIniciais), [pedidosIniciais])
  // Filtro e busca vivem na URL (?f= / ?q=): sobrevivem a reload e são
  // compartilháveis.
  const [filtro, setFiltro] = useState<FiltroKey>(() => {
    const f = searchParams.get('f') as FiltroKey | null
    return f && FILTROS_VALIDOS.includes(f) ? f : 'todos'
  })
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (pedidosIniciais.find((p) => metaDoStatus(p.status).pedeAcao) ?? pedidosIniciais[0])?.id ?? null,
  )
  const [chegaram, setChegaram] = useState<Set<string>>(() => new Set())
  // Som de pedido novo é opt-out persistido.
  const [somAtivo, setSomAtivo] = useState(true)
  const somAtivoRef = useRef(somAtivo)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setSomAtivo(localStorage.getItem(CHAVE_SOM) !== 'off')
  }, [])
  useEffect(() => {
    somAtivoRef.current = somAtivo
  }, [somAtivo])

  function alternarSom() {
    setSomAtivo((s) => {
      localStorage.setItem(CHAVE_SOM, s ? 'off' : 'on')
      return !s
    })
  }

  function tocarSom() {
    audioRef.current ??= new Audio('/som/pedido-novo.wav')
    audioRef.current.currentTime = 0
    // Sem interação prévia na página o navegador recusa — silencioso.
    void audioRef.current.play().catch(() => {})
  }

  // Espelha filtro/busca na URL (replace; busca levemente debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (filtro !== 'todos') params.set('f', filtro)
      if (search.trim()) params.set('q', search.trim())
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [filtro, search, pathname, router])

  // Realtime: pedido novo entra no topo (com som); mudanças de status valem na hora.
  useEffect(() => {
    const supabase = createSupabaseClient()
    let canal: ReturnType<typeof supabase.channel> | null = null
    let cancelado = false

    async function iniciar() {
      const { data: tenant } = await supabase.from('tenants').select('id').single()
      if (!tenant || cancelado) return

      canal = supabase
        .channel(`pedidos-${tenant.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const { data } = await supabase.from('orders').select(SELECT_PEDIDO).eq('id', payload.new.id).single()
              if (data) {
                const novo = data as unknown as PedidoCompleto
                setPedidos((prev) => (prev.some((p) => p.id === novo.id) ? prev : [novo, ...prev]))
                setChegaram((prev) => new Set(prev).add(novo.id))
                if (somAtivoRef.current) tocarSom()
              }
            }
            if (payload.eventType === 'UPDATE') {
              setPedidos((prev) =>
                prev.map((p) => (p.id === payload.new.id ? { ...p, ...(payload.new as Partial<PedidoCompleto>) } : p)),
              )
            }
          },
        )
        .subscribe()
    }

    void iniciar()
    return () => {
      cancelado = true
      if (canal) void supabase.removeChannel(canal)
    }
  }, [])

  function aoMudarStatus(id: string, status: StatusPedido) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  const filtroAtual = FILTROS.find((f) => f.k === filtro) ?? FILTROS[0]
  const contagem = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f.k, pedidos.filter((o) => f.inclui(o.status)).length])),
    [pedidos],
  ) as Record<FiltroKey, number>

  const shown = pedidos.filter((o) => {
    if (!filtroAtual.inclui(o.status)) return false
    if (!search.trim()) return true

    // Busca por nº do pedido, cliente, telefone ou bairro.
    const q = normalizarBusca(search.trim().replace(/^#/, ''))
    const qDigitos = q.replace(/\D/g, '')
    if (o.id.toLowerCase().includes(q)) return true
    if (normalizarBusca(o.consumers?.nome ?? '').includes(q)) return true
    if (normalizarBusca(o.endereco_entrega?.bairro ?? '').includes(q)) return true
    if (qDigitos.length >= 4 && (o.consumers?.telefone ?? '').replace(/\D/g, '').includes(qDigitos)) return true
    return false
  })

  const novosCount = contagem.novo
  // O pedido aberto é sempre um dos visíveis: filtro ou busca que o escondem levam ao primeiro da lista.
  const selected = shown.find((o) => o.id === selectedId) ?? shown[0] ?? null
  const agrupar = filtro === 'todos' && !search.trim()

  function abrir(e: React.MouseEvent, id: string) {
    // Abrir em outra aba (Ctrl/Cmd/Shift/meio) segue o link normalmente.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    // No computador, o pedido abre ao lado; em telas menores, na própria página.
    if (window.matchMedia(XL).matches) {
      e.preventDefault()
      setSelectedId(id)
    }
  }

  const lista = (itens: PedidoCompleto[]) => (
    <ul className="flex flex-col gap-2">
      {itens.map((o) => (
        <li key={o.id} className={chegaram.has(o.id) ? 'entra' : undefined}>
          <LinhaPedido pedido={o} selecionado={selected?.id === o.id} onClick={(e) => abrir(e, o.id)} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="slide-up">
      {/* Barra: o que está acontecendo + busca + som */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-2" aria-live="polite">
          <span
            aria-hidden
            className={cx('size-2 rounded-full', novosCount > 0 && 'pulso')}
            style={{ background: novosCount > 0 ? 'var(--ink)' : 'var(--ink-4)' }}
          />
          {novosCount > 0
            ? `${novosCount} ${novosCount === 1 ? 'novo aguardando' : 'novos aguardando'} confirmação`
            : 'Nenhum pedido novo agora'}
        </p>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <label className="relative flex h-10 min-w-0 flex-1 items-center sm:w-[280px] sm:flex-none">
            <span className="sr-only">Buscar pedido</span>
            <PartnerIcon
              name="search"
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute left-3.5 text-ink-3"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar #pedido, cliente, telefone, bairro"
              className="h-full w-full rounded-full bg-bg pl-10 pr-4 text-[13.5px] text-ink outline-none ring-1 ring-inset ring-line transition-shadow placeholder:text-ink-4 focus:ring-2 focus:ring-ink"
            />
          </label>
          <button
            type="button"
            onClick={alternarSom}
            aria-pressed={somAtivo}
            title={somAtivo ? 'Silenciar o aviso de pedido novo' : 'Ligar o aviso de pedido novo'}
            className={cx(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-bold ring-1 ring-inset transition-colors',
              somAtivo ? 'bg-bg text-ink ring-line hover:bg-bg-2' : 'bg-transparent text-ink-3 ring-line hover:text-ink',
            )}
          >
            <PartnerIcon name={somAtivo ? 'volume' : 'volume-off'} size={16} strokeWidth={2} />
            {somAtivo ? 'Som ligado' : 'Som desligado'}
          </button>
        </div>
      </div>

      {/* Filtros em pílula */}
      <div role="tablist" aria-label="Filtrar pedidos" className="-m-1 mb-5 flex gap-1 overflow-x-auto p-1">
        {FILTROS.map((f) => {
          const ativa = filtro === f.k
          return (
            <button
              key={f.k}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setFiltro(f.k)}
              className={cx(
                'flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors duration-200',
                ativa ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg hover:text-ink',
              )}
            >
              {f.label}
              <span
                className={cx(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                  ativa ? (f.k === 'novo' && contagem.novo > 0 ? 'bg-brick text-brick-ink' : 'bg-bg/20 text-bg') : 'bg-bg-3 text-ink-2',
                )}
              >
                {contagem[f.k]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0">
          {shown.length === 0 ? (
            <div className="cartao">
              <EmptyState
                icone="orders"
                titulo={search.trim() ? 'Nenhum pedido com essa busca' : 'Nenhum pedido por aqui'}
                descricao={
                  search.trim()
                    ? 'Confira o número, o nome do cliente, o telefone ou o bairro.'
                    : 'Quando chegar um pedido, ele aparece aqui na hora — com o aviso sonoro, se o som estiver ligado.'
                }
              />
            </div>
          ) : agrupar ? (
            <div className="flex flex-col gap-8">
              {GRUPOS.map((g) => {
                const itens = shown.filter((o) => g.inclui(o.status))
                if (itens.length === 0) return null
                return (
                  <section key={g.titulo} aria-label={g.titulo}>
                    <p className="micro mb-3 flex items-center gap-2 text-ink-3">
                      {g.titulo}
                      <span className="tabular-nums text-ink-4">{itens.length}</span>
                    </p>
                    {lista(itens)}
                  </section>
                )
              })}
            </div>
          ) : (
            lista(shown)
          )}
        </div>

        <div className="hidden xl:sticky xl:top-6 xl:block">
          {selected ? (
            <PedidoDetalhe
              key={selected.id}
              pedido={selected}
              aoMudarStatus={aoMudarStatus}
              className="max-h-[calc(100dvh-96px)] overflow-y-auto"
            />
          ) : (
            <div className="cartao flex flex-col items-center px-8 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-bg-3 text-ink">
                <PartnerIcon name="orders" size={20} strokeWidth={1.9} />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-ink">Escolha um pedido</p>
              <p className="mt-1 text-[13.5px] text-ink-3">O pedido aberto aparece aqui, com a próxima ação.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LinhaPedido({
  pedido,
  selecionado,
  onClick,
}: {
  pedido: PedidoCompleto
  selecionado: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const meta = metaDoStatus(pedido.status)
  const cliente = pedido.consumers?.nome?.trim() || 'Cliente'
  const qtd = quantidadeDeItens(pedido)
  const finalizado = pedido.status === 'entregue' || pedido.status === 'cancelado'

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      onClick={onClick}
      aria-current={selecionado ? 'true' : undefined}
      className={cx(
        'cartao group flex items-center gap-4 p-4 transition-[box-shadow,transform] duration-200 ease-entrada',
        selecionado ? 'ring-2 ring-ink' : 'hover:-translate-y-px hover:shadow-md',
      )}
    >
      <span
        aria-hidden
        className={cx('relative flex size-11 shrink-0 items-center justify-center rounded-full', finalizado ? 'bg-bg-2 text-ink-3' : 'bg-bg-2 text-ink')}
      >
        <PartnerIcon name={meta.icone} size={18} strokeWidth={1.9} />
        {pedido.status === 'novo' && (
          <span
            className="pulso absolute right-0 top-0 size-2.5 rounded-full ring-2 ring-[color:var(--bg)]"
            style={{ background: 'var(--brick)', boxShadow: '0 0 0 1px var(--ink) inset' }}
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cx('truncate text-[14.5px] font-semibold', finalizado ? 'text-ink-2' : 'text-ink')}>{cliente}</span>
          <span className="hidden shrink-0 font-mono text-[11.5px] text-ink-3 sm:inline">{codigoDoPedido(pedido.id)}</span>
        </span>
        <span className="mt-1 block truncate text-[12.5px] text-ink-3">
          {qtd} {qtd === 1 ? 'item' : 'itens'}
          {pedido.endereco_entrega?.bairro ? ` · ${pedido.endereco_entrega.bairro}` : ''}
          {` · ${rotuloPagamento(pedido.forma_pagamento)}`}
          {' · '}
          <HaQuantoTempo iso={pedido.criado_em} inicial={tempoRelativo(pedido.criado_em)} />
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cx('text-[14.5px] font-bold tabular-nums', finalizado ? 'text-ink-2' : 'text-ink')}>
          {money(pedido.total)}
        </span>
        <StatusPill status={pedido.status} />
      </span>
    </Link>
  )
}
