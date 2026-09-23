import { normalizeStoreConteudo } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { CatalogClient } from '@/components/store/CatalogClient'
import { BotaoSacola, FechoLoja, HeroLoja } from './_base'
import type { VitrineWebProps } from './tipos'

/**
 * Layout padrão da loja — o que toda loja veste quando o arquétipo não tem
 * vitrine própria para a sua categoria (`resolveVitrine` → null). Já é
 * premium: hero com a voz do lojista (`stores.conteudo`), status real de
 * horários, régua de seções e fecho. É também a rede de segurança dos 6
 * arquétipos só com pele (heritage, soft, tech, market, utility, playful).
 *
 * Chrome de topo igual ao das vitrines (A-21): barra grudada com o nome da
 * loja e a sacola de `_base/Sacola` — não o FAB flutuante, que foi removido.
 * O `top` sai de `--inset-top` para a moldura App empurrar a barra (A-15).
 */
export function VitrinePadrao({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = normalizeStoreConteudo(store.conteudo)

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-[var(--inset-top,0px)] z-30 flex h-[52px] items-center gap-2 border-b border-line bg-surface px-[calc(var(--space-screen-x,24px)-8px)]">
        <a href="/" className="min-w-0 flex-1 truncate px-2 font-display text-[16px] font-extrabold text-ink">
          {store.nome}
        </a>
        <BotaoSacola />
      </header>

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
    </main>
  )
}
