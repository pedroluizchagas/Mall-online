import { getStore, getStoreSlug } from '@/lib/tenant'
import { StoreThemeRoot } from '@/components/store/StoreThemeRoot'

/**
 * Layout do grupo `(loja)` — tudo que é "dentro da loja": catálogo, produto,
 * checkout, pedido e auth. Veste a pele da loja UMA vez aqui (StoreThemeRoot
 * no `:root`), em vez de página por página.
 *
 * Coluna central (decisão 2026-09-19): as vitrines são especificadas em
 * largura de celular (docs/store-theme/05 §5.6). No desktop, a página é uma
 * coluna de 480px sobre o fundo da pele, com fio lateral — fiel à spec, sem
 * redesenho. Layouts desktop nativos ficam para depois.
 *
 * Loja ausente: o `notFound()` vive AQUI, não nas páginas. `loading.tsx`
 * embrulha a página numa Suspense e o Next já mandou o status 200 quando ela
 * decide 404 — o layout roda FORA dessa fronteira, então é o último ponto em
 * que o 404 ainda é um 404 de verdade (e não um "soft 404" para o Google).
 */
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore(getStoreSlug())

  return (
    <StoreThemeRoot
      theme={store.theme ?? null}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas md:border-x md:border-line"
    >
      {children}
    </StoreThemeRoot>
  )
}
