'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@mallevo/lib'

import { formatarReais } from '@/lib/format'
import { ItemCarrinhoCard } from '@/components/cart/ItemCarrinhoCard'

/**
 * CartDrawer — bottom sheet da sacola (wiring mínimo do 3c para tornar o
 * carrinho VISÍVEL). Lista os itens via `ItemCarrinhoCard` e mostra
 * subtotal/total reativos do `useCartStore` (@mallevo/lib).
 *
 * Aberto/fechado é controlado pelo `CartFab` (host). O CTA "Finalizar
 * pedido" navega para `/checkout` (Stage 3d) — o gate de sessão consumer
 * vive no próprio checkout (decisão TL §3d).
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3c/§3d.
 */
export function CartDrawer({ onFechar }: { onFechar: () => void }) {
  const router = useRouter()
  const itens = useCartStore((s) => s.itens)
  const subtotal = useCartStore((s) => s.subtotal())
  const total = useCartStore((s) => s.total())
  const taxaEntrega = useCartStore((s) => s.store_taxa_entrega)
  const temAgendamento = useCartStore((s) => s.temAgendamento())
  const storeNome = useCartStore((s) => s.store_nome)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  // Esvaziou enquanto aberto (último item removido) → fecha.
  useEffect(() => {
    if (itens.length === 0) onFechar()
  }, [itens.length, onFechar])

  if (itens.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Sacola"
    >
      <button
        type="button"
        aria-label="Fechar sacola"
        onClick={onFechar}
        className="absolute inset-0 bg-black/50"
      />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-lg bg-surface shadow-floating">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-ink">Sacola</h2>
            {storeNome && (
              <p className="truncate text-xs font-semibold text-ink-muted">
                {storeNome}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-ink transition-opacity hover:opacity-75"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {itens.map((item) => (
            <ItemCarrinhoCard key={item.linha_id} item={item} />
          ))}
        </div>

        <div className="flex flex-col gap-2 px-4 pb-5 pt-3">
          <div className="flex justify-between text-sm font-medium text-ink-muted">
            <span>Subtotal</span>
            <span>{formatarReais(subtotal)}</span>
          </div>
          {!temAgendamento && (
            <div className="flex justify-between text-sm font-medium text-ink-muted">
              <span>Entrega</span>
              <span>{formatarReais(taxaEntrega)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-ink">
            <span>Total</span>
            <span>{formatarReais(total)}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onFechar()
              router.push('/checkout')
            }}
            className="mt-1 h-12 w-full rounded-pill bg-accent text-sm font-extrabold text-accent-ink transition-opacity hover:opacity-90"
          >
            Finalizar pedido
          </button>
        </div>
      </div>
    </div>
  )
}
