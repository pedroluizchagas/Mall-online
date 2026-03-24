# 24 — Módulo de Estoque

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O módulo de estoque permite ao lojista controlar a quantidade
disponível de cada produto. É um recurso de planos superiores —
o plano básico não inclui controle de estoque.

O decremento acontece automaticamente via trigger PostgreSQL ao
confirmar um pedido. Entradas e ajustes manuais são feitos pelo
lojista no dashboard. O histórico completo de movimentações é
mantido na tabela `stock_movements`.

-----

## PREMISSAS

- Controle de estoque é opcional por produto (`track_stock = false` por padrão)
- Produtos com `track_stock = false` aparecem sempre como disponíveis
- Produtos com `stock_quantity = 0` são marcados automaticamente como
  `disponivel = false` via trigger
- Disponível apenas para planos com `tem_estoque = true`
- Migration_005 criou a tabela `stock_movements` e o trigger de decremento

-----

## SCHEMA RELEVANTE (referência)

```sql
-- Campos em products (migration_005)
track_stock     BOOLEAN NOT NULL DEFAULT false
stock_quantity  INTEGER              -- NULL se track_stock = false
stock_minimo    INTEGER DEFAULT 0   -- alerta abaixo deste valor

-- Tabela stock_movements
CREATE TABLE stock_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id             UUID REFERENCES orders(id) ON DELETE SET NULL,
  tipo                 stock_movement_type NOT NULL,
  quantidade           INTEGER NOT NULL,
  quantidade_anterior  INTEGER NOT NULL,
  quantidade_posterior INTEGER NOT NULL,
  motivo               TEXT,
  criado_por           UUID REFERENCES auth.users(id),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

-----

## TRIGGER DE DECREMENTO (referência migration_005)

O trigger já foi definido na migration_005. Reproduzido aqui
para contexto:

```sql
CREATE OR REPLACE FUNCTION decrementar_estoque_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  item RECORD;
  produto RECORD;
BEGIN
  IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
    FOR item IN
      SELECT product_id, quantidade FROM order_items WHERE order_id = NEW.id
    LOOP
      SELECT id, stock_quantity, track_stock INTO produto
      FROM products WHERE id = item.product_id;

      IF produto.track_stock AND produto.stock_quantity IS NOT NULL THEN
        INSERT INTO stock_movements (
          product_id, tenant_id, order_id, tipo,
          quantidade, quantidade_anterior, quantidade_posterior
        ) VALUES (
          produto.id, NEW.tenant_id, NEW.id, 'saida_pedido',
          -item.quantidade,
          produto.stock_quantity,
          produto.stock_quantity - item.quantidade
        );

        UPDATE products
        SET stock_quantity = stock_quantity - item.quantidade
        WHERE id = produto.id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
```

-----

## TRIGGER DE INDISPONIBILIDADE AUTOMATICA

Quando o estoque chega a zero, o produto deve ser marcado como
indisponível automaticamente:

```sql
CREATE OR REPLACE FUNCTION atualizar_disponibilidade_estoque()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Produto com estoque controlado chegou a zero
  IF NEW.track_stock = true
    AND NEW.stock_quantity IS NOT NULL
    AND NEW.stock_quantity <= 0
    AND OLD.disponivel = true
  THEN
    NEW.disponivel := false;
    NEW.stock_quantity := 0; -- garantir que não fique negativo
  END IF;

  -- Produto com estoque controlado voltou a ter estoque
  IF NEW.track_stock = true
    AND NEW.stock_quantity IS NOT NULL
    AND NEW.stock_quantity > 0
    AND OLD.disponivel = false
    AND OLD.stock_quantity = 0
  THEN
    NEW.disponivel := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_disponibilidade_estoque
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_disponibilidade_estoque();
```

-----

## SERVER ACTIONS — ESTOQUE

### lib/actions/estoque.ts

```typescript
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

  revalidatePath('/dashboard/produtos')
  return { sucesso: true }
}

const schemaEntradaEstoque = z.object({
  product_id: z.string().uuid(),
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  motivo: z.string().optional(),
})

// Registrar entrada de estoque (compra/reposição)
export async function registrarEntradaEstoque(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: { user } } = await supabase.auth.getUser()

  const dados = schemaEntradaEstoque.safeParse({
    product_id: formData.get('product_id'),
    quantidade: parseInt(String(formData.get('quantidade') ?? '0')),
    motivo: formData.get('motivo') || undefined,
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  // Buscar estoque atual
  const { data: produto } = await supabase
    .from('products')
    .select('id, stock_quantity, track_stock, nome')
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!produto) return { erro: 'Produto não encontrado' }
  if (!produto.track_stock) return { erro: 'Este produto não tem controle de estoque ativo' }

  const quantidade_anterior = produto.stock_quantity ?? 0
  const quantidade_posterior = quantidade_anterior + dados.data.quantidade

  // Registrar movimentação
  const { error: movError } = await supabase
    .from('stock_movements')
    .insert({
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

  // Atualizar estoque do produto
  const { error: prodError } = await supabase
    .from('products')
    .update({ stock_quantity: quantidade_posterior })
    .eq('id', dados.data.product_id)
    .eq('tenant_id', tenant.id)

  if (prodError) return { erro: prodError.message }

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard/estoque')
  return { sucesso: true, quantidade_posterior }
}

const schemaAjusteEstoque = z.object({
  product_id: z.string().uuid(),
  tipo: z.enum(['ajuste_positivo', 'ajuste_negativo']),
  quantidade: z.number().int().min(1),
  motivo: z.string().min(3, 'Informe o motivo do ajuste'),
})

// Registrar ajuste de estoque (correção, perda)
export async function registrarAjusteEstoque(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: { user } } = await supabase.auth.getUser()

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
  if (!produto.track_stock) return { erro: 'Produto sem controle de estoque ativo' }

  const quantidade_anterior = produto.stock_quantity ?? 0
  const delta = dados.data.tipo === 'ajuste_positivo'
    ? dados.data.quantidade
    : -dados.data.quantidade
  const quantidade_posterior = Math.max(0, quantidade_anterior + delta)

  const { error: movError } = await supabase
    .from('stock_movements')
    .insert({
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

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard/estoque')
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

  revalidatePath('/dashboard/estoque')
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
    // Filtrar produtos onde estoque <= mínimo usando filtro no cliente
    // (Supabase não suporta comparação entre colunas diretamente no .filter)

  if (!data) return []

  return data.filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
  )
}
```

-----

## PAGINA DE ESTOQUE NO DASHBOARD

### app/(dashboard)/produtos/page.tsx (extensão)

A tela de produtos já existe (arquivo 11). O estoque é integrado
como uma aba ou seção dentro da mesma tela. Aqui documentamos
os componentes específicos do estoque.

### components/dashboard/painel-estoque.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallora/lib'
import { registrarEntradaEstoque, registrarAjusteEstoque } from '@/lib/actions/estoque'
import { BarraEstoque } from './barra-estoque'
import { ModalMovimentacao } from './modal-movimentacao'

interface Produto {
  id: string
  nome: string
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  stock_minimo?: number | null
  categories?: { nome: string } | null
}

interface Props {
  produtos: Produto[]
}

export function PainelEstoque({ produtos }: Props) {
  const produtosComEstoque = produtos.filter((p) => p.track_stock)
  const semEstoque = produtos.filter((p) => !p.track_stock)
  const alertas = produtosComEstoque.filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
  )

  return (
    <div className="space-y-6">
      {/* Alertas de estoque baixo */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {alertas.length} produto{alertas.length !== 1 ? 's' : ''} com estoque baixo
          </p>
          <div className="space-y-1">
            {alertas.map((p) => (
              <p key={p.id} className="text-sm text-amber-700">
                {p.nome} — {p.stock_quantity ?? 0} unidade{(p.stock_quantity ?? 0) !== 1 ? 's' : ''} restante{(p.stock_quantity ?? 0) !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Produtos com controle ativo */}
      {produtosComEstoque.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Com controle de estoque
          </p>
          <div className="space-y-3">
            {produtosComEstoque.map((produto) => (
              <CardEstoque key={produto.id} produto={produto} />
            ))}
          </div>
        </div>
      )}

      {/* Produtos sem controle */}
      {semEstoque.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Sem controle de estoque
          </p>
          <div className="space-y-2">
            {semEstoque.map((produto) => (
              <div
                key={produto.id}
                className="bg-white rounded-xl border border-gray-100
                  px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">{produto.nome}</span>
                <span className="text-xs text-gray-400">
                  Controle desativado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CardEstoque({ produto }: { produto: Produto }) {
  const [modalAberto, setModalAberto] = useState<'entrada' | 'ajuste' | null>(null)

  const estaAbaixoMinimo =
    (produto.stock_quantity ?? 0) <= (produto.stock_minimo ?? 0)
  const estaZerado = (produto.stock_quantity ?? 0) === 0

  return (
    <>
      <div className={`bg-white rounded-xl border p-4 ${
        estaZerado
          ? 'border-red-200'
          : estaAbaixoMinimo
          ? 'border-amber-200'
          : 'border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {produto.nome}
            </p>
            {produto.categories?.nome && (
              <p className="text-xs text-gray-400 mt-0.5">
                {produto.categories.nome}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              estaZerado
                ? 'text-red-600'
                : estaAbaixoMinimo
                ? 'text-amber-600'
                : 'text-[#1A4D3A]'
            }`}>
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-gray-400">unidades</p>
          </div>
        </div>

        {/* Barra visual de estoque */}
        {produto.stock_minimo != null && produto.stock_minimo > 0 && (
          <BarraEstoque
            atual={produto.stock_quantity ?? 0}
            minimo={produto.stock_minimo}
          />
        )}

        {/* Avisos */}
        {estaZerado && (
          <p className="text-xs text-red-600 mt-2">
            Produto indisponível — estoque zerado
          </p>
        )}
        {!estaZerado && estaAbaixoMinimo && (
          <p className="text-xs text-amber-600 mt-2">
            Estoque abaixo do mínimo ({produto.stock_minimo} unidades)
          </p>
        )}

        {/* Ações */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setModalAberto('entrada')}
            className="flex-1 bg-[#1A4D3A] text-white py-2 rounded-lg text-sm font-medium
              hover:bg-[#163d2e] transition-colors"
          >
            Entrada
          </button>
          <button
            onClick={() => setModalAberto('ajuste')}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg
              text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Ajuste
          </button>
          <a
            href={`/dashboard/estoque/${produto.id}`}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg
              text-sm font-medium hover:border-gray-300 transition-colors text-center"
          >
            Histórico
          </a>
        </div>
      </div>

      {/* Modal de movimentação */}
      {modalAberto && (
        <ModalMovimentacao
          produto={produto}
          tipo={modalAberto}
          onFechar={() => setModalAberto(null)}
        />
      )}
    </>
  )
}
```

-----

## COMPONENTE BARRA DE ESTOQUE

### components/dashboard/barra-estoque.tsx

```typescript
interface Props {
  atual: number
  minimo: number
  maximo?: number
}

export function BarraEstoque({ atual, minimo, maximo }: Props) {
  const referencia = maximo ?? Math.max(atual, minimo) * 2
  const percentual = referencia > 0
    ? Math.min(100, Math.round((atual / referencia) * 100))
    : 0

  const cor =
    atual === 0 ? 'bg-red-500' :
    atual <= minimo ? 'bg-amber-400' :
    'bg-[#4CAF82]'

  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Mínimo: {minimo}</span>
        <span>{percentual}%</span>
      </div>
    </div>
  )
}
```

-----

## MODAL DE MOVIMENTACAO

### components/dashboard/modal-movimentacao.tsx

```typescript
'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { registrarEntradaEstoque, registrarAjusteEstoque } from '@/lib/actions/estoque'

function BotaoSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 bg-[#1A4D3A] text-white py-2.5 rounded-lg
        text-sm font-medium disabled:opacity-50"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

interface Props {
  produto: { id: string; nome: string; stock_quantity?: number | null }
  tipo: 'entrada' | 'ajuste'
  onFechar: () => void
}

export function ModalMovimentacao({ produto, tipo, onFechar }: Props) {
  const action = tipo === 'entrada'
    ? registrarEntradaEstoque
    : registrarAjusteEstoque
  const [estado, dispatch] = useFormState(action, null)

  if (estado?.sucesso) {
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center
      justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-[#1A4D3A] mb-1">
          {tipo === 'entrada' ? 'Entrada de estoque' : 'Ajuste de estoque'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{produto.nome}</p>
        <p className="text-xs text-gray-400 mb-4">
          Estoque atual: {produto.stock_quantity ?? 0} unidades
        </p>

        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="product_id" value={produto.id} />

          {tipo === 'ajuste' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de ajuste
              </label>
              <select
                name="tipo"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                  text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              >
                <option value="ajuste_positivo">Adicionar (contagem, correção)</option>
                <option value="ajuste_negativo">Remover (perda, vencimento, etc.)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Quantidade
            </label>
            <input
              name="quantidade"
              type="number"
              min="1"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {tipo === 'ajuste' ? 'Motivo (obrigatório)' : 'Motivo (opcional)'}
            </label>
            <input
              name="motivo"
              type="text"
              required={tipo === 'ajuste'}
              placeholder={
                tipo === 'entrada'
                  ? 'Ex: Compra do fornecedor'
                  : 'Ex: Produto vencido, contagem física'
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {estado?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estado.erro}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border border-gray-200 py-2.5 rounded-lg
                text-sm text-gray-600"
            >
              Cancelar
            </button>
            <BotaoSubmit
              label={tipo === 'entrada' ? 'Registrar entrada' : 'Registrar ajuste'}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
```

-----

## PAGINA DE HISTORICO DE MOVIMENTACOES

### app/(dashboard)/estoque/[id]/page.tsx

```typescript
import { createSupabaseServer } from '@/lib/supabase/server'
import { getHistoricoMovimentacoes } from '@/lib/actions/estoque'
import { redirect } from 'next/navigation'

const LABELS_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida_pedido: 'Saída por pedido',
  ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo',
}

const CORES_TIPO: Record<string, string> = {
  entrada: 'text-green-600 bg-green-50',
  saida_pedido: 'text-blue-600 bg-blue-50',
  ajuste_positivo: 'text-green-600 bg-green-50',
  ajuste_negativo: 'text-red-600 bg-red-50',
}

export default async function PaginaHistoricoEstoque({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseServer()

  const { data: produto } = await supabase
    .from('products')
    .select('id, nome, stock_quantity, stock_minimo, track_stock')
    .eq('id', params.id)
    .single()

  if (!produto) redirect('/dashboard/produtos')

  const movimentacoes = await getHistoricoMovimentacoes(params.id)

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard/produtos" className="text-[#4CAF82] text-sm">
          Produtos
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 text-sm">Estoque — {produto.nome}</span>
      </div>

      {/* Estoque atual */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {produto.nome}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Estoque mínimo: {produto.stock_minimo ?? 0} unidades
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#1A4D3A]">
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-gray-400">unidades</p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Histórico de movimentações
      </h2>

      {movimentacoes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma movimentação registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map((mov: any) => (
            <div
              key={mov.id}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3
                flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${CORES_TIPO[mov.tipo] ?? 'text-gray-600 bg-gray-50'}`}
                  >
                    {LABELS_TIPO[mov.tipo] ?? mov.tipo}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {mov.motivo ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(mov.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-base font-bold ${
                    mov.quantidade > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                </p>
                <p className="text-xs text-gray-400">
                  {mov.quantidade_anterior} → {mov.quantidade_posterior}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

-----

## BLOQUEIO DE ACESSO POR PLANO

Quando o lojista está no plano básico e acessa a aba de estoque,
exibir uma tela de upgrade:

```typescript
// components/dashboard/tela-upgrade-estoque.tsx

interface Props {
  mensagem?: string
}

export function TelaUpgradeEstoque({ mensagem }: Props) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 bg-[#1A4D3A]/10 rounded-full flex items-center
        justify-center mx-auto mb-4">
        <span className="text-2xl">📦</span>
      </div>
      <h3 className="text-lg font-semibold text-[#1A4D3A] mb-2">
        Controle de estoque
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        {mensagem ?? 'O controle de estoque está disponível nos planos Profissional e Premium.'}
      </p>
      <a
        href="/dashboard/configuracoes/assinatura"
        className="inline-block bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg
          text-sm font-medium hover:bg-[#163d2e] transition-colors"
      >
        Ver planos disponíveis
      </a>
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Migration_005 aplicada — tabela `stock_movements` e trigger de decremento
- [ ] Trigger `atualizar_disponibilidade_estoque` criado para marcar produto
  como indisponível ao zerar o estoque
- [ ] Verificação de plano (`tem_estoque`) em todas as Server Actions
- [ ] Entrada de estoque cria registro em `stock_movements` antes de atualizar o produto
- [ ] Ajuste negativo usa `Math.max(0, ...)` para não gerar estoque negativo
- [ ] `revalidatePath` chamado em `/dashboard/produtos` e `/dashboard/estoque`
  após cada movimentação
- [ ] Alertas de estoque baixo visíveis na tela principal do painel de estoque
- [ ] Modal de movimentação fecha automaticamente após sucesso (`estado.sucesso`)
- [ ] Histórico de movimentações exibe delta com sinal (+ para entradas, - para saídas)
- [ ] Tela de upgrade exibida para plano básico com link para a página de assinatura
- [ ] Produtos com `track_stock = false` listados separadamente como “sem controle”
- [ ] Produto marcado como indisponível automaticamente ao zerar — e disponível
  novamente ao receber entrada

-----

*Arquivo 24 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 25 — Painel Super Admin*
