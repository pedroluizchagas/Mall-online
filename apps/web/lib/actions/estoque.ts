'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

// Verificar se o plano do lojista inclui estoque
async function verificarAcessoEstoque(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('tenant_subscriptions')
    .select('plans!inner(tem_estoque)')
    .single()

  return (data?.plans as any)?.tem_estoque === true
}

// Buscar produtos com controle de estoque
export async function getProdutosEstoque() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado', produtos: [] }

  const temAcesso = await verificarAcessoEstoque(supabase)
  if (!temAcesso) {
    return {
      erro: 'Controle de estoque não disponível no seu plano atual.',
      produtos: [],
      upgrade: true,
    }
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, nome, foto_url, disponivel,
      track_stock, stock_quantity, stock_minimo,
      categories (nome)
    `)
    .eq('tenant_id', tenant.id)
    .order('nome')

  if (error) return { erro: error.message, produtos: [] }

  return { produtos: data ?? [] }
}

// Ativar ou desativar controle de estoque para um produto
export async function toggleControleEstoque(
  product_id: string,
  ativar: boolean,
  quantidade_inicial?: number
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const temAcesso = await verificarAcessoEstoque(supabase)
  if (!temAcesso) return { erro: 'Plano não inclui controle de estoque' }

  const atualizacao: Record<string, any> = {
    track_stock: ativar,
  }

  if (ativar) {
    atualizacao.stock_quantity = quantidade_inicial ?? 0
  } else {
    atualizacao.stock_quantity = null
    atualizacao.stock_minimo = null
  }

  const { error } = await supabase
    .from('products')
    .update(atualizacao)
    .eq('id', product_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/produtos')
  revalidatePath('/estoque')
  return { sucesso: true }
}

const schemaEntradaEstoque = z.object({
  product_id: z.string().uuid(),
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  motivo: z.string().optional(),
})

// Registrar entrada de estoque (compra/reposição)
export async function registrarEntradaEstoque(
  _prevState: any,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const dados = schemaEntradaEstoque.safeParse({
    product_id: formData.get('product_id'),
    quantidade: parseInt(String(formData.get('quantidade') ?? '0')),
    motivo: formData.get('motivo') || undefined,
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { data: produto } = await supabase
    .from('products')
    .select('id, stock_quantity, track_stock, nome')
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!produto) return { erro: 'Produto não encontrado' }
  if (!produto.track_stock)
    return { erro: 'Este produto não tem controle de estoque ativo' }

  const quantidade_anterior = produto.stock_quantity ?? 0
  const quantidade_posterior = quantidade_anterior + dados.data.quantidade

  const { error: movError } = await supabase.from('stock_movements').insert({
    product_id: dados.data.product_id,
    tenant_id: tenant.id,
    tipo: 'entrada',
    quantidade: dados.data.quantidade,
    quantidade_anterior,
    quantidade_posterior,
    motivo: dados.data.motivo ?? 'Entrada de estoque',
    criado_por: user?.id,
  })

  if (movError) return { erro: movError.message }

  const { error: prodError } = await supabase
    .from('products')
    .update({ stock_quantity: quantidade_posterior })
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)

  if (prodError) return { erro: prodError.message }

  revalidatePath('/produtos')
  revalidatePath('/estoque')
  return { sucesso: true, quantidade_posterior }
}

const schemaAjusteEstoque = z.object({
  product_id: z.string().uuid(),
  tipo: z.enum(['ajuste_positivo', 'ajuste_negativo']),
  quantidade: z.number().int().min(1),
  motivo: z.string().min(3, 'Informe o motivo do ajuste'),
})

// Registrar ajuste de estoque (correção, perda)
export async function registrarAjusteEstoque(
  _prevState: any,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const dados = schemaAjusteEstoque.safeParse({
    product_id: formData.get('product_id'),
    tipo: formData.get('tipo'),
    quantidade: parseInt(String(formData.get('quantidade') ?? '0')),
    motivo: formData.get('motivo'),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { data: produto } = await supabase
    .from('products')
    .select('id, stock_quantity, track_stock')
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!produto) return { erro: 'Produto não encontrado' }
  if (!produto.track_stock)
    return { erro: 'Produto sem controle de estoque ativo' }

  const quantidade_anterior = produto.stock_quantity ?? 0
  const delta =
    dados.data.tipo === 'ajuste_positivo'
      ? dados.data.quantidade
      : -dados.data.quantidade
  const quantidade_posterior = Math.max(0, quantidade_anterior + delta)

  const { error: movError } = await supabase.from('stock_movements').insert({
    product_id: dados.data.product_id,
    tenant_id: tenant.id,
    tipo: dados.data.tipo,
    quantidade: delta,
    quantidade_anterior,
    quantidade_posterior,
    motivo: dados.data.motivo,
    criado_por: user?.id,
  })

  if (movError) return { erro: movError.message }

  const { error: prodError } = await supabase
    .from('products')
    .update({ stock_quantity: quantidade_posterior })
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)

  if (prodError) return { erro: prodError.message }

  revalidatePath('/produtos')
  revalidatePath('/estoque')
  return { sucesso: true, quantidade_posterior }
}

// Atualizar estoque mínimo de alerta
export async function atualizarEstoqueMinimo(
  product_id: string,
  stock_minimo: number
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('products')
    .update({ stock_minimo })
    .eq('id', product_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/estoque')
  return { sucesso: true }
}

// Buscar histórico de movimentações de um produto
export async function getHistoricoMovimentacoes(product_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return []

  const { data } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', product_id)
    .eq('tenant_id', tenant.id)
    .order('criado_em', { ascending: false })
    .limit(50)

  return data ?? []
}

// Buscar produtos com estoque abaixo do mínimo
export async function getProdutosEstoqueBaixo() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return []

  const { data } = await supabase
    .from('products')
    .select('id, nome, foto_url, stock_quantity, stock_minimo')
    .eq('tenant_id', tenant.id)
    .eq('track_stock', true)
    .not('stock_quantity', 'is', null)
    .not('stock_minimo', 'is', null)

  if (!data) return []

  return data.filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
  )
}
