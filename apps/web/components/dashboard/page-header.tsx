import Link from 'next/link'
import type { ReactNode } from 'react'

type CorBadge = 'ok' | 'warn' | 'err' | 'info'

interface AbaDef {
  id: string
  label: string
  href: string
  badge?: number
}

export interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  abas?: AbaDef[]
  abaAtiva?: string
  badgeCabecalho?: { texto: string; cor: CorBadge }
}

const CORES_BADGE: Record<CorBadge, { bg: string; fg: string; bd: string }> = {
  ok: { bg: 'rgba(79,176,37,0.10)', fg: 'var(--ok)', bd: 'rgba(79,176,37,0.25)' },
  warn: { bg: 'rgba(224,166,26,0.12)', fg: 'var(--warn)', bd: 'rgba(224,166,26,0.30)' },
  err: { bg: 'rgba(224,90,59,0.10)', fg: 'var(--err)', bd: 'rgba(224,90,59,0.28)' },
  info: { bg: 'rgba(91,138,199,0.10)', fg: 'var(--sky)', bd: 'rgba(91,138,199,0.28)' },
}

export function PageHeader({ titulo, subtitulo, acoes, abas, abaAtiva, badgeCabecalho }: PageHeaderProps) {
  const cores = badgeCabecalho ? CORES_BADGE[badgeCabecalho.cor] : null

  return (
    <header className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[28px] sm:text-[32px] leading-tight m-0">{titulo}</h1>
            {badgeCabecalho && cores && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{ background: cores.bg, color: cores.fg, border: `1px solid ${cores.bd}` }}
              >
                {badgeCabecalho.texto}
              </span>
            )}
          </div>
          {subtitulo && <p className="text-ink-3 text-[13px] mt-1.5 leading-relaxed">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex items-center gap-2 flex-wrap shrink-0">{acoes}</div>}
      </div>

      {abas && abas.length > 0 && (
        <nav
          role="tablist"
          aria-label={`Abas de ${titulo}`}
          className="flex gap-1 mt-5 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          {abas.map((aba) => {
            const ativa = aba.id === abaAtiva
            return (
              <Link
                key={aba.id}
                role="tab"
                aria-selected={ativa}
                href={aba.href}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2"
                style={
                  ativa
                    ? { borderColor: 'var(--brick)', color: 'var(--ink)' }
                    : { borderColor: 'transparent', color: 'var(--ink-3)' }
                }
              >
                {aba.label}
                {typeof aba.badge === 'number' && aba.badge > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: ativa ? 'var(--brick)' : 'var(--bg-3)',
                      color: ativa ? 'var(--brick-ink)' : 'var(--ink-2)',
                    }}
                  >
                    {aba.badge > 99 ? '99+' : aba.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
