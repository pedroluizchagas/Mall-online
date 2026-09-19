'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useCartStore } from '@mallevo/lib'

import { CartDrawer } from '@/components/cart/CartDrawer'

/**
 * A sacola no chrome da vitrine (sem FAB — regra das vitrines: a sacola do
 * header é a única porta do carrinho). Render-prop: a vitrine desenha o botão
 * no seu DNA e recebe `abrir` + `totalItens`; o `CartDrawer` vive aqui.
 *
 * `montado` evita mismatch de hidratação: o store Zustand só é confiável no
 * client, então no servidor o contador é 0.
 */
export function Sacola({
  children,
}: {
  children: (args: { abrir: () => void; totalItens: number; total: number }) => ReactNode
}) {
  const [montado, setMontado] = useState(false)
  const [aberta, setAberta] = useState(false)
  useEffect(() => setMontado(true), [])

  const totalItens = useCartStore((s) => s.totalItens())
  const total = useCartStore((s) => s.total())

  return (
    <>
      {children({
        abrir: () => setAberta(true),
        totalItens: montado ? totalItens : 0,
        total: montado ? total : 0,
      })}
      {aberta && <CartDrawer onFechar={() => setAberta(false)} />}
    </>
  )
}
