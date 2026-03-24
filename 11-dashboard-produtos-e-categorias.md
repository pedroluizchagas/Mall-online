# 11 — Dashboard — Produtos e Categorias

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O módulo de produtos permite ao lojista gerenciar o cardápio completo
da sua loja: criar, editar, ativar, desativar e excluir produtos, além
de organizar categorias. O plano do lojista limita a quantidade total
de produtos — o banco enforça esse limite via trigger, e a UI exibe
o uso atual com alerta visual.

Fotos dos produtos são armazenadas no Supabase Storage no bucket
`product-images`, com acesso público para leitura.

-----

## CONFIGURACAO DO BUCKET NO SUPABASE

Criar o bucket antes de usar o módulo:

```sql
-- Executar no SQL Editor do Supabase Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Policy: lojista faz upload apenas na sua pasta (tenant_id/*)
CREATE POLICY "upload_produto_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Policy: leitura pública
CREATE POLICY "leitura_publica_produtos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Policy: lojista exclui apenas seus arquivos
CREATE POLICY "exclusao_produto_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );
```

-----

## SERVER ACTIONS — PRODUTOS

### lib/actions/produtos.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'
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

// Buscar produtos da loja com uso do plano
export async function getProdutos(store_id: string) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado', produtos: [], uso: null }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado', produtos: [], uso: null }

  // Buscar produtos
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

  // Buscar uso do plano
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

  // Verificar que a loja pertence ao tenant
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

  // Upload da foto (se fornecida)
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

  // O trigger verificar_limite_produtos vai lançar erro se atingiu o limite
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

  // Upload de nova foto (se fornecida)
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

  // Buscar URL da foto para excluir do Storage
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

  // Excluir foto do Storage se existir
  if (produto?.foto_url) {
    const caminho = produto.foto_url.split('/product-images/')[1]
    if (caminho) {
      await supabase.storage.from('product-images').remove([caminho])
    }
  }

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}
```

-----

## SERVER ACTIONS — CATEGORIAS

### lib/actions/categorias.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaCategoria = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  ordem: z.number().int().default(0),
})

export async function getCategorias() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  // Retorna categorias globais + categorias próprias do lojista
  const { data, error } = await supabase
    .from('categories')
    .select('id, nome, descricao, icone, ordem, ativa, tenant_id')
    .or(`tenant_id.is.null,tenant_id.eq.${tenant?.id}`)
    .eq('ativa', true)
    .order('ordem', { ascending: true })

  if (error) return { erro: error.message, categorias: [] }
  return { categorias: data ?? [] }
}

export async function criarCategoria(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const dados = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    icone: formData.get('icone') || undefined,
    ordem: parseInt(String(formData.get('ordem') ?? '0')),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase.from('categories').insert({
    ...dados.data,
    tenant_id: tenant.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

export async function atualizarCategoria(
  categoria_id: string,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const dados = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    icone: formData.get('icone') || undefined,
    ordem: parseInt(String(formData.get('ordem') ?? '0')),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  // Apenas categorias próprias podem ser editadas (não as globais)
  const { error } = await supabase
    .from('categories')
    .update(dados.data)
    .eq('id', categoria_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  return { sucesso: true }
}

export async function excluirCategoria(categoria_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  // Desvincular produtos antes de excluir
  await supabase
    .from('products')
    .update({ category_id: null })
    .eq('category_id', categoria_id)
    .eq('tenant_id', tenant.id)

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoria_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/categorias')
  return { sucesso: true }
}
```

-----

## PAGINAS DO DASHBOARD

### app/(dashboard)/produtos/page.tsx

```typescript
import { createSupabaseServer } from '@/lib/supabase/server'
import { getProdutos } from '@/lib/actions/produtos'
import { ListaProdutos } from '@/components/dashboard/lista-produtos'
import { UsoPlanoBarra } from '@/components/dashboard/uso-plano-barra'

export default async function PaginaProdutos() {
  const supabase = createSupabaseServer()

  // Buscar primeira loja do tenant
  const { data: store } = await supabase
    .from('stores')
    .select('id, nome')
    .single()

  if (!store) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const { produtos, uso } = await getProdutos(store.id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A4D3A]">Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{store.nome}</p>
        </div>
        <a
          href="/dashboard/produtos/novo"
          className="bg-[#1A4D3A] text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-[#163d2e] transition-colors"
        >
          Novo produto
        </a>
      </div>

      {/* Barra de uso do plano */}
      {uso && (
        <UsoPlanoBarra
          atual={uso.atual}
          maximo={uso.maximo}
          percentual={uso.percentual}
        />
      )}

      <ListaProdutos produtos={produtos} storeId={store.id} />
    </div>
  )
}
```

-----

## COMPONENTES

### components/dashboard/uso-plano-barra.tsx

```typescript
'use client'

interface Props {
  atual: number
  maximo: number
  percentual: number
}

export function UsoPlanoBarra({ atual, maximo, percentual }: Props) {
  const cor =
    percentual >= 90 ? 'bg-red-500' :
    percentual >= 70 ? 'bg-amber-400' :
    'bg-[#4CAF82]'

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">Produtos cadastrados</span>
        <span className="text-sm font-medium text-[#1A4D3A]">
          {atual} / {maximo}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
      {percentual >= 90 && (
        <p className="text-xs text-red-600 mt-2">
          Limite quase atingido.{' '}
          <a href="/dashboard/configuracoes/assinatura" className="underline">
            Faça upgrade do seu plano.
          </a>
        </p>
      )}
    </div>
  )
}
```

### components/dashboard/lista-produtos.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallora/lib'
import { toggleDisponibilidade, excluirProduto } from '@/lib/actions/produtos'

interface Produto {
  id: string
  nome: string
  descricao?: string
  preco: number
  preco_promocional?: number | null
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  categories?: { nome: string; icone?: string } | null
}

interface Props {
  produtos: Produto[]
  storeId: string
}

export function ListaProdutos({ produtos, storeId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, disponivel: boolean) {
    startTransition(async () => {
      await toggleDisponibilidade(id, !disponivel)
    })
  }

  function handleExcluir(id: string) {
    if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return
    startTransition(async () => {
      await excluirProduto(id)
    })
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Nenhum produto cadastrado ainda.</p>
        <p className="text-sm mt-1">
          Clique em "Novo produto" para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {produtos.map((produto) => (
        <div
          key={produto.id}
          className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
        >
          {/* Foto */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {produto.foto_url ? (
              <img
                src={produto.foto_url}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                ?
              </div>
            )}
          </div>

          {/* Dados */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-800 truncate">{produto.nome}</h3>
              {produto.categories && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {produto.categories.icone} {produto.categories.nome}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#1A4D3A] font-semibold">
                {formatarReais(produto.preco)}
              </span>
              {produto.preco_promocional && (
                <span className="text-xs text-gray-400 line-through">
                  {formatarReais(produto.preco_promocional)}
                </span>
              )}
            </div>
            {produto.track_stock && (
              <p className="text-xs text-gray-400 mt-0.5">
                Estoque: {produto.stock_quantity ?? 0} unidades
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Toggle disponibilidade */}
            <button
              onClick={() => handleToggle(produto.id, produto.disponivel)}
              disabled={isPending}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                produto.disponivel ? 'bg-[#4CAF82]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  produto.disponivel ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>

            <a
              href={`/dashboard/produtos/${produto.id}`}
              className="text-sm text-[#4CAF82] hover:underline"
            >
              Editar
            </a>

            <button
              onClick={() => handleExcluir(produto.id)}
              disabled={isPending}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### components/dashboard/produto-form.tsx

Formulário reutilizado tanto na criação quanto na edição.
Campos: nome, descrição, preço, preço promocional, categoria (select),
foto (file input com preview), disponível (toggle), controle de estoque
(toggle + campo de quantidade + mínimo), ordem de exibição.

O formulário usa `useFormState` do React para exibir erros da Server Action
sem perder o estado da página.

```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { formatarReais } from '@mallora/lib'

interface Categoria {
  id: string
  nome: string
  icone?: string
}

interface Produto {
  id?: string
  nome?: string
  descricao?: string
  preco?: number
  preco_promocional?: number | null
  foto_url?: string | null
  disponivel?: boolean
  track_stock?: boolean
  stock_quantity?: number | null
  stock_minimo?: number | null
  category_id?: string | null
  ordem?: number
}

interface Props {
  action: (formData: FormData) => Promise<any>
  categorias: Categoria[]
  produto?: Produto
}

function BotaoSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg font-medium
        disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
    >
      {pending ? 'Salvando...' : 'Salvar produto'}
    </button>
  )
}

export function ProdutoForm({ action, categorias, produto }: Props) {
  const [estado, dispatch] = useFormState(action, null)

  return (
    <form action={dispatch} className="space-y-6">
      {estado?.erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {estado.erro}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do produto
        </label>
        <input
          name="nome"
          defaultValue={produto?.nome}
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          name="descricao"
          defaultValue={produto?.descricao}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82] resize-none"
        />
      </div>

      {/* Preços */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço (R$)
          </label>
          <input
            name="preco"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produto?.preco ? (produto.preco / 100).toFixed(2) : ''}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço promocional (R$)
          </label>
          <input
            name="preco_promocional"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              produto?.preco_promocional
                ? (produto.preco_promocional / 100).toFixed(2)
                : ''
            }
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoria
        </label>
        <select
          name="category_id"
          defaultValue={produto?.category_id ?? ''}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        >
          <option value="">Sem categoria</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icone} {cat.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foto do produto
        </label>
        {produto?.foto_url && (
          <img
            src={produto.foto_url}
            alt="Foto atual"
            className="w-24 h-24 object-cover rounded-lg mb-2"
          />
        )}
        <input
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0 file:bg-[#1A4D3A] file:text-white
            file:cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG ou WebP. Máximo 5MB.</p>
      </div>

      {/* Disponível */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Disponível para venda</p>
          <p className="text-xs text-gray-400">
            Produtos indisponíveis não aparecem no app
          </p>
        </div>
        <input
          name="disponivel"
          type="hidden"
          value={produto?.disponivel !== false ? 'true' : 'false'}
        />
      </div>

      <BotaoSubmit />
    </form>
  )
}
```

-----

## PAGINA DE CATEGORIAS

### app/(dashboard)/categorias/page.tsx

Server Component que carrega as categorias e renderiza a lista.
Categorias globais (tenant_id NULL) são exibidas como somente leitura.
Categorias próprias permitem edição e exclusão.

```typescript
import { getCategorias } from '@/lib/actions/categorias'
import { ListaCategorias } from '@/components/dashboard/lista-categorias'

export default async function PaginaCategorias() {
  const { categorias, erro } = await getCategorias()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A4D3A]">Categorias</h1>
        <button
          // Abre modal de criação (Client Component)
          data-action="nova-categoria"
          className="bg-[#1A4D3A] text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Nova categoria
        </button>
      </div>

      {erro && (
        <p className="text-red-500 text-sm">{erro}</p>
      )}

      <ListaCategorias categorias={categorias} />
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Bucket `product-images` criado no Supabase Storage com policies corretas
- [ ] Categorias globais inseridas no banco pelo admin antes do lojista acessar
- [ ] Trigger `verificar_limite_produtos` ativo (migration_001 ou migration_002)
- [ ] Server Actions exportando corretamente com `'use server'`
- [ ] Preços sempre convertidos: real para centavos no input, centavos para real na exibição
- [ ] Toggle de disponibilidade usando `useTransition` para UI otimista
- [ ] Formulário de produto usando `useFormState` para exibir erros sem recarregar a página
- [ ] Upload de foto limitado a 5MB no cliente antes do envio

-----

*Arquivo 11 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 12 — Dashboard — Gestão de Pedidos*
