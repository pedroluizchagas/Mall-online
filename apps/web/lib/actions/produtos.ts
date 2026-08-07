'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { gerarCsv } from '@/lib/csv'
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

/**
 * Override de carga do produto (docs/31 §1.1).
 *
 * Retorna `null` quando o formulário não renderizou o bloco de carga — a
 * loja está em modo 'loja' e o produto deve herdar. Nesse caso as colunas
 * não entram no update, preservando o que já estiver gravado.
 *
 * Campo numérico vazio vira NULL (herda), não 0: um produto sem peso
 * declarado não é um produto sem peso.
 */
function parseCargaPayload(formData: FormData) {
  if (formData.get('carga_editavel') !== '1') return null

  const peso = formData.get('peso_g')
  const volumeL = formData.get('volume_l')

  const pesoNum = peso ? parseFloat(String(peso)) : NaN
  const volumeNum = volumeL ? parseFloat(String(volumeL)) : NaN

  return {
    peso_g: Number.isFinite(pesoNum) && pesoNum > 0 ? Math.round(pesoNum) : null,
    volume_ml:
      Number.isFinite(volumeNum) && volumeNum > 0
        ? Math.round(volumeNum * 1000)
        : null,
    refrigerado: formData.get('refrigerado') === 'on',
    fragil: formData.get('fragil') === 'on',
  }
}

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

const variantOptionSchema = z.object({
  id: z.string().uuid().optional(),
  valor: z.string().min(1).max(60),
  hex_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  ordem: z.number().int().min(0).default(0),
})

const optionGroupSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(60),
  ordem: z.number().int().min(0).default(0),
  options: z.array(variantOptionSchema).min(1, 'Cada atributo precisa de ao menos 1 valor'),
})

const variantOptionRefSchema = z.union([
  z.string().uuid(),
  z.object({ group_nome: z.string(), option_valor: z.string() }),
])

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  optionRefs: z.array(variantOptionRefSchema).min(1),
  sku: z.string().max(60).optional().nullable(),
  preco: z.number().int().min(0),
  preco_promocional: z.number().int().min(0).optional().nullable(),
  stock_quantity: z.number().int().min(0).optional().nullable(),
  stock_minimo: z.number().int().min(0).default(0),
  foto_url: z.string().url().optional().nullable(),
  disponivel: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
})

const variantsPayloadSchema = z.object({
  optionGroups: z.array(optionGroupSchema),
  variants: z.array(variantSchema),
})

const metadataSchema = z
  .object({
    // food
    tempo_preparo_min: z.number().int().min(1).max(180).optional(),
    serve_pessoas: z.number().int().min(1).max(20).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    // pharmacy
    registro_anvisa: z
      .string()
      .regex(/^\d\.\d{4}\.\d{4}\.\d{3}-\d$/, 'Formato esperado: 1.0123.0456.001-2')
      .optional(),
    principio_ativo: z.string().max(120).optional(),
    categoria_regulatoria: z.enum(['MIP', 'Lista A', 'Lista B', 'Lista C']).optional(),
    exige_receita: z.boolean().optional(),
    bula_url: z.string().url().optional(),
    tipo_medicamento: z.enum(['Genérico', 'Similar', 'Referência']).optional(),
    // pet
    especie: z
      .array(z.enum(['Cães', 'Gatos', 'Aves', 'Peixes', 'Roedores', 'Outros']))
      .optional(),
    faixa_peso_kg: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
    tipo_oferta: z.enum(['Produto físico', 'Serviço (banho/tosa)']).optional(),
    // generic
    garantia_meses: z.number().int().min(0).max(120).optional(),
    marca: z.string().max(80).optional(),
    modelo: z.string().max(80).optional(),
    peso_g: z.number().int().min(0).optional(),
    dimensoes_cm: z.string().max(40).optional(),
  })
  .partial()
  .passthrough()

export type GrupoModificadorInput = z.infer<typeof grupoModificadorSchema>
export type MetadataProduto = z.infer<typeof metadataSchema>
export type OptionGroupInput = z.infer<typeof optionGroupSchema>
export type VariantInput = z.infer<typeof variantSchema>
export type VariantsPayload = z.infer<typeof variantsPayloadSchema>

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

function parseVariantsPayload(raw: FormDataEntryValue | null): {
  payload: VariantsPayload | null
  erro?: string
} {
  if (raw === null || raw === '') return { payload: null }
  try {
    const parsed = JSON.parse(String(raw))
    const result = variantsPayloadSchema.safeParse(parsed)
    if (!result.success) return { payload: null, erro: result.error.errors[0].message }
    return { payload: result.data }
  } catch {
    return { payload: null, erro: 'Falha ao ler variações' }
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

// Sincroniza variants do produto: option_groups, options, variants e
// product_variant_options. Estratégia (sequencial, sem transação):
//   1) Limpar product_variant_options dos variants existentes (libera o
//      ON DELETE RESTRICT em options)
//   2) DELETE variants que sumiram
//   3) DELETE/UPDATE/INSERT option_groups
//   4) DELETE/UPDATE/INSERT options dentro de cada group
//   5) UPDATE/INSERT variants
//   6) INSERT product_variant_options para cada variant (1 por option_id)
// Mesma limitação do sincronizarGrupos: falha no meio deixa estado parcial.
async function sincronizarVariants(
  supabase: ReturnType<typeof createSupabaseServer>,
  produto_id: string,
  tenant_id: string,
  payload: VariantsPayload,
): Promise<string | null> {
  const sb = supabase as any

  const { data: gruposExistData, error: errSelG } = await sb
    .from('product_option_groups')
    .select('id, nome, ordem, product_options(id, valor, hex_color, ordem)')
    .eq('product_id', produto_id)
  if (errSelG) return errSelG.message

  const { data: variantsExistData, error: errSelV } = await sb
    .from('product_variants')
    .select('id')
    .eq('product_id', produto_id)
  if (errSelV) return errSelV.message

  const gruposExist = (gruposExistData ?? []) as Array<{
    id: string
    nome: string
    ordem: number
    product_options: Array<{ id: string; valor: string; hex_color: string | null; ordem: number }> | null
  }>
  const variantsExist = (variantsExistData ?? []) as Array<{ id: string }>
  const idsVariantsExist = variantsExist.map((v) => v.id)

  // 1) Limpa todos os product_variant_options dos variants atuais — destrava
  //    o ON DELETE RESTRICT em options.
  if (idsVariantsExist.length > 0) {
    const { error: errCleanPVO } = await sb
      .from('product_variant_options')
      .delete()
      .in('variant_id', idsVariantsExist)
    if (errCleanPVO) return errCleanPVO.message
  }

  // 2) Deleta variants removidos.
  const idsVariantsEnviados = new Set(
    payload.variants.map((v) => v.id).filter(Boolean) as string[],
  )
  const variantsARemover = variantsExist.filter((v) => !idsVariantsEnviados.has(v.id))
  if (variantsARemover.length > 0) {
    const { error: errDelV } = await sb
      .from('product_variants')
      .delete()
      .in(
        'id',
        variantsARemover.map((v) => v.id),
      )
    if (errDelV) return errDelV.message
  }

  // 3) Sincroniza option_groups.
  const idsGruposEnviados = new Set(
    payload.optionGroups.map((g) => g.id).filter(Boolean) as string[],
  )
  const gruposARemover = gruposExist.filter((g) => !idsGruposEnviados.has(g.id))
  if (gruposARemover.length > 0) {
    const { error: errDelG } = await sb
      .from('product_option_groups')
      .delete()
      .in(
        'id',
        gruposARemover.map((g) => g.id),
      )
    if (errDelG) return errDelG.message
  }

  // Map nome → group_id (após sync de groups)
  const groupIdPorNome = new Map<string, string>()

  for (let idx = 0; idx < payload.optionGroups.length; idx++) {
    const grupo = payload.optionGroups[idx]
    const ordem = typeof grupo.ordem === 'number' ? grupo.ordem : idx

    let groupId: string

    if (grupo.id) {
      const { error: errUpd } = await sb
        .from('product_option_groups')
        .update({ nome: grupo.nome, ordem })
        .eq('id', grupo.id)
      if (errUpd) return errUpd.message
      groupId = grupo.id
    } else {
      const { data: insertData, error: errIns } = await sb
        .from('product_option_groups')
        .insert({ product_id: produto_id, tenant_id, nome: grupo.nome, ordem })
        .select('id')
        .single()
      if (errIns || !insertData) return errIns?.message ?? 'Erro ao criar atributo'
      groupId = (insertData as { id: string }).id
    }

    groupIdPorNome.set(grupo.nome, groupId)

    // 4) Sincroniza options do group.
    const optionsExistGroup = gruposExist.find((g) => g.id === groupId)?.product_options ?? []
    const idsOptionsEnviadas = new Set(
      grupo.options.map((o) => o.id).filter(Boolean) as string[],
    )
    const optionsARemover = optionsExistGroup
      .filter((o) => !idsOptionsEnviadas.has(o.id))
      .map((o) => o.id)
    if (optionsARemover.length > 0) {
      const { error: errDelO } = await sb
        .from('product_options')
        .delete()
        .in('id', optionsARemover)
      if (errDelO) return errDelO.message
    }

    for (let oIdx = 0; oIdx < grupo.options.length; oIdx++) {
      const opt = grupo.options[oIdx]
      const ordemOpt = typeof opt.ordem === 'number' ? opt.ordem : oIdx

      if (opt.id) {
        const { error: errUpdO } = await sb
          .from('product_options')
          .update({ valor: opt.valor, hex_color: opt.hex_color ?? null, ordem: ordemOpt })
          .eq('id', opt.id)
        if (errUpdO) return errUpdO.message
      } else {
        const { error: errInsO } = await sb.from('product_options').insert({
          group_id: groupId,
          valor: opt.valor,
          hex_color: opt.hex_color ?? null,
          ordem: ordemOpt,
        })
        if (errInsO) return errInsO.message
      }
    }
  }

  // 5) Reconstrói map (group_nome, valor) → option_id após sync de options.
  const { data: optionsAtuais, error: errSelO } = await sb
    .from('product_options')
    .select('id, valor, group_id, product_option_groups!inner(nome, product_id)')
    .eq('product_option_groups.product_id', produto_id)
  if (errSelO) return errSelO.message

  const optionIdPorGrupoValor = new Map<string, string>()
  for (const o of (optionsAtuais ?? []) as any[]) {
    const grupoNome = o.product_option_groups?.nome
    if (!grupoNome) continue
    optionIdPorGrupoValor.set(`${grupoNome}::${o.valor}`, o.id)
  }

  function resolveOptionId(
    ref: string | { group_nome: string; option_valor: string },
  ): string | null {
    if (typeof ref === 'string') return ref
    return optionIdPorGrupoValor.get(`${ref.group_nome}::${ref.option_valor}`) ?? null
  }

  // 6) Sincroniza variants (UPDATE ou INSERT) e seus variant_options.
  for (let vIdx = 0; vIdx < payload.variants.length; vIdx++) {
    const variant = payload.variants[vIdx]
    const ordemVar = typeof variant.ordem === 'number' ? variant.ordem : vIdx

    let variantId: string
    const camposVariant = {
      sku: variant.sku ?? null,
      preco: variant.preco,
      preco_promocional: variant.preco_promocional ?? null,
      stock_quantity: variant.stock_quantity ?? null,
      stock_minimo: variant.stock_minimo ?? 0,
      foto_url: variant.foto_url ?? null,
      disponivel: variant.disponivel,
      ordem: ordemVar,
    }

    if (variant.id) {
      const { error: errUpdV } = await sb
        .from('product_variants')
        .update(camposVariant)
        .eq('id', variant.id)
      if (errUpdV) return errUpdV.message
      variantId = variant.id
    } else {
      const { data: insertData, error: errInsV } = await sb
        .from('product_variants')
        .insert({ product_id: produto_id, tenant_id, ...camposVariant })
        .select('id')
        .single()
      if (errInsV || !insertData) return errInsV?.message ?? 'Erro ao criar variação'
      variantId = (insertData as { id: string }).id
    }

    const optionIds = variant.optionRefs
      .map((ref) => resolveOptionId(ref))
      .filter((id): id is string => Boolean(id))

    if (optionIds.length === 0) {
      return 'Variação sem opções resolvidas — verifique os atributos'
    }

    const { error: errInsPVO } = await sb
      .from('product_variant_options')
      .insert(optionIds.map((option_id) => ({ variant_id: variantId, option_id })))
    if (errInsPVO) return errInsPVO.message
  }

  return null
}

export async function getVariantsProduto(produto_id: string) {
  const supabase = createSupabaseServer()
  const sb = supabase as any

  const { data: groups } = await sb
    .from('product_option_groups')
    .select('id, nome, ordem, product_options (id, valor, hex_color, ordem)')
    .eq('product_id', produto_id)
    .order('ordem', { ascending: true })

  const { data: variants } = await sb
    .from('product_variants')
    .select(
      'id, sku, preco, preco_promocional, stock_quantity, stock_minimo, foto_url, disponivel, ordem, product_variant_options (option_id)',
    )
    .eq('product_id', produto_id)
    .order('ordem', { ascending: true })

  return {
    optionGroups: ((groups ?? []) as any[]).map((g) => ({
      id: g.id as string,
      nome: g.nome as string,
      ordem: g.ordem as number,
      options: ((g.product_options ?? []) as any[])
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((o) => ({
          id: o.id as string,
          valor: o.valor as string,
          hex_color: (o.hex_color ?? null) as string | null,
          ordem: o.ordem as number,
        })),
    })),
    variants: ((variants ?? []) as any[]).map((v) => ({
      id: v.id as string,
      sku: (v.sku ?? null) as string | null,
      preco: v.preco as number,
      preco_promocional: (v.preco_promocional ?? null) as number | null,
      stock_quantity: (v.stock_quantity ?? null) as number | null,
      stock_minimo: (v.stock_minimo ?? 0) as number,
      foto_url: (v.foto_url ?? null) as string | null,
      disponivel: v.disponivel as boolean,
      ordem: v.ordem as number,
      optionRefs: ((v.product_variant_options ?? []) as any[]).map(
        (vo) => vo.option_id as string,
      ),
    })),
  }
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
      stock_minimo, ordem, criado_em, metadata,
      categories (id, nome, icone),
      product_modifier_groups (id),
      product_variants (id)
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

  const { payload: variantsPayload, erro: erroVariants } = parseVariantsPayload(
    formData.get('variants_payload'),
  )
  if (erroVariants) return { erro: erroVariants }

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

  // Quando há variants, o estoque vai por SKU — força track_stock=false e
  // limpa os campos de estoque do produto-pai.
  const temVariants = Boolean(variantsPayload && variantsPayload.variants.length > 0)
  const dadosFinal = temVariants
    ? { ...dados.data, track_stock: false, stock_quantity: null, stock_minimo: 0 }
    : dados.data

  const carga = parseCargaPayload(formData)

  const { data: produtoCriado, error } = await supabase
    .from('products')
    .insert({
      ...dadosFinal,
      ...(carga ?? {}),
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

  if (variantsPayload && produtoCriado) {
    const erroVariantsSync = await sincronizarVariants(
      supabase,
      (produtoCriado as { id: string }).id,
      tenant.id,
      variantsPayload,
    )
    if (erroVariantsSync) return { erro: erroVariantsSync }
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

  const { payload: variantsPayload, erro: erroVariants } = parseVariantsPayload(
    formData.get('variants_payload'),
  )
  if (erroVariants) return { erro: erroVariants }

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

  const temVariants = Boolean(variantsPayload && variantsPayload.variants.length > 0)
  const dadosFinal = temVariants
    ? { ...dados.data, track_stock: false, stock_quantity: null, stock_minimo: 0 }
    : dados.data

  // carga null = loja em modo 'loja': as colunas ficam fora do update para
  // preservar qualquer override já gravado (docs/31 §1.1).
  const carga = parseCargaPayload(formData)

  const { error } = await supabase
    .from('products')
    .update({
      ...dadosFinal,
      ...(carga ?? {}),
      ...(foto_url ? { foto_url } : {}),
      metadata,
    })
    .eq('id', produto_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  const erroGruposSync = await sincronizarGrupos(supabase, produto_id, tenant.id, grupos)
  if (erroGruposSync) return { erro: erroGruposSync }

  if (variantsPayload) {
    const erroVariantsSync = await sincronizarVariants(
      supabase,
      produto_id,
      tenant.id,
      variantsPayload,
    )
    if (erroVariantsSync) return { erro: erroVariantsSync }
  }

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

// ============================================================================
// Import/Export CSV (dashboard-redesign Fase 3 §2)
// ============================================================================

/** Colunas do CSV de produtos — round-trip entre export e import. */
const CSV_CABECALHO = [
  'nome',
  'descricao',
  'preco',
  'preco_promocional',
  'categoria',
  'disponivel',
] as const

const schemaLinhaImportacao = z.object({
  nome: z.string().min(2, 'nome muito curto').max(120, 'nome muito longo'),
  descricao: z.string().max(600).optional().nullable(),
  /** Centavos (o client converte "12,90"/"12.90" antes de enviar). */
  preco: z.number().int().min(1, 'preço inválido'),
  preco_promocional: z.number().int().min(1).optional().nullable(),
  categoria: z.string().max(80).optional().nullable(),
  disponivel: z.boolean(),
})

export type LinhaImportacaoProduto = z.infer<typeof schemaLinhaImportacao>

const LIMITE_LINHAS_IMPORT = 500

/**
 * Exporta o catálogo da loja em CSV (mesmo formato aceito pelo import).
 * Preços em reais com ponto decimal ("12.90"); disponivel = sim/nao.
 */
export async function exportarProdutosCsv(
  store_id: string,
): Promise<{ csv: string; nomeArquivo: string } | { erro: string }> {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: produtos, error } = await supabase
    .from('products')
    .select('nome, descricao, preco, preco_promocional, disponivel, categories (nome)')
    .eq('store_id', store_id)
    .eq('tenant_id', tenant.id)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) return { erro: error.message }

  const linhas = (produtos ?? []).map((p) => {
    const categoria = (p.categories as { nome?: string } | null)?.nome ?? ''
    return [
      p.nome,
      p.descricao ?? '',
      (p.preco / 100).toFixed(2),
      p.preco_promocional ? (p.preco_promocional / 100).toFixed(2) : '',
      categoria,
      p.disponivel ? 'sim' : 'nao',
    ]
  })

  const csv = gerarCsv(CSV_CABECALHO, linhas)
  const data = new Date().toISOString().slice(0, 10)
  return { csv, nomeArquivo: `catalogo-${data}.csv` }
}

/**
 * Importa produtos a partir das linhas já parseadas no client.
 * - Valida cada linha (zod) e respeita o limite de produtos do plano;
 * - Resolve categorias por nome (case-insensitive), criando as que faltarem;
 * - Insere em lote; erros por linha voltam com o número da linha do arquivo.
 */
export async function importarProdutosCsv(
  store_id: string,
  linhas: unknown[],
): Promise<
  | { criados: number; erros: { linha: number; motivo: string }[] }
  | { erro: string }
> {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!store) return { erro: 'Loja não encontrada' }

  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { erro: 'Nenhuma linha para importar' }
  }
  if (linhas.length > LIMITE_LINHAS_IMPORT) {
    return { erro: `Máximo de ${LIMITE_LINHAS_IMPORT} produtos por importação` }
  }

  // Valida linha a linha — o índice +2 aponta a linha real do arquivo
  // (1 do cabeçalho + base 1).
  const validas: LinhaImportacaoProduto[] = []
  const erros: { linha: number; motivo: string }[] = []
  linhas.forEach((l, i) => {
    const r = schemaLinhaImportacao.safeParse(l)
    if (r.success) validas.push(r.data)
    else erros.push({ linha: i + 2, motivo: r.error.errors[0].message })
  })
  if (validas.length === 0) {
    return { erro: 'Nenhuma linha válida no arquivo' }
  }

  // Limite do plano (mesma fonte de getProdutos).
  const [{ count: atuais }, { data: subscription }] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id),
    supabase.from('tenant_subscriptions').select('plans(max_produtos)').single(),
  ])
  const maxProdutos = (subscription?.plans as { max_produtos?: number } | null)?.max_produtos ?? 30
  if ((atuais ?? 0) + validas.length > maxProdutos) {
    return {
      erro: `O plano permite ${maxProdutos} produtos (você tem ${atuais ?? 0}); importar ${validas.length} estoura o limite.`,
    }
  }

  // Categorias: resolve por nome (case/acentos-insensitive) e cria faltantes.
  const normalizar = (s: string) =>
    s.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const { data: catsExistentes } = await supabase
    .from('categories')
    .select('id, nome, ordem')
    .eq('store_id', store_id)

  const porNome = new Map<string, string>()
  let maiorOrdem = -1
  for (const c of catsExistentes ?? []) {
    porNome.set(normalizar(c.nome), c.id)
    if (c.ordem > maiorOrdem) maiorOrdem = c.ordem
  }

  const nomesNovos = [
    ...new Set(
      validas
        .map((l) => l.categoria?.trim())
        .filter((n): n is string => !!n && !porNome.has(normalizar(n))),
    ),
  ]
  if (nomesNovos.length > 0) {
    const { data: novas, error: erroCat } = await supabase
      .from('categories')
      .insert(
        nomesNovos.map((nome, i) => ({
          tenant_id: tenant.id,
          store_id,
          nome,
          ordem: maiorOrdem + 1 + i,
          ativa: true,
        })),
      )
      .select('id, nome')
    if (erroCat) return { erro: `Falha ao criar categorias: ${erroCat.message}` }
    for (const c of novas ?? []) porNome.set(normalizar(c.nome), c.id)
  }

  const { error: erroInsert } = await supabase.from('products').insert(
    validas.map((l, i) => ({
      store_id,
      tenant_id: tenant.id,
      category_id: l.categoria?.trim() ? porNome.get(normalizar(l.categoria)) ?? null : null,
      nome: l.nome,
      descricao: l.descricao?.trim() || null,
      preco: l.preco,
      preco_promocional: l.preco_promocional ?? null,
      disponivel: l.disponivel,
      ordem: (atuais ?? 0) + i,
    })),
  )
  if (erroInsert) return { erro: erroInsert.message }

  revalidatePath('/produtos')
  return { criados: validas.length, erros }
}
