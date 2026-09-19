import { normalizeStoreConteudo } from '@mallevo/lib'

import { CartFab } from '@/components/cart/CartFab'
import { CartPersistence } from '@/components/cart/CartPersistence'
import { CatalogClient } from '@/components/store/CatalogClient'
import { FechoLoja, HeroLoja } from './_base'
import type { VitrineWebProps } from './tipos'

/**
 * Layout padrão da loja — o que toda loja veste quando o arquétipo não tem
 * vitrine própria para a sua categoria (`resolveVitrine` → null). Já é
 * premium: hero com a voz do lojista (`stores.conteudo`), status real de
 * horários, régua de seções e fecho. É também a rede de segurança dos 6
 * arquétipos só com pele (heritage, soft, tech, market, utility, playful).
 */
export function VitrinePadrao({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = normalizeStoreConteudo(store.conteudo)

  return (
    <main className="min-h-screen pb-24">
      <HeroLoja store={store} conteudo={conteudo} />

      <CatalogClient
        secoes={secoes}
        loja={{
          id: store.id,
          nome: store.nome,
          taxa_entrega: store.taxa_entrega ?? 0,
        }}
        detalhes={detalhes}
        initialProdutoId={initialProdutoId}
      />

      <FechoLoja store={store} />

      <CartPersistence />
      <CartFab />
    </main>
  )
}
