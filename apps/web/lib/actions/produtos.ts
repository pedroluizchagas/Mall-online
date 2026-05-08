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

const modifierSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome da opção é obrigatório').max(80),
  preco_extra: z.number().int().min(0).default(0),
  disponivel: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
})

const grupoModificadorSchema = z
  .object({
    id: z.string().uuid().optional(),
    nome: z.string().min(1, 'Nome do grupo é obrigatório').max(80),
    min_select: z.number().int().min(0).max(20),
    max_select: z.number().int().min(1).max(20),
    ordem: z.number().int().min(0).default(0),
    modifiers: z.array(modifierSchema).min(1, 'Cada grupo precisa de ao menos 1 opção'),
  })
  .refine((g) => g.max_select >= g.min_select, {
    message: 'max_select deve ser ≥ min_select',
    path: ['max_select'],
  })

const gruposSchema = z.array(grupoModificadorSchema)

const metadataSchema = z
  .object({
    tempo_preparo_min: z.number().int().min(1).max(180).optional(),
    serve_pessoas: z.number().int().min(1).max(20).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  })
  .partial()
  .passthrough()

export type GrupoModificadorInput = z.infer<typeof grupoModificadorSchema>
export type MetadataProduto = z.infer<typeof metadataSchema>

function parseGruposPayload(raw: FormDataEntryValue | null): {
  grupos: GrupoModificadorInput[]
  erro?: string
} {
  if (raw === null || raw === '') return { grupos: [] }
  try {
    const parsed = JSON.parse(String(raw))
    const result = gruposSchema.safeParse(parsed)
    if (!result.success) return { grupos: [], erro: result.error.errors[0].message }
    return { grupos: result.data }
  } catch {
    return { grupos: [], erro: 'Falha ao ler grupos de modificadores' }
  }
}

function parseMetadataPayload(raw: FormDataEntryValue | null): {
  metadata: MetadataProduto
  erro?: string
} {
  if (raw === null || raw === '') return { metadata: {} }
  try {
    const parsed = JSON.parse(String(raw))
    const result = metadataSchema.safeParse(parsed)
    if (!result.success) return { metadata: {}, erro: result.error.errors[0].message }
    return { metadata: result.data }
  } catch {
    return { metadata: {}, erro: 'Falha ao ler campos extras' }
  }
}

// Sincroniza grupos de modificadores e seus itens com o banco.
// Estratégia: inserir novos, atualizar existentes, deletar os que sumiram.
// Sem transação explícita (Supabase JS client não expõe BEGIN/COMMIT). Em caso
// de falha no meio do processo, o estado parcial fica persistido — aceitável
// para esta fase porque o lojista re-executa o save. Migrar para stored
// procedure se a complexidade crescer.
async function sincronizarGrupos(
  supabase: ReturnType<typeof createSupabaseServer>,
  produto_id: string,
  tenant_id: string,
  grupos: GrupoModificadorInput[],
): Promise<string | null> {
  const { data: existentesData, error: errSelect } = await supabase
    .from('product_modifier_groups')
    .select('id, product_modifiers(id)')
    .eq('product_id', produto_id)

  if (errSelect) return errSelect.message

  const existentes = (existentesData ?? []) as Array<{
    id: string
    product_modifiers: Array<{ id: string }> | null
  }>

  const idsGruposEnviados = new Set(grupos.map((g) => g.id).filter(Boolean) as string[])
  const gruposARemover = existentes.filter((g) => !idsGruposEnviados.has(g.id))

  if (gruposARemover.length > 0) {
    const { error: errDel } = await supabase
      .from('product_modifier_groups')
      .delete()
      .in(
        'id',
        gruposARemover.map((g) => g.id),
      )
    if (errDel) return errDel.message
  }

  for (let idx = 0; idx < grupos.length; idx++) {
    const grupo = grupos[idx]
    const ordem = typeof grupo.ordem === 'number' ? grupo.ordem : idx

    let groupId: string

    if (grupo.id) {
      const { error: errUpd } = await supabase
        .from('product_modifier_groups')
        .update({
          nome: grupo.nome,
          min_select: grupo.min_select,
          max_select: grupo.max_select,
          ordem,
        })
        .eq('id', grupo.id)
      if (errUpd) return errUpd.message
      groupId = grupo.id
    } else {
      const { data: insertData, error: errIns } = await supabase
        .from('product_modifier_groups')
        .insert({
          product_id: produto_id,
          tenant_id,
          nome: grupo.nome,
          min_select: grupo.min_select,
          max_select: grupo.max_select,
          ordem,
        })
        .select('id')
        .single()
      if (errIns || !insertData) return errIns?.message ?? 'Erro ao criar grupo'
      groupId = (insertData as { id: string }).id
    }

    const existentesGrupo = existentes.find((e) => e.id === groupId)
    const idsExistentesGrupo = new Set(
      (existentesGrupo?.product_modifiers ?? []).map((m) => m.id),
    )
    const idsModEnviados = new Set(grupo.modifiers.map((m) => m.id).filter(Boolean) as string[])
    const idsParaRemover = Array.from(idsExistentesGrupo).filter((id) => !idsModEnviados.has(id))

    if (idsParaRemover.length > 0) {
      const { error: errDelMod } = await supabase
        .from('product_modifiers')
        .delete()
        .in('id', idsParaRemover)
      if (errDelMod) return errDelMod.message
    }

    for (let mIdx = 0; mIdx < grupo.modifiers.length; mIdx++) {
      const mod = grupo.modifiers[mIdx]
      const ordemMod = typeof mod.ordem === 'number' ? mod.ordem : mIdx

      if (mod.id) {
        const { error: errUpdMod } = await supabase
          .from('product_modifiers')
          .update({
            nome: mod.nome,
            preco_extra: mod.preco_extra,
            disponivel: mod.disponivel,
            ordem: ordemMod,
          })
          .eq('id', mod.id)
        if (errUpdMod) return errUpdMod.message
      } else {
        const { error: errInsMod } = await supabase.from('product_modifiers').insert({
          group_id: groupId,
          nome: mod.nome,
          preco_extra: mod.preco_extra,
          disponivel: mod.disponivel,
          ordem: ordemMod,
        })
        if (errInsMod) return errInsMod.message
      }
    }
  }

  return null
}

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
      categories (id, nome, icone),
      product_modifier_groups (id)
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

export async function getModificadoresProduto(produto_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { grupos: [] as GrupoModificadorInput[] }

  const { data, error } = await supabase
    .from('product_modifier_groups')
    .select(
      `
      id, nome, min_select, max_select, ordem,
      product_modifiers (id, nome, preco_extra, disponivel, ordem)
    `,
    )
    .eq('product_id', produto_id)
    .order('ordem', { ascending: true })

  if (error || !data) return { grupos: [] as GrupoModificadorInput[] }

  const grupos: GrupoModificadorInput[] = (data as any[]).map((g) => ({
    id: g.id,
    nome: g.nome,
    min_select: g.min_select,
    max_select: g.max_select,
    ordem: g.ordem,
    modifiers: ((g.product_modifiers ?? []) as any[])
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((m) => ({
        id: m.id,
        nome: m.nome,
        preco_extra: m.preco_extra,
        disponivel: m.disponivel,
        ordem: m.ordem,
      })),
  }))

  return { grupos }
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

  const { metadata, erro: erroMeta } = parseMetadataPayload(formData.get('metadata'))
  if (erroMeta) return { erro: erroMeta }

  const { grupos, erro: erroGrupos } = parseGruposPayload(formData.get('modifier_groups'))
  if (erroGrupos) return { erro: erroGrupos }

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

  const { data: produtoCriado, error } = await supabase
    .from('products')
    .insert({
      ...dados.data,
      store_id,
      tenant_id: tenant.id,
      foto_url,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('Limite de produtos')) {
      return { erro: 'Limite de produtos do seu plano atingido. Faça upgrade para continuar.' }
    }
    return { erro: error.message }
  }

  if (grupos.length > 0 && produtoCriado) {
    const erroGruposSync = await sincronizarGrupos(
      supabase,
      (produtoCriado as { id: string }).id,
      tenant.id,
      grupos,
    )
    if (erroGruposSync) return { erro: erroGruposSync }
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

  const { metadata, erro: erroMeta } = parseMetadataPayload(formData.get('metadata'))
  if (erroMeta) return { erro: erroMeta }

  const { grupos, erro: erroGrupos } = parseGruposPayload(formData.get('modifier_groups'))
  if (erroGrupos) return { erro: erroGrupos }

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
      metadata,
    })
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  const erroGruposSync = await sincronizarGrupos(supabase, produto_id, tenant.id, grupos)
  if (erroGruposSync) return { erro: erroGruposSync }

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
