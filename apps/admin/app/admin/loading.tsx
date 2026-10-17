'use client'

import { usePathname } from 'next/navigation'
import { SkeletonLista, SkeletonVisaoGeral } from '@/components/admin/skeletons'

/** A Visão geral abre com marquise; as demais telas, com a folha desde o topo. */
export default function Loading() {
  const pathname = usePathname()
  return pathname === '/admin' ? <SkeletonVisaoGeral /> : <SkeletonLista />
}
