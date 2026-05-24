'use client'

import { formatarReais } from '@/lib/format'

/**
 * OrderItemsList — UI pura dos itens do pedido + resumo (Stage 3f).
 *
 * Lê apenas o snapshot que vive em `order_items` (nome, quantidade,
 * preco_unit, subtotal, observacoes, modifiers). NÃO deriva o "rótulo do
 * variant" via join em `product_variants`/`product_options`/... (D2: o
 * storefront só lê catálogo pelas views `public_catalog_*`). O mobile
 * compõe esse rótulo a partir das tabelas base; aqui é deliberadamente
 * omitido até existir snapshot de rótulo no `order_items` ou loader via
 * views (decisão TL §3f).
 */

interface OrderItem {
  id: string
  nome: string
  quantidade: number
  preco_unit: number
  subtotal: number
  observacoes?: string | null
  modifiers?: Array<{ modifier_id: string; nome: string; preco_extra: number }> | null
}

interface Props {
  itens: OrderItem[]
  subtotal: number
  taxa_entrega: number
  total: number
}

export function OrderItemsList({
  itens,
  subtotal,
  taxa_entrega,
  total,
}: Props) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-soft">
      {itens.map((item, idx) => {
        const modifiers = item.modifiers ?? []
        return (
          <div
            key={item.id}
            className={`flex justify-between gap-3 py-2 ${
              idx < itens.length - 1 ? 'border-b border-line' : ''
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">
                {item.quantidade}× {item.nome}
              </p>
              {modifiers.length > 0 && (
                <p className="mt-0.5 text-xs font-medium text-ink-muted">
                  {modifiers.map((m) => m.nome).join(', ')}
                </p>
              )}
              {item.observacoes && (
                <p className="mt-0.5 text-xs italic text-ink-muted">
                  &ldquo;{item.observacoes}&rdquo;
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-ink-muted">
              {formatarReais(item.subtotal)}
            </p>
          </div>
        )
      })}

      <div className="mt-2 flex flex-col gap-1.5 border-t border-line pt-3">
        <Linha rotulo="Subtotal" valor={formatarReais(subtotal)} />
        {taxa_entrega > 0 && (
          <Linha
            rotulo="Taxa de entrega"
            valor={formatarReais(taxa_entrega)}
          />
        )}
        <Linha rotulo="Total" valor={formatarReais(total)} destacado />
      </div>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  destacado,
}: {
  rotulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          destacado
            ? 'text-base font-extrabold text-ink'
            : 'text-sm font-medium text-ink-muted'
        }
      >
        {rotulo}
      </span>
      <span
        className={
          destacado
            ? 'text-base font-extrabold text-ink'
            : 'text-sm font-semibold text-ink'
        }
      >
        {valor}
      </span>
    </div>
  )
}
