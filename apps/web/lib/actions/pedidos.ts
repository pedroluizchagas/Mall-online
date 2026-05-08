'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { OrderStatus } from '@mallora/types'

// Transições de status permitidas pelo lojista
const transicoesPermitidas: Record<OrderStatus, OrderStatus[]> = {
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
  novo_status: OrderStatus,
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

  const statusAtual = pedido.status as OrderStatus
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
  status?: OrderStatus
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

export async function getPedidoPorId(pedido_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, payment_status, forma_pagamento,
      subtotal, taxa_entrega, total, criado_em,
      endereco_entrega, observacoes,
      cancelado_em, motivo_cancelamento,
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
      delivery_assignments (
        id, status, valor_entrega,
        couriers (id, nome, telefone, foto_url)
      )
    `)
    .eq('id', pedido_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error) return { erro: error.message }
  return { pedido: data }
}
