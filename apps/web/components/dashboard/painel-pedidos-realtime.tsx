'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Search, Filter, MapPin, Check, X, Bike, Phone, Download, CreditCard } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { atualizarStatusPedido } from '@/lib/actions/pedidos'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, getStatusMeta, type OrderStatus } from '@/components/ui/status-pill'
import { ProductThumb } from '@/components/ui/product-thumb'
import { money } from '@/lib/format'

type FiltroKey = 'todos' | 'novo' | 'em_preparo' | 'saiu_para_entrega' | 'entregue'

interface Pedido {
  id: string
  status: OrderStatus
  forma_pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  criado_em: string
  endereco_entrega: { rua?: string; numero?: string; bairro?: string; cidade?: string } | null
  observacoes: string | null
  tipo?: 'entrega' | 'agendamento' | null
  agendamento_inicio_at?: string | null
  agendamento_fim_at?: string | null
  staff_id?: string | null
  service_staff?: { id: string; nome: string; cor: string | null } | null
  consumers?: { id: string; nome: string; telefone: string } | null
  order_items?: Array<{
    id: string
    nome: string
    quantidade: number
    preco_unit: number
    subtotal: number
    observacoes?: string | null
    modifiers?: Array<{ modifier_id: string; nome: string; preco_extra: number }> | null
    variant_id?: string | null
    product_variants?: {
      product_variant_options?: Array<{
        product_options?: {
          valor: string | null
          product_option_groups?: { nome: string | null } | null
        } | null
      }> | null
    } | null
  }>
  delivery_assignments?: Array<{ couriers?: { nome: string; telefone: string } | null }>
}

export function PainelPedidosRealtime({ pedidosIniciais }: { pedidosIniciais: Pedido[] }) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais)
  const [filtro, setFiltro] = useState<FiltroKey>('todos')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(pedidosIniciais[0]?.id ?? null)
  const supabase = createSupabaseClient()
  const audioRef = useRef<AudioContext | null>(null)

  // Audio context unlock
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) audioRef.current = new AudioContext()
    }
    document.addEventListener('click', init, { once: true })
    return () => document.removeEventListener('click', init)
  }, [])

  function tocarSom() {
    const ctx = audioRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  }

  // Realtime subscription
  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null

    async function iniciar() {
      const { data: tenant } = await supabase.from('tenants').select('id').single()
      if (!tenant) return

      canal = supabase
        .channel(`pedidos-${tenant.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${tenant.id}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const { data } = await supabase
                .from('orders')
                .select(`
                  id, status, payment_status, forma_pagamento,
                  subtotal, taxa_entrega, total, criado_em,
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
                `)
                .eq('id', payload.new.id)
                .single()
              if (data) {
                setPedidos((prev) => [data as unknown as Pedido, ...prev])
                tocarSom()
              }
            }
            if (payload.eventType === 'UPDATE') {
              setPedidos((prev) =>
                prev.map((p) => (p.id === payload.new.id ? { ...p, ...(payload.new as Partial<Pedido>) } : p))
              )
            }
          }
        )
        .subscribe()
    }

    iniciar()
    return () => {
      if (canal) supabase.removeChannel(canal)
    }
  }, [supabase])

  const filters: { k: FiltroKey; label: string; n: number }[] = useMemo(
    () => [
      { k: 'todos', label: 'Todos', n: pedidos.length },
      { k: 'novo', label: 'Novos', n: pedidos.filter((o) => o.status === 'novo').length },
      {
        k: 'em_preparo',
        label: 'Em preparo',
        n: pedidos.filter((o) => o.status === 'em_preparo' || o.status === 'aguardando_entregador').length,
      },
      { k: 'saiu_para_entrega', label: 'Saiu', n: pedidos.filter((o) => o.status === 'saiu_para_entrega').length },
      { k: 'entregue', label: 'Entregues', n: pedidos.filter((o) => o.status === 'entregue').length },
    ],
    [pedidos]
  )

  const shown = pedidos.filter((o) => {
    if (filtro === 'em_preparo') {
      if (o.status !== 'em_preparo' && o.status !== 'aguardando_entregador') return false
    } else if (filtro !== 'todos' && o.status !== filtro) {
      return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return o.id.toLowerCase().includes(q) || (o.consumers?.nome ?? '').toLowerCase().includes(q)
  })

  const novosCount = pedidos.filter((o) => o.status === 'novo').length
  const selected = pedidos.find((o) => o.id === selectedId) ?? shown[0] ?? null

  return (
    <div className="slide-up">
      {/* Toolbar (busca + filtros) */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-ink-3 text-[13px] flex items-center gap-1.5">
          <span
            className="pulse-dot inline-block rounded-full"
            style={{ background: 'var(--brick)', width: 6, height: 6 }}
          />
          {novosCount} novo{novosCount === 1 ? '' : 's'} aguardando confirmação
        </div>
        <div className="flex gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 mb-4 rounded-md w-fit"
        style={{ background: 'var(--bg-2)', padding: 4 }}
      >
        {filters.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              filtro === f.k
                ? { background: 'var(--bg)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' }
                : { background: 'transparent', color: 'var(--ink-3)' }
            }
          >
            {f.label}
            <span
              className="px-1.5 py-px rounded-full text-[10px] font-semibold"
              style={
                filtro === f.k
                  ? { background: 'var(--ink)', color: 'var(--bg)' }
                  : { background: 'var(--line-2)', color: 'var(--ink-2)' }
              }
            >
              {f.n}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) 420px' }}>
        <Card className="!p-0 overflow-hidden">
          <div
            className="grid items-center px-4 py-2.5 border-b text-[11px] font-medium uppercase tracking-wider text-ink-3"
            style={{
              gridTemplateColumns: '90px 1fr 130px 140px 100px 100px',
              gap: 12,
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
            }}
          >
            <div>Pedido</div>
            <div>Cliente</div>
            <div>Bairro</div>
            <div>Status</div>
            <div>Pgto</div>
            <div className="text-right">Total</div>
          </div>
          {shown.length === 0 && (
            <div className="text-center py-12 text-ink-3 text-sm">Nenhum pedido encontrado.</div>
          )}
          {shown.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              selected={selected?.id === o.id}
              onClick={() => setSelectedId(o.id)}
            />
          ))}
        </Card>

        <OrderDetail order={selected} />
      </div>
    </div>
  )
}

const DIAS_CURTOS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function formatarRangeAgendamento(inicioIso: string, fimIso: string | null): string {
  const ini = new Date(inicioIso)
  const dia = String(ini.getDate()).padStart(2, '0')
  const mes = String(ini.getMonth() + 1).padStart(2, '0')
  const sem = DIAS_CURTOS_PT[ini.getDay()]
  const horaIni = `${String(ini.getHours()).padStart(2, '0')}:${String(ini.getMinutes()).padStart(2, '0')}`
  if (!fimIso) return `${sem} ${dia}/${mes} às ${horaIni}`
  const fim = new Date(fimIso)
  const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`
  const duracao = Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 60000))
  return `${sem} ${dia}/${mes} ${horaIni}—${horaFim} (${duracao}min)`
}

function OrderRow({ order, selected, onClick }: { order: Pedido; selected: boolean; onClick: () => void }) {
  const horario = new Date(order.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isPix = order.forma_pagamento === 'online_pix'
  return (
    <div
      onClick={onClick}
      className="grid items-center cursor-pointer transition-all border-b"
      style={{
        gridTemplateColumns: '90px 1fr 130px 140px 100px 100px',
        gap: 12,
        padding: '14px 16px',
        background: selected ? 'var(--bg-2)' : 'transparent',
        borderLeft: `3px solid ${selected ? 'var(--brick)' : 'transparent'}`,
        borderColor: 'var(--line)',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--bg-2)'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent'
      }}
    >
      <div className="font-mono text-[12px] text-ink-2 font-medium">
        #{order.id.slice(-6).toUpperCase()}
      </div>
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={order.consumers?.nome ?? 'Cliente'} size={28} />
        <div className="min-w-0">
          <div className="text-[13px] font-medium truncate">{order.consumers?.nome ?? 'Cliente'}</div>
          <div className="text-[11px] text-ink-3">
            {order.order_items?.length ?? 0} itens · {horario}
          </div>
        </div>
      </div>
      <div className="text-[12px] text-ink-2 truncate">
        <MapPin className="w-2.5 h-2.5 inline mr-1 text-ink-3" />
        {order.endereco_entrega?.bairro ?? '—'}
      </div>
      <div>
        <StatusPill status={order.status} />
      </div>
      <div className="flex items-center gap-1 text-[12px] text-ink-2">
        <CreditCard className="w-3 h-3" /> {isPix ? 'PIX' : 'Cartão'}
      </div>
      <div className="text-right font-semibold text-[13px]">{money(Number(order.total))}</div>
    </div>
  )
}

function OrderDetail({ order }: { order: Pedido | null }) {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  if (!order) return null
  const meta = getStatusMeta(order.status)

  function onAction(novo: OrderStatus) {
    setErro(null)
    startTransition(() => {
      void atualizarStatusPedido(order!.id, novo).then((r) => {
        if (r.erro) setErro(r.erro)
      })
    })
  }

  const steps: { k: OrderStatus; label: string }[] = [
    { k: 'novo', label: 'Pedido criado' },
    { k: 'confirmado', label: 'Confirmado' },
    { k: 'em_preparo', label: 'Em preparo' },
    { k: 'saiu_para_entrega', label: 'Saiu p/ entrega' },
    { k: 'entregue', label: 'Entregue' },
  ]
  const order_idx: Record<OrderStatus, number> = {
    novo: 0,
    confirmado: 1,
    em_preparo: 2,
    aguardando_entregador: 2,
    saiu_para_entrega: 3,
    entregue: 4,
    cancelado: -1,
  }
  const currentIdx = order_idx[order.status]

  const items = order.order_items ?? []
  const courier = order.delivery_assignments?.[0]?.couriers ?? null

  return (
    <Card className="!p-0 sticky top-5 overflow-hidden">
      {/* Header */}
      <div
        className="border-b"
        style={{ padding: 18, background: meta.bg, borderColor: 'var(--line)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-xs font-medium" style={{ color: meta.color }}>
              #{order.id.slice(-6).toUpperCase()}
            </div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {order.consumers?.nome ?? 'Cliente'}
            </div>
            <div className="text-xs text-ink-2 mt-0.5">
              {order.tipo === 'agendamento' ? (
                <>
                  📅 {formatarRangeAgendamento(order.agendamento_inicio_at!, order.agendamento_fim_at ?? null)}
                  {order.service_staff?.nome ? ` · ${order.service_staff.nome}` : ''}
                </>
              ) : (
                <>
                  {order.endereco_entrega?.rua ?? ''}
                  {order.endereco_entrega?.numero ? `, ${order.endereco_entrega.numero}` : ''}
                  {order.endereco_entrega?.bairro ? ` · ${order.endereco_entrega.bairro}` : ''}
                </>
              )}
            </div>
          </div>
          <StatusPill status={order.status} />
        </div>
      </div>

      {/* Timeline */}
      <div className="border-b" style={{ padding: 18, borderColor: 'var(--line)' }}>
        <div className="text-[11px] text-ink-3 font-medium uppercase tracking-wider mb-2.5">
          Linha do tempo
        </div>
        {steps.map((s, i) => {
          const done = i <= currentIdx && currentIdx >= 0
          const active = i === currentIdx
          return (
            <div
              key={s.k}
              className="flex gap-2.5 relative"
              style={{ paddingBottom: i < steps.length - 1 ? 10 : 0 }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: done ? 'var(--brick)' : 'var(--bg-2)',
                    border: `2px solid ${done ? 'var(--brick)' : 'var(--line-2)'}`,
                  }}
                >
                  {done && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-0.5 flex-1 my-0.5"
                    style={{ background: i < currentIdx ? 'var(--brick)' : 'var(--line)' }}
                  />
                )}
              </div>
              <div className="flex-1 pb-1.5">
                <div
                  className="text-[13px]"
                  style={{
                    fontWeight: active ? 600 : 500,
                    color: done ? 'var(--ink)' : 'var(--ink-3)',
                  }}
                >
                  {s.label}
                  {active && (
                    <span
                      className="pulse-dot inline-block rounded-full ml-1.5"
                      style={{ background: 'var(--brick)', width: 5, height: 5 }}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Items */}
      <div className="border-b" style={{ padding: 18, borderColor: 'var(--line)' }}>
        <div className="text-[11px] text-ink-3 font-medium uppercase tracking-wider mb-2.5">
          Itens ({items.length})
        </div>
        {items.length === 0 && <div className="text-xs text-ink-3">Sem itens.</div>}
        {items.map((it) => {
          const refs = it.product_variants?.product_variant_options ?? []
          const valoresVariant = refs
            .map((vo) => vo?.product_options?.valor)
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
          const rotuloVariant =
            valoresVariant.length > 0 ? valoresVariant.join(' × ') : null
          return (
            <div key={it.id} className="flex items-start gap-2.5 py-1.5">
              <ProductThumb name={it.nome} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{it.nome}</div>
                <div className="text-[11px] text-ink-3">{it.quantidade}x</div>
                {rotuloVariant && (
                  <div className="text-[11px] text-ink-2 font-medium mt-0.5">
                    {rotuloVariant}
                  </div>
                )}
                {it.modifiers && it.modifiers.length > 0 && (
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    {it.modifiers.map((m) => m.nome).join(', ')}
                  </div>
                )}
                {it.observacoes && (
                  <div className="text-[11px] text-ink-3 italic mt-0.5">
                    &ldquo;{it.observacoes}&rdquo;
                  </div>
                )}
              </div>
              <div className="text-[13px] font-medium">{money(Number(it.subtotal))}</div>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="border-b" style={{ padding: 18, background: 'var(--bg-2)', borderColor: 'var(--line)' }}>
        <Linha label="Subtotal" valor={money(Number(order.subtotal))} />
        {Number(order.taxa_entrega) > 0 && (
          <Linha label="Taxa de entrega" valor={money(Number(order.taxa_entrega))} />
        )}
        <Linha label="Comissão Mallevo" valor="− R$ 1,00" muted />
        <div className="h-px my-2" style={{ background: 'var(--line-2)' }} />
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] font-semibold">Você recebe</span>
          <span className="text-lg font-semibold tracking-tight">
            {money(Math.max(0, Number(order.total) - 1))}
          </span>
        </div>
      </div>

      {/* Actions */}
      {erro && (
        <div className="px-[18px] pt-3 text-xs text-err">{erro}</div>
      )}
      <div className="flex gap-2" style={{ padding: 18 }}>
        {order.status === 'novo' && (
          <>
            <Button onClick={() => onAction('cancelado')} disabled={isPending} variant="ghost">
              <X className="w-3.5 h-3.5" /> Recusar
            </Button>
            <Button onClick={() => onAction('confirmado')} disabled={isPending} variant="brick" flex={2}>
              <Check className="w-3.5 h-3.5" /> Confirmar pedido
            </Button>
          </>
        )}
        {order.status === 'confirmado' && (
          <Button onClick={() => onAction('em_preparo')} disabled={isPending} variant="primary">
            Iniciar preparo
          </Button>
        )}
        {order.status === 'em_preparo' && (
          <Button onClick={() => onAction('aguardando_entregador')} disabled={isPending} variant="primary">
            <Bike className="w-3.5 h-3.5" /> Despachar entregador
          </Button>
        )}
        {order.status === 'saiu_para_entrega' && courier && (
          <Button variant="ghost" disabled>
            <Phone className="w-3.5 h-3.5" /> {courier.nome}
          </Button>
        )}
        {order.status === 'entregue' && (
          <Button variant="ghost">
            <Download className="w-3.5 h-3.5" /> Comprovante
          </Button>
        )}
      </div>
    </Card>
  )
}

function Linha({ label, valor, muted }: { label: string; valor: string; muted?: boolean }) {
  return (
    <div
      className="flex justify-between text-xs mb-1"
      style={{ color: muted ? 'var(--ink-3)' : 'var(--ink-2)' }}
    >
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  )
}

function Button({
  children,
  onClick,
  disabled,
  variant,
  flex = 1,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant: 'ghost' | 'primary' | 'brick'
  flex?: number
}) {
  const styles =
    variant === 'brick'
      ? { background: 'var(--brick)', color: 'var(--brick-ink)', border: 'none' }
      : variant === 'primary'
        ? { background: 'var(--ink)', color: 'var(--bg)', border: 'none' }
        : { background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-opacity disabled:opacity-50"
      style={{ ...styles, flex }}
    >
      {children}
    </button>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md"
      style={{
        padding: '7px 12px',
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        width: 240,
      }}
    >
      <Search className="w-3.5 h-3.5 text-ink-3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar #id, cliente..."
        className="bg-transparent border-none outline-none flex-1 text-[13px]"
      />
    </div>
  )
}
