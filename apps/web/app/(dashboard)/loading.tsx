'use client'

import { usePathname } from 'next/navigation'
import { SkeletonCards, SkeletonInicio } from '@/components/dashboard/skeletons'

/**
 * Fallback do grupo inteiro: além do Início, cobre as rotas sem `loading.tsx`
 * próprio (Conteúdo, Ajuda…). O Início abre com marquise (a `Superficie` não
 * o envolve na folha), as demais com a folha desde o topo.
 */
export default function Loading() {
  const pathname = usePathname()
  return pathname === '/' ? <SkeletonInicio /> : <SkeletonCards />
}
