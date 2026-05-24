'use client'

import { useEffect } from 'react'
import { useCartStore } from '@mallevo/lib'
import type { ItemCarrinho } from '@mallevo/types'

/**
 * CartPersistence — persistência do carrinho LOCAL ao apps/storefront
 * (subestágio 3c).
 *
 * Decisão do tech lead (docs/storefront/05-stage-3-storefront.md §3c):
 * `useCartStore` vive em @mallevo/lib e é consumido também pelo
 * apps/mobile-consumer (React Native, sem `window`/`sessionStorage`) e pelo
 * SSR do storefront. Adicionar o middleware `persist` no store
 * compartilhado quebraria mobile e SSR. Portanto a persistência é feita
 * AQUI, sem editar @mallevo/lib: este componente client-only (1) re-hidrata
 * uma vez no mount via `useCartStore.setState(...)` (API do zustand, sem
 * alterar a definição do store) e (2) espelha o subconjunto relevante do
 * estado → `sessionStorage` a cada mudança via `useCartStore.subscribe`.
 *
 * Só serializa/restaura `itens` + `store_*`; NUNCA reimplementa a lógica do
 * store. `pendingTrocaLoja` (estado de UI transitório) não é persistido.
 * `sessionStorage` é origin-scoped por natureza (reforça single-store).
 *
 * Renderiza `null`. Montado uma vez por página (Server Component → ilha
 * client), espelhando o padrão de CartFab.
 */

const STORAGE_KEY = 'mallevo:storefront:cart:v1'

interface CartSnapshot {
  itens: ItemCarrinho[]
  store_id: string | null
  store_nome: string | null
  store_taxa_entrega: number
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function itemValido(raw: unknown): raw is ItemCarrinho {
  if (typeof raw !== 'object' || raw === null) return false
  const i = raw as Record<string, unknown>
  return (
    isNonEmptyString(i.linha_id) &&
    isNonEmptyString(i.product_id) &&
    typeof i.nome === 'string' &&
    typeof i.preco === 'number' &&
    Number.isFinite(i.preco) &&
    typeof i.quantidade === 'number' &&
    Number.isFinite(i.quantidade) &&
    i.quantidade > 0
  )
}

/** Valida o shape persistido. Snapshot inválido/corrompido → null (ignora). */
function parseSnapshot(rawJson: string): CartSnapshot | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const s = parsed as Record<string, unknown>

  if (!Array.isArray(s.itens) || !s.itens.every(itemValido)) return null
  if (s.store_id !== null && typeof s.store_id !== 'string') return null
  if (s.store_nome !== null && typeof s.store_nome !== 'string') return null
  if (
    typeof s.store_taxa_entrega !== 'number' ||
    !Number.isFinite(s.store_taxa_entrega)
  ) {
    return null
  }

  return {
    itens: s.itens as ItemCarrinho[],
    store_id: (s.store_id as string | null) ?? null,
    store_nome: (s.store_nome as string | null) ?? null,
    store_taxa_entrega: s.store_taxa_entrega,
  }
}

export function CartPersistence() {
  useEffect(() => {
    // sessionStorage só existe no client; o efeito já garante isso, mas o
    // guard mantém a função robusta a ambientes sem Storage.
    if (typeof window === 'undefined') return

    // 1) Re-hidratação única. Restaura verbatim (não filtra agendamento nem
    //    reaplica regras — isso é responsabilidade do store).
    try {
      const guardado = window.sessionStorage.getItem(STORAGE_KEY)
      if (guardado) {
        const snap = parseSnapshot(guardado)
        if (snap && (snap.itens.length > 0 || snap.store_id !== null)) {
          useCartStore.setState({
            itens: snap.itens,
            store_id: snap.store_id,
            store_nome: snap.store_nome,
            store_taxa_entrega: snap.store_taxa_entrega,
          })
        } else if (!snap) {
          window.sessionStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // Storage indisponível/quota/JSON ruim → segue com carrinho vazio.
    }

    // 2) Espelha mudanças subsequentes. Persiste só o subconjunto relevante;
    //    pendingTrocaLoja é deliberadamente omitido.
    const unsubscribe = useCartStore.subscribe((state) => {
      try {
        const snapshot: CartSnapshot = {
          itens: state.itens,
          store_id: state.store_id,
          store_nome: state.store_nome,
          store_taxa_entrega: state.store_taxa_entrega,
        }
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      } catch {
        // Falha de escrita não pode quebrar o carrinho em memória.
      }
    })

    return unsubscribe
  }, [])

  return null
}
