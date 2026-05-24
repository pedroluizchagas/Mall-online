'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@mallevo/lib'

import { formatarReais } from '@/lib/format'
import { CartDrawer } from '@/components/cart/CartDrawer'

/**
 * CartFab — reescrita RN→DOM do FAB de carrinho de
 * apps/mobile-consumer/app/loja/[slug].tsx (TouchableOpacity flutuante).
 *
 * Conta/total reativos via `useCartStore` de @mallevo/lib. Vazio → não
 * renderiza. Em 3c o FAB passa a ABRIR a sacola (`CartDrawer`) — o host do
 * estado aberto/fechado vive aqui (mount único por página). O checkout em si
 * (`/checkout`/Pagar.me) é Stage 3d e permanece fora de escopo (CTA inerte
 * dentro do drawer).
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3a/§3c.
 */
export function CartFab() {
  // Evita mismatch de hidratação: o store Zustand só é confiável no client.
  const [montado, setMontado] = useState(false)
  const [aberto, setAberto] = useState(false)
  useEffect(() => setMontado(true), [])

  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())

  if (!montado || totalItens === 0) return null

  return (
    <>
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-20 flex justify-center">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir sacola"
          className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-pill bg-accent px-5 shadow-floating transition-opacity hover:opacity-90"
        >
          <span className="text-[15px] font-extrabold text-ink">
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-[15px] font-extrabold text-ink">
            {formatarReais(total)}
          </span>
        </button>
      </div>

      {aberto && <CartDrawer onFechar={() => setAberto(false)} />}
    </>
  )
}
