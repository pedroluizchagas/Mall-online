'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Rotas que abrem com MARQUISE: a página desenha a fachada (sobre a moldura
 * escura, transparente) e a própria folha que sobe por cima dela. As demais
 * são o "corredor de serviço" — a folha clara ocupa a tela desde o topo e o
 * layout a desenha aqui (o mesmo contrato do painel web).
 */
const ROTAS_COM_MARQUISE = new Set(['/admin'])

export function Superficie({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (ROTAS_COM_MARQUISE.has(pathname)) return <>{children}</>
  return <div className="vidro-fosco min-h-full">{children}</div>
}
