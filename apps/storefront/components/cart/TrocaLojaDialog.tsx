'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@mallevo/lib'

/**
 * TrocaLojaDialog — reescrita RN→DOM do diálogo "Trocar de loja?" de
 * apps/mobile-consumer/components/ModalProduto.tsx (subestágio 3b).
 *
 * Regra single-store: o carrinho é de uma loja só. `adicionarItem` do
 * @mallevo/lib NÃO adiciona quando há outra loja — seta `pendingTrocaLoja`
 * (snapshot do item). Este diálogo observa esse estado e oferece
 * `confirmarTrocaLoja()` (esvazia + adiciona o item pendente) ou
 * `cancelarTrocaLoja()` (descarta). NÃO reimplementa o store — consome a API.
 *
 * Renderizado no nível do catálogo (sobrevive ao fechamento do ProductModal).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3b (cart/TrocaLojaDialog).
 */
export function TrocaLojaDialog() {
  // O store Zustand só é confiável no client (espelha CartFab).
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  const pending = useCartStore((s) => s.pendingTrocaLoja)
  const confirmar = useCartStore((s) => s.confirmarTrocaLoja)
  const cancelar = useCartStore((s) => s.cancelarTrocaLoja)

  useEffect(() => {
    if (!pending) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, cancelar])

  if (!montado || !pending) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Trocar de loja"
    >
      <button
        type="button"
        aria-label="Cancelar"
        onClick={cancelar}
        className="absolute inset-0 bg-black/50"
      />

      <div className="relative flex w-full max-w-sm flex-col items-start gap-3 rounded-lg bg-surface p-6 shadow-floating">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/20">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warning"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </div>

        <h2 className="text-lg font-extrabold text-ink">Trocar de loja?</h2>

        <p className="text-sm font-medium leading-snug text-ink-muted">
          Seu carrinho atual será esvaziado para adicionar itens de{' '}
          <span className="font-bold text-ink">{pending.store_nome}</span>.
        </p>

        <div className="mt-2 flex w-full gap-2">
          <button
            type="button"
            onClick={cancelar}
            className="h-11 flex-1 rounded-pill bg-surfaceMuted text-sm font-extrabold text-ink transition-opacity hover:opacity-75"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="h-11 flex-1 rounded-pill bg-accent text-sm font-extrabold text-accent-ink transition-opacity hover:opacity-90"
          >
            Trocar
          </button>
        </div>
      </div>
    </div>
  )
}
