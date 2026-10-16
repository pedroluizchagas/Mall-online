import Link from 'next/link'
import type { ReactNode } from 'react'
import { PartnerIcon } from '@/components/ui/partner-icon'

/** "‹ Produtos" — o caminho de volta das telas de detalhe, em tinta. */
export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink-2 transition-colors hover:text-ink"
    >
      <PartnerIcon
        name="chevron-left"
        size={16}
        strokeWidth={2.4}
        className="transition-transform duration-300 ease-entrada group-hover:-translate-x-0.5"
      />
      {children}
    </Link>
  )
}
