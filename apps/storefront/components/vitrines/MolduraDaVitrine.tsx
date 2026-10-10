import type { ReactNode } from 'react'

import { resolveVitrineDaLoja, vitrineTemDesktop } from '@/lib/vitrine'

/**
 * Largura da página da loja. Layout com composição de computador ocupa a tela
 * toda; vitrine que ainda é só celular fica na coluna central de 480px sobre a
 * pele, com fio lateral — a apresentação que TODA loja tinha no desktop até
 * 2026-10-10.
 *
 * Recebe a loja JÁ com o rascunho aplicado: o preview pode trocar de
 * arquétipo e, com ele, de vitrine.
 */
export function MolduraDaVitrine({
  store,
  children,
}: {
  store: { theme: unknown | null; categoria_slug: string | null }
  children: ReactNode
}) {
  if (vitrineTemDesktop(resolveVitrineDaLoja(store))) return <>{children}</>
  return <ColunaCelular>{children}</ColunaCelular>
}

/** A coluna de celular no desktop — também a da moldura App, que é um telefone. */
export function ColunaCelular({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas md:border-x md:border-line">{children}</div>
  )
}
