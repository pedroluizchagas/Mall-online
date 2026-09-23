'use client'

import { Sacola } from './Sacola'
import { formatarReais } from '@/lib/format'

/**
 * A sacola pronta para o chrome do layout PADRÃO — ilha client mínima sobre
 * `Sacola` (render-prop), para que `Padrao.tsx` continue server component
 * (R7). As 18 vitrines desenham o próprio botão no seu DNA e usam `Sacola`
 * direto; aqui o botão é o genérico Mallevo.
 */
export function BotaoSacola() {
  return (
    <Sacola>
      {({ abrir, totalItens, total }) => (
        <button
          type="button"
          onClick={abrir}
          aria-label={totalItens > 0 ? `Sacola, ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}` : 'Sacola vazia'}
          className="flex h-9 shrink-0 items-center gap-2 rounded-pill bg-accent px-3.5 font-body text-[13px] font-extrabold text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]" aria-hidden>
            <path
              d="M6 8h12l-1 11H7L6 8Zm3 0V6.5a3 3 0 0 1 6 0V8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {totalItens > 0 ? formatarReais(total) : 'Sacola'}
        </button>
      )}
    </Sacola>
  )
}
