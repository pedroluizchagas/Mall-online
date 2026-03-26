'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaProduto = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  preco: z.number().min(1, 'Preço deve ser maior que zero'),
  preco_promocional: z.number().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  disponivel: z.boolean().default(true),
  track_stock: z.boolean().default(false),
  stock_quantity: z.number().int().optional().nullable(),
  stock_minimo: z.number().int().optional().nullable(),
  ordem: z.number().int().default(0),
})

export async function getProdutos(store_id: string) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado', produtos: [], uso: null }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado', produtos: [], uso: null }

  const { data: produtos, error } = await supabase
    .from('products')
    .select(`
      id, nome, descricao, preco, preco_promocional,
      foto_url, disponivel, track_stock, stock_quantity,
      stock_minimo, ordem, criado_em,
      categories (id, nome, icone)
    `)
    .eq('store_id', store_id)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) return { erro: error.message, produtos: [], uso: null }

  const { data: subscription } = await supabase
    .from('tenant_subscriptions')
    .select('plans(max_produtos)')
    .single()

  const maxProdutos = (subscription?.plans as any)?.max_produtos ?? 30

  return {
    produtos: produtos ?? [],
    uso: {
      atual: produtos?.length ?? 0,
      maximo: maxProdutos,
      percentual: Math.round(((produtos?.length ?? 0) / maxProdutos) * 100),
    },
  }
}

export async function criarProduto(store_id: string, formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!store) return { erro: 'Loja não encontrada' }

  const preco_raw = formData.get('preco')
  const preco_promo_raw = formData.get('preco_promocional')

  const dados = schemaProduto.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    preco: preco_raw ? Math.round(parseFloat(String(preco_raw)) * 100) : 0,
    preco_promocional: preco_promo_raw
      ? Math.round(parseFloat(String(preco_promo_raw)) * 100)
      : null,
    category_id: formData.get('category_id') || null,
    disponivel: formData.get('disponivel') === 'true',
    track_stock: formData.get('track_stock') === 'true',
    stock_quantity: formData.get('stock_quantity')
      ? parseInt(String(formData.get('stock_quantity')))
      : null,
    stock_minimo: formData.get('stock_minimo')
      ? parseInt(String(formData.get('stock_minimo')))
      : 0,
    ordem: formData.get('ordem')
      ? parseInt(String(formData.get('ordem')))
      : 0,
  })

  if (!dados.success) {
    return { erro: dados.error.errors[0].message }
  }

  let foto_url: string | null = null
  const foto = formData.get('foto') as File | null

  if (foto && foto.size > 0) {
    const extensao = foto.name.split('.').pop()
    const caminho = `${tenant.id}/${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(caminho, foto, { contentType: foto.type })

    if (uploadError) return { erro: 'Erro ao fazer upload da foto' }

    const { data: urlPublica } = supabase.storage
      .from('product-images')
      .getPublicUrl(caminho)

    foto_url = urlPublica.publicUrl
  }

  const { error } = await supabase.from('products').insert({
    ...dados.data,
    store_id,
    tenant_id: tenant.id,
    foto_url,
  })

  if (error) {
    if (error.message.includes('Limite de produtos')) {
      return { erro: 'Limite de produtos do seu plano atingido. Faça upgrade para continuar.' }
    }
    return { erro: error.message }
  }

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

export async function atualizarProduto(
  produto_id: string,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const preco_raw = formData.get('preco')
  const preco_promo_raw = formData.get('preco_promocional')

  const dados = schemaProduto.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    preco: preco_raw ? Math.round(parseFloat(String(preco_raw)) * 100) : 0,
    preco_promocional: preco_promo_raw
      ? Math.round(parseFloat(String(preco_promo_raw)) * 100)
      : null,
    category_id: formData.get('category_id') || null,
    disponivel: formData.get('disponivel') === 'true',
    track_stock: formData.get('track_stock') === 'true',
    stock_quantity: formData.get('stock_quantity')
      ? parseInt(String(formData.get('stock_quantity')))
      : null,
    stock_minimo: formData.get('stock_minimo')
      ? parseInt(String(formData.get('stock_minimo')))
      : 0,
    ordem: parseInt(String(formData.get('ordem') ?? '0')),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  let foto_url: string | undefined = undefined
  const foto = formData.get('foto') as File | null

  if (foto && foto.size > 0) {
    const extensao = foto.name.split('.').pop()
    const caminho = `${tenant.id}/${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(caminho, foto, { contentType: foto.type })

    if (!uploadError) {
      const { data: urlPublica } = supabase.storage
        .from('product-images')
        .getPublicUrl(caminho)
      foto_url = urlPublica.publicUrl
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      ...dados.data,
      ...(foto_url ? { foto_url } : {}),
    })
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

export async function toggleDisponibilidade(
  produto_id: string,
  disponivel: boolean
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('products')
    .update({ disponivel })
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

export async function excluirProduto(produto_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: produto } = await supabase
    .from('products')
    .select('foto_url')
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)
    .single()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  if (produto?.foto_url) {
    const caminho = produto.foto_url.split('/product-images/')[1]
    if (caminho) {
      await supabase.storage.from('product-images').remove([caminho])
    }
  }

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}
