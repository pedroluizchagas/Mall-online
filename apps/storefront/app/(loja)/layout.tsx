import { getStore, getStoreSlug } from '@/lib/tenant'
import { StoreThemeRoot } from '@/components/store/StoreThemeRoot'

/**
 * Layout do grupo `(loja)` — tudo que é "dentro da loja": catálogo, produto,
 * checkout, pedido e auth. Veste a pele da loja UMA vez aqui (StoreThemeRoot
 * no `:root`), em vez de página por página.
 *
 * Largura (2026-10-10): o layout NÃO impõe mais a coluna de 480px. Quem
 * decide é a página — o layout com composição de computador ocupa a tela
 * toda; a vitrine que ainda é só celular veste a coluna (`MolduraDaVitrine`).
 * Os fluxos (checkout, entrar, pedido) têm contêiner próprio.
 *
 * Loja ausente: o `notFound()` vive AQUI, não nas páginas. `loading.tsx`
 * embrulha a página numa Suspense e o Next já mandou o status 200 quando ela
 * decide 404 — o layout roda FORA dessa fronteira, então é o último ponto em
 * que o 404 ainda é um 404 de verdade (e não um "soft 404" para o Google).
 */
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore(getStoreSlug())

  return (
    <StoreThemeRoot theme={store.theme ?? null} className="min-h-screen w-full bg-canvas">
      {children}
    </StoreThemeRoot>
  )
}
