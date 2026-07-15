'use client'

import { Menu, Search } from 'lucide-react'

/**
 * Barra superior exclusiva do mobile (dashboard-redesign Fase 5 §4). Some em
 * `md+` (a sidebar fixa assume). O hambúrguer abre o drawer via evento
 * `mallevo:menu`; a lupa abre o command palette (`mallevo:cmdk`) — mesmos
 * gatilhos que a sidebar já escuta, sem lift de estado para o layout server.
 */
export function MobileTopbar({ nomeLoja }: { nomeLoja: string }) {
  return (
    <div
      className="md:hidden flex items-center gap-3 px-4 flex-shrink-0"
      style={{ height: 56, borderBottom: '1px solid var(--line)' }}
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('mallevo:menu'))}
        aria-label="Abrir menu de navegação"
        className="p-2 -ml-2 rounded-lg"
        style={{ color: 'var(--ink-2)' }}
      >
        <Menu className="w-5 h-5" strokeWidth={2} />
      </button>

      <span className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {nomeLoja}
      </span>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('mallevo:cmdk'))}
        aria-label="Buscar"
        className="p-2 -mr-2 rounded-lg"
        style={{ color: 'var(--ink-2)' }}
      >
        <Search className="w-5 h-5" strokeWidth={1.75} />
      </button>
    </div>
  )
}
