'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@mallevo/lib'

import { formatarReais } from '@/lib/format'

/**
 * CartFab — reescrita RN→DOM do FAB de carrinho de
 * apps/mobile-consumer/app/loja/[slug].tsx (TouchableOpacity flutuante).
 *
 * Em 3a o carrinho está SEMPRE vazio: não há ProductModal nem
 * `adicionarItem` (isso é 3b). O FAB existe como UI/estado já ligado ao
 * `useCartStore` de @mallevo/lib (count + total reativos), então quando 3b
 * popular o carrinho ele aparece sem mudança aqui. Vazio → não renderiza.
 *
 * O link "/checkout" é Stage 3d; aqui o FAB é só um botão inerte (o destino
 * não existe ainda). Marcado como fora de escopo no RESUMO.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (cart/CartFab).
 */
export function CartFab() {
  // Evita mismatch de hidratação: o store Zustand só é confiável no client.
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())

  if (!montado || totalItens === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-20 flex justify-center">
      <button
        type="button"
        // FORA DE ESCOPO 3a: navegação p/ /checkout é Stage 3d.
        className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-pill bg-accent px-5 shadow-floating"
      >
        <span className="text-[15px] font-extrabold text-ink">
          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
        </span>
        <span className="text-[15px] font-extrabold text-ink">
          {formatarReais(total)}
        </span>
      </button>
    </div>
  )
}
