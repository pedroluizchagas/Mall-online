# 12 — Dashboard — Gestão de Pedidos

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

A gestão de pedidos é o módulo mais crítico do dashboard. O lojista
precisa ver novos pedidos em tempo real, confirmar, acompanhar o preparo,
atribuir entregadores e registrar a entrega. Toda atualização de status
acontece via Supabase Realtime — sem necessidade de recarregar a página.

Ao marcar um pedido como entregue, o sistema atualiza o `payment_status`
para `pago` (se pagamento foi online) e o pedido entra na fila do
cron de repasses.

-----

## FLUXO DE STATUS DO PEDIDO

```
novo
  → lojista confirma
confirmado
  → lojista inicia preparo
em_preparo
  → lojista atribui entregador
aguardando_entregador
  → entregador aceita no app
saiu_para_entrega
  → entregador confirma entrega
entregue
  → payment_status = pago (se online)
  → elegível para repasse no cron

Em qualquer etapa anterior a saiu_para_entrega:
  → lojista pode cancelar
cancelado
```

-----

## SERVER ACTIONS — PEDIDOS

### lib/actions/pedidos.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'

type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

// Transições de status permitidas pelo lojista
const transicoesPermitidas: Record<StatusPedido, StatusPedido[]> = {
  novo: ['confirmado', 'cancelado'],
  confirmado: ['em_preparo', 'cancelado'],
  em_preparo: ['aguardando_entregador', 'cancelado'],
  aguardando_entregador: ['cancelado'],
  saiu_para_entrega: [],
  entregue: [],
  cancelado: [],
}

export async function atualizarStatusPedido(
  pedido_id: string,
  novo_status: StatusPedido,
  motivo_cancelamento?: string
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, payment_status, forma_pagamento')
    .eq('id', pedido_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!pedido) return { erro: 'Pedido não encontrado' }

  const statusAtual = pedido.status as StatusPedido
  const permitidos = transicoesPermitidas[statusAtual] ?? []

  if (!permitidos.includes(novo_status)) {
    return {
      erro: `Não é possível mover de "${statusAtual}" para "${novo_status}"`,
    }
  }

  const atualizacao: Record<string, any> = { status: novo_status }

  if (novo_status === 'cancelado') {
    atualizacao.cancelado_em = new Date().toISOString()
    atualizacao.motivo_cancelamento =
      motivo_cancelamento ?? 'Cancelado pelo lojista'
  }

  if (novo_status === 'entregue') {
    // Apenas marca como pago se pagamento foi online
    if (['online_cartao', 'online_pix'].includes(pedido.forma_pagamento)) {
      atualizacao.payment_status = 'pago'
    }
  }

  const { error } = await supabase
    .from('orders')
    .update(atualizacao)
    .eq('id', pedido_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/pedidos')
  return { sucesso: true }
}

export async function atribuirEntregador(
  pedido_id: string,
  courier_id: string,
  valor_entrega: number
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', pedido_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!pedido) return { erro: 'Pedido não encontrado' }
  if (pedido.status !== 'em_preparo') {
    return { erro: 'Pedido precisa estar em preparo para atribuir entregador' }
  }

  const { data: courier } = await supabase
    .from('couriers')
    .select('id, status')
    .eq('id', courier_id)
    .eq('status', 'aprovado')
    .single()

  if (!courier) return { erro: 'Entregador não encontrado ou não aprovado' }

  const { error: assignError } = await supabase
    .from('delivery_assignments')
    .insert({
      order_id: pedido_id,
      courier_id,
      tenant_id: tenant.id,
      status: 'pendente',
      valor_entrega,
    })

  if (assignError) {
    if (assignError.message.includes('unique')) {
      return { erro: 'Este pedido já tem um entregador atribuído' }
    }
    return { erro: assignError.message }
  }

  await supabase
    .from('orders')
    .update({ status: 'aguardando_entregador' })
    .eq('id', pedido_id)

  revalidatePath('/dashboard/pedidos')
  return { sucesso: true }
}

export async function getPedidos(filtros?: {
  status?: StatusPedido
  data_inicio?: string
  data_fim?: string
}) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado', pedidos: [] }

  let query = supabase
    .from('orders')
    .select(`
      id, status, payment_status, forma_pagamento,
      subtotal, taxa_entrega, total, criado_em,
      endereco_entrega, observacoes,
      consumers (id, nome, telefone),
      order_items (
        id, nome, quantidade, preco_unit, subtotal, observacoes
      ),
      delivery_assignments (
        id, status, valor_entrega,
        couriers (id, nome, telefone, foto_url)
      )
    `)
    .eq('tenant_id', tenant.id)
    .order('criado_em', { ascending: false })

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.data_inicio) query = query.gte('criado_em', filtros.data_inicio)
  if (filtros?.data_fim) query = query.lte('criado_em', filtros.data_fim)

  const { data, error } = await query.limit(100)

  if (error) return { erro: error.message, pedidos: [] }
  return { pedidos: data ?? [] }
}
```

-----

## PAGINA DE PEDIDOS (REALTIME)

### app/(dashboard)/pedidos/page.tsx

```typescript
import { getPedidos } from '@/lib/actions/pedidos'
import { PainelPedidosRealtime } from '@/components/dashboard/painel-pedidos-realtime'

export default async function PaginaPedidos() {
  const { pedidos } = await getPedidos()

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-[#1A4D3A] mb-6">Pedidos</h1>
      <PainelPedidosRealtime pedidosIniciais={pedidos} />
    </div>
  )
}
```

-----

## COMPONENTE REALTIME

### components/dashboard/painel-pedidos-realtime.tsx

Recebe os pedidos iniciais do Server Component e mantém a lista
atualizada via Supabase Realtime. Toca som ao chegar pedido novo.

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { PedidoCard } from './pedido-card'
import { FiltroPedidos } from './filtro-pedidos'

type StatusFiltro = 'todos' | 'ativos' | 'entregues' | 'cancelados'

export function PainelPedidosRealtime({
  pedidosIniciais,
}: {
  pedidosIniciais: any[]
}) {
  const [pedidos, setPedidos] = useState(pedidosIniciais)
  const [filtro, setFiltro] = useState<StatusFiltro>('ativos')
  const supabase = createSupabaseClient()
  const audioRef = useRef<AudioContext | null>(null)

  // AudioContext requer interação prévia do usuário
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = new AudioContext()
      }
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

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null

    async function iniciar() {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .single()

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
              // Buscar pedido completo com joins
              const { data } = await supabase
                .from('orders')
                .select(`
                  id, status, payment_status, forma_pagamento,
                  subtotal, taxa_entrega, total, criado_em,
                  endereco_entrega, observacoes,
                  consumers (id, nome, telefone),
                  order_items (id, nome, quantidade, preco_unit, subtotal, observacoes),
                  delivery_assignments (
                    id, status, valor_entrega,
                    couriers (id, nome, telefone, foto_url)
                  )
                `)
                .eq('id', payload.new.id)
                .single()

              if (data) {
                setPedidos((prev) => [data, ...prev])
                tocarSom()
              }
            }

            if (payload.eventType === 'UPDATE') {
              setPedidos((prev) =>
                prev.map((p) =>
                  p.id === payload.new.id ? { ...p, ...payload.new } : p
                )
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
  }, [])

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtro === 'todos') return true
    if (filtro === 'ativos') return !['entregue', 'cancelado'].includes(p.status)
    if (filtro === 'entregues') return p.status === 'entregue'
    if (filtro === 'cancelados') return p.status === 'cancelado'
    return true
  })

  const contadores = {
    novos: pedidos.filter((p) => p.status === 'novo').length,
    em_preparo: pedidos.filter((p) => p.status === 'em_preparo').length,
    saindo: pedidos.filter((p) => p.status === 'saiu_para_entrega').length,
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{contadores.novos}</p>
          <p className="text-xs text-amber-600 mt-0.5">Novos</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{contadores.em_preparo}</p>
          <p className="text-xs text-blue-600 mt-0.5">Em preparo</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{contadores.saindo}</p>
          <p className="text-xs text-green-600 mt-0.5">Saindo</p>
        </div>
      </div>

      <FiltroPedidos filtroAtivo={filtro} onChange={setFiltro} />

      <div className="flex flex-col gap-3 overflow-auto pb-4">
        {pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Nenhum pedido encontrado.
          </div>
        ) : (
          pedidosFiltrados.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} />
          ))
        )}
      </div>
    </div>
  )
}
```

-----

## COMPONENTE PEDIDO CARD

### components/dashboard/pedido-card.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallevo/lib'
import { atualizarStatusPedido } from '@/lib/actions/pedidos'
import { ModalAtribuirEntregador } from './modal-atribuir-entregador'

const LABELS_STATUS: Record<string, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const CORES_STATUS: Record<string, string> = {
  novo: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-purple-100 text-purple-800',
  aguardando_entregador: 'bg-orange-100 text-orange-800',
  saiu_para_entrega: 'bg-cyan-100 text-cyan-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

const PROXIMAS_ACOES: Record<string, { label: string; status: string }[]> = {
  novo: [
    { label: 'Confirmar pedido', status: 'confirmado' },
    { label: 'Cancelar', status: 'cancelado' },
  ],
  confirmado: [
    { label: 'Iniciar preparo', status: 'em_preparo' },
    { label: 'Cancelar', status: 'cancelado' },
  ],
  em_preparo: [{ label: 'Cancelar', status: 'cancelado' }],
  aguardando_entregador: [{ label: 'Cancelar', status: 'cancelado' }],
  saiu_para_entrega: [],
  entregue: [],
  cancelado: [],
}

export function PedidoCard({ pedido }: { pedido: any }) {
  const [expandido, setExpandido] = useState(pedido.status === 'novo')
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const acoes = PROXIMAS_ACOES[pedido.status] ?? []
  const horario = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  function handleAcao(status: string) {
    setErro(null)
    startTransition(async () => {
      const resultado = await atualizarStatusPedido(pedido.id, status as any)
      if (resultado.erro) setErro(resultado.erro)
    })
  }

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        pedido.status === 'novo'
          ? 'border-amber-300 shadow-md shadow-amber-50'
          : 'border-gray-100'
      }`}
    >
      {/* Cabeçalho — sempre visível */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpandido(!expandido)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">
              #{pedido.id.slice(-6).toUpperCase()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CORES_STATUS[pedido.status]}`}>
              {LABELS_STATUS[pedido.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedido.consumers?.nome} — {horario}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold text-[#1A4D3A]">{formatarReais(pedido.total)}</p>
          <p className="text-xs text-gray-400">
            {pedido.forma_pagamento === 'online_cartao' && 'Cartão online'}
            {pedido.forma_pagamento === 'online_pix' && 'PIX'}
            {pedido.forma_pagamento === 'dinheiro' && 'Dinheiro'}
            {pedido.forma_pagamento === 'cartao_maquininha' && 'Cartão na entrega'}
          </p>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-3">

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {erro}
            </p>
          )}

          {/* Itens */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Itens</p>
            <div className="space-y-1">
              {pedido.order_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantidade}x {item.nome}
                    {item.observacoes && (
                      <span className="text-gray-400 ml-1">({item.observacoes})</span>
                    )}
                  </span>
                  <span className="text-gray-600">{formatarReais(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatarReais(pedido.subtotal)}</span>
              </div>
              {pedido.taxa_entrega > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de entrega</span>
                  <span>{formatarReais(pedido.taxa_entrega)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-[#1A4D3A]">{formatarReais(pedido.total)}</span>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Entrega</p>
            <p className="text-sm text-gray-700">
              {pedido.endereco_entrega?.rua}, {pedido.endereco_entrega?.numero}
              {pedido.endereco_entrega?.complemento &&
                ` — ${pedido.endereco_entrega.complemento}`}
            </p>
            <p className="text-sm text-gray-500">
              {pedido.endereco_entrega?.bairro} — {pedido.endereco_entrega?.cidade}
            </p>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Observações</p>
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                {pedido.observacoes}
              </p>
            </div>
          )}

          {/* Entregador atribuído */}
          {pedido.delivery_assignments?.[0] && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Entregador</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {pedido.delivery_assignments[0].couriers?.foto_url ? (
                    <img
                      src={pedido.delivery_assignments[0].couriers.foto_url}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {pedido.delivery_assignments[0].couriers?.nome}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pedido.delivery_assignments[0].couriers?.telefone}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botão de atribuir entregador */}
          {pedido.status === 'em_preparo' && !pedido.delivery_assignments?.[0] && (
            <ModalAtribuirEntregador
              pedidoId={pedido.id}
              valorEntrega={pedido.taxa_entrega}
            />
          )}

          {/* Ações de status */}
          {acoes.length > 0 && (
            <div className="flex gap-2 pt-1">
              {acoes.map((acao) => (
                <button
                  key={acao.status}
                  onClick={() => handleAcao(acao.status)}
                  disabled={isPending}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    disabled:opacity-50 ${
                    acao.status === 'cancelado'
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'bg-[#1A4D3A] text-white hover:bg-[#163d2e]'
                  }`}
                >
                  {isPending ? 'Aguarde...' : acao.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

-----

## MODAL DE ATRIBUICAO DE ENTREGADOR

### components/dashboard/modal-atribuir-entregador.tsx

```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { atribuirEntregador } from '@/lib/actions/pedidos'
import { formatarReais } from '@mallevo/lib'

interface Props {
  pedidoId: string
  valorEntrega: number
}

export function ModalAtribuirEntregador({ pedidoId, valorEntrega }: Props) {
  const [aberto, setAberto] = useState(false)
  const [entregadores, setEntregadores] = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!aberto) return

    async function carregar() {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .single()

      if (!tenant) return

      const { data } = await supabase
        .from('couriers')
        .select('id, nome, telefone, foto_url, tipo, online')
        .eq('status', 'aprovado')
        .or(`tenant_id.eq.${tenant.id},and(tipo.eq.autonomo,online.eq.true)`)
        .order('tipo')

      setEntregadores(data ?? [])
    }

    carregar()
  }, [aberto])

  function handleAtribuir() {
    if (!selecionado) return
    startTransition(async () => {
      const resultado = await atribuirEntregador(pedidoId, selecionado, valorEntrega)
      if (resultado.sucesso) setAberto(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="w-full border border-[#4CAF82] text-[#4CAF82] py-2 rounded-lg
          text-sm font-medium hover:bg-green-50 transition-colors"
      >
        Atribuir entregador
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-[#1A4D3A] mb-1">
              Selecionar entregador
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Valor da entrega: {formatarReais(valorEntrega)}
            </p>

            {entregadores.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum entregador disponível no momento.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {entregadores.map((courier) => (
                  <button
                    key={courier.id}
                    onClick={() => setSelecionado(courier.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border
                      transition-colors text-left ${
                      selecionado === courier.id
                        ? 'border-[#4CAF82] bg-green-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                      {courier.foto_url ? (
                        <img
                          src={courier.foto_url}
                          alt={courier.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center
                          justify-center text-gray-300 text-sm">?</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {courier.nome}
                      </p>
                      <p className="text-xs text-gray-400">
                        {courier.tipo === 'proprio'
                          ? 'Entregador próprio'
                          : 'Autônomo'}
                        {courier.online && (
                          <span className="ml-1 text-green-500">· Online</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAberto(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtribuir}
                disabled={!selecionado || isPending}
                className="flex-1 py-2 bg-[#1A4D3A] text-white rounded-lg text-sm
                  font-medium disabled:opacity-50"
              >
                {isPending ? 'Atribuindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

-----

## MAPA DO ENTREGADOR (MINI)

### components/dashboard/mapa-entregador-mini.tsx

Exibido na página de detalhes quando o status for `saiu_para_entrega`.
Atualiza a posição via Supabase Realtime. No MVP, exibe link para
Google Maps em vez de mapa embutido (evita custo de API do Maps).

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Props {
  courierId: string
}

export function MapaEntregadorMini({ courierId }: Props) {
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('courier_locations')
        .select('latitude, longitude')
        .eq('courier_id', courierId)
        .single()

      if (data) setLoc(data)
    }

    carregar()

    const canal = supabase
      .channel(`loc-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          setLoc({
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [courierId])

  if (!loc) {
    return (
      <div className="bg-gray-100 rounded-xl h-20 flex items-center justify-center">
        <p className="text-sm text-gray-400">Aguardando localização...</p>
      </div>
    )
  }

  const linkMaps = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Entregador em rota</p>
        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Ao vivo
        </span>
      </div>
      <a
        href={linkMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#4CAF82] underline"
      >
        Ver no Google Maps
      </a>
    </div>
  )
}
```

-----

## FILTRO DE PEDIDOS

### components/dashboard/filtro-pedidos.tsx

```typescript
'use client'

type StatusFiltro = 'todos' | 'ativos' | 'entregues' | 'cancelados'

const opcoes: { valor: StatusFiltro; label: string }[] = [
  { valor: 'ativos', label: 'Ativos' },
  { valor: 'todos', label: 'Todos' },
  { valor: 'entregues', label: 'Entregues' },
  { valor: 'cancelados', label: 'Cancelados' },
]

export function FiltroPedidos({
  filtroAtivo,
  onChange,
}: {
  filtroAtivo: StatusFiltro
  onChange: (f: StatusFiltro) => void
}) {
  return (
    <div className="flex gap-2">
      {opcoes.map((op) => (
        <button
          key={op.valor}
          onClick={() => onChange(op.valor)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filtroAtivo === op.valor
              ? 'bg-[#1A4D3A] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Supabase Realtime habilitado no projeto (Project Settings > Realtime)
- [ ] Tabela `orders` com Realtime ativado (Database > Replication > orders)
- [ ] Tabela `courier_locations` com Realtime ativado
- [ ] RLS de `orders` cobrindo SELECT para tenant corretamente (arquivo 05)
- [ ] Som de notificação: AudioContext requer clique prévio do usuário
- [ ] Transições de status validadas no servidor, não apenas na UI
- [ ] `payment_status = pago` apenas para formas de pagamento online
- [ ] Entregador atribuído antes de mover para `aguardando_entregador`
- [ ] Realtime desconectado no cleanup do `useEffect`
- [ ] Mini-mapa exibido apenas com status `saiu_para_entrega`

-----

*Arquivo 12 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 13 — Dashboard — Financeiro e Assinatura*
