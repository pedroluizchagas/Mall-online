import { notFound, redirect } from 'next/navigation'

import { createSupabaseServer } from '@/lib/supabase/server'
import { getStore, getStoreSlug } from '@/lib/tenant'
import {
  PedidoClient,
  type PedidoCompleto,
} from '@/components/order/PedidoClient'

/**
 * /pedido/[id] — Server Component (Stage 3f).
 *
 * 1. Gate de sessão consumer: sem usuário autenticado → redirect p/
 *    `/entrar?next=/pedido/<id>` (mesmo gate do 3d/3e). NÃO faz fetch
 *    sem sessão (evita expor erros de RLS).
 * 2. Busca `orders` + `order_items` + `delivery_assignments(couriers)`
 *    com RLS (consumer só lê seus próprios pedidos). NÃO une à tabela
 *    base `stores` (decisão TL §3f, D2) — a loja é resolvida pela view
 *    `public_catalog_stores` via `getStore`.
 * 3. Linha não encontrada (RLS oculta / id inválido) → `notFound()`.
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3f.
 */
export default async function PedidoPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/entrar?next=/pedido/${encodeURIComponent(params.id)}`)
  }

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id, status, payment_status, forma_pagamento,
      subtotal, taxa_entrega, total, criado_em,
      endereco_entrega, observacoes, motivo_cancelamento,
      tipo, agendamento_inicio_at, agendamento_fim_at, staff_id,
      order_items (
        id, nome, quantidade, preco_unit, subtotal, observacoes, modifiers,
        variant_id
      ),
      delivery_assignments (
        id, status, courier_id,
        couriers (id, nome, telefone)
      )
      `
    )
    .eq('id', params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Loja: view D2 (não relê a tabela base `stores`).
  const store = await getStore(getStoreSlug())

  return (
    <main className="bg-canvas">
      <PedidoClient
        pedidoInicial={data as unknown as PedidoCompleto}
        loja={{
          nome: store.nome,
          telefone: store.telefone,
          slug: store.slug,
        }}
      />
    </main>
  )
}
