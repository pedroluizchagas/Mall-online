import { normalizeStoreConteudo } from '@mallevo/lib'

import { CartPersistence } from '@/components/cart/CartPersistence'
import { CatalogClient } from '@/components/store/CatalogClient'
import { BotaoSacola, FechoLoja, HeroLoja } from './_base'
import type { VitrineWebProps } from './tipos'

/**
 * Layout padrão da loja — o que a loja veste quando o estilo não tem vitrine
 * própria (`resolveVitrine` → null) ou quando ela ainda não escolheu estilo.
 * Já é premium: hero com a voz do lojista (`stores.conteudo`), status real de
 * horários, régua de seções e fecho. É a rede de segurança dos 3 arquétipos
 * só com pele (tech, utility, playful).
 *
 * Chrome de topo igual ao das vitrines (A-21): barra grudada com o nome da
 * loja e a sacola de `_base/Sacola` — não o FAB flutuante, que foi removido.
 * O `top` sai de `--inset-top` para a moldura App empurrar a barra (A-15).
 *
 * Responsivo desde 2026-10-10: a mesma composição, com contêiner central de
 * 1200px, hero mais alto e o catálogo em duas colunas a partir de 768px — é
 * o que toda loja sem vitrine própria veste no computador.
 */
export function VitrinePadrao({ store, secoes, detalhes, initialProdutoId }: VitrineWebProps) {
  const conteudo = normalizeStoreConteudo(store.conteudo)

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-[var(--inset-top,0px)] z-30 border-b border-line bg-surface">
        <div className="flex h-[52px] items-center gap-2 px-[calc(var(--space-screen-x,24px)-8px)] md:mx-auto md:h-16 md:max-w-[1200px] md:px-6">
          <a href="/" className="min-w-0 flex-1 truncate px-2 font-display text-[16px] font-extrabold text-ink md:text-[19px]">
            {store.nome}
          </a>
          <BotaoSacola />
        </div>
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
