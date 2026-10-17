'use client'

import { relogioDaLoja } from '@mallevo/lib'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { useAgora } from '../hooks/use-agora'

/** A cidade e a hora dela — a portaria da landing e do painel. */
export function Portaria() {
  const agora = useAgora(15_000)
  const r = agora ? relogioDaLoja(agora) : null
  return (
    <p className="hidden items-center gap-2.5 text-[12px] font-semibold text-[color:var(--m-ink-2)] md:flex">
      <PartnerIcon name="pin" size={15} strokeWidth={2.2} className="text-[color:var(--brick)]" />
      Divinópolis, MG
      <span className="font-mono tabular-nums text-white" suppressHydrationWarning>
        {r ? `${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}` : '--:--'}
      </span>
    </p>
  )
}
