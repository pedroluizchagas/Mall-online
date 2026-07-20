import { TRANSICOES_PEDIDO_LOJISTA } from '@mallevo/lib'
import type { OrderStatus } from '@mallevo/types'
import { supabase } from '@/lib/supabase'

// Mutações de pedido — espelho campo a campo de
// apps/web/lib/actions/pedidos.ts (atualizarStatusPedido /
// atribuirEntregador), executadas sob a MESMA RLS do Dashboard.
// A tabela de transições vem de @mallevo/lib (fonte única).

export async function atualizarStatusPedido(
  pedidoId: string,
  novoStatus: OrderStatus,
  motivoCancelamento?: string
): Promise<{ sucesso?: true; erro?: string }> {
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, payment_status, forma_pagamento')
    .eq('id', pedidoId)
    .single()

  if (!pedido) return { erro: 'Pedido não encontrado' }

  const statusAtual = pedido.status as OrderStatus
  const permitidos = TRANSICOES_PEDIDO_LOJISTA[statusAtual] ?? []

  if (!permitidos.includes(novoStatus)) {
    return { erro: `Não é possível mover de "${statusAtual}" para "${novoStatus}"` }
  }

  const atualizacao: Record<string, unknown> = { status: novoStatus }

  if (novoStatus === 'cancelado') {
    atualizacao.cancelado_em = new Date().toISOString()
    atualizacao.motivo_cancelamento = motivoCancelamento ?? 'Cancelado pelo lojista'
  }

  if (novoStatus === 'entregue') {
    // Apenas marca como pago se pagamento foi online (mesma regra do web)
    if (['online_cartao', 'online_pix'].includes(pedido.forma_pagamento)) {
      atualizacao.payment_status = 'pago'
    }
  }

  const { error } = await supabase
    .from('orders')
    .update(atualizacao)
    .eq('id', pedidoId)

  if (error) return { erro: error.message }
  return { sucesso: true }
}

export interface EntregadorDisponivel {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  tipo: 'proprio' | 'autonomo'
  online: boolean
}

/**
 * Entregadores atribuíveis — mesma query do
 * modal-atribuir-entregador.tsx do Dashboard: aprovados, próprios do
 * tenant OU autônomos online.
 */
export async function listarEntregadoresDisponiveis(
  tenantId: string
): Promise<EntregadorDisponivel[]> {
  const { data } = await supabase
    .from('couriers')
    .select('id, nome, telefone, foto_url, tipo, online')
    .eq('status', 'aprovado')
    .or(`tenant_id.eq.${tenantId},and(tipo.eq.autonomo,online.eq.true)`)
    .order('tipo')

  return (data ?? []) as EntregadorDisponivel[]
}

export async function atribuirEntregador(
  pedidoId: string,
  courierId: string,
  tenantId: string,
  valorEntrega: number
): Promise<{ sucesso?: true; erro?: string }> {
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', pedidoId)
    .single()

  if (!pedido) return { erro: 'Pedido não encontrado' }
  if (pedido.status !== 'em_preparo') {
    return { erro: 'Pedido precisa estar em preparo para atribuir entregador' }
  }

  const { data: courier } = await supabase
    .from('couriers')
    .select('id, status')
    .eq('id', courierId)
    .eq('status', 'aprovado')
    .single()

  if (!courier) return { erro: 'Entregador não encontrado ou não aprovado' }

  const { error: assignError } = await supabase.from('delivery_assignments').insert({
    order_id: pedidoId,
    courier_id: courierId,
    tenant_id: tenantId,
    status: 'pendente',
    valor_entrega: valorEntrega,
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
    .eq('id', pedidoId)

  return { sucesso: true }
}
