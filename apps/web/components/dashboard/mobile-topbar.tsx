'use client'

import Image from 'next/image'
import Link from 'next/link'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Barra do topo no celular (some em `md+`, onde a sidebar fixa assume). É a
 * portaria da marquise: transparente sobre a moldura, moedas de vidro. O menu
 * abre o drawer (`mallevo:menu`) e a lupa, a busca (`mallevo:cmdk`) — os
 * mesmos gatilhos que a sidebar escuta.
 */
export function MobileTopbar({ nomeLoja }: { nomeLoja: string }) {
  return (
    <div className="sobre-escuro relative flex h-14 shrink-0 items-center gap-3 px-3 md:hidden">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('mallevo:menu'))}
        aria-label="Abrir menu de navegação"
        className="flex size-10 items-center justify-center rounded-full bg-[color:var(--m-glass)] text-white ring-1 ring-inset ring-[color:var(--m-line)]"
      >
        <PartnerIcon name="menu" size={18} strokeWidth={2} />
      </button>

      <Link href="/" aria-label={`Mallevo — ${nomeLoja}`} className="mx-auto block h-[19px] w-[120px]">
        <Image
          src="/brand/mallevo-logo-white.png"
          alt="Mallevo"
          width={669}
          height={106}
          priority
          unoptimized
          className="h-full w-auto"
        />
      </Link>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('mallevo:cmdk'))}
        aria-label="Buscar"
        className="flex size-10 items-center justify-center rounded-full bg-[color:var(--m-glass)] text-white ring-1 ring-inset ring-[color:var(--m-line)]"
      >
        <PartnerIcon name="search" size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
