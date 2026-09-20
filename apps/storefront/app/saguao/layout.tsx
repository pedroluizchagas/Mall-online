import { notFound } from 'next/navigation'

import { getStoreSlug } from '@/lib/tenant'

/**
 * Grupo do SAGUÃO — o apex `mallevo.com.br` (plano de convergência, Fase 5).
 * O middleware reescreve `/`, `/explorar` e `/piso/<slug>` para cá quando o
 * host NÃO é uma loja; num host de loja estas rotas não existem.
 *
 * Sem `StoreThemeRoot`: o saguão é Mallevo (globals.css :root); a pele de
 * cada loja entra só dentro da própria fachada.
 */
export default function SaguaoLayout({ children }: { children: React.ReactNode }) {
  if (getStoreSlug()) notFound()
  return <>{children}</>
}
