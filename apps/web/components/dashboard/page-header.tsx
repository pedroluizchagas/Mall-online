import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

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
  /** Micro em caixa alta acima do título (o "corredor" do módulo). */
  sobrelinha?: string
  acoes?: ReactNode
  abas?: AbaDef[]
  abaAtiva?: string
  badgeCabecalho?: { texto: string; cor: CorBadge }
}

const CORES_BADGE: Record<CorBadge, { bg: string; fg: string }> = {
  ok: { bg: 'var(--ok-lt)', fg: 'var(--ok)' },
  warn: { bg: 'var(--warn-lt)', fg: 'var(--warn)' },
  err: { bg: 'var(--err-lt)', fg: 'var(--err)' },
  info: { bg: 'var(--sky-lt)', fg: 'var(--sky)' },
}

/**
 * Cabeçalho de módulo — o letreiro do corredor de serviço: sobrelinha micro,
 * título em Jakarta com tracking fechado, subtítulo, ações à direita e as
 * abas em pílula (a ativa é tinta, como os chips do app).
 */
export function PageHeader({ titulo, subtitulo, sobrelinha, acoes, abas, abaAtiva, badgeCabecalho }: PageHeaderProps) {
  const cores = badgeCabecalho ? CORES_BADGE[badgeCabecalho.cor] : null

  return (
    <header className="mb-8">
      {/* Ações largas quebram para baixo do título em vez de espremê-lo. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-8">
        <div className="min-w-[240px] flex-1">
          {sobrelinha && <p className="micro mb-3 text-ink-3">{sobrelinha}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[38px]">
              {titulo}
            </h1>
            {badgeCabecalho && cores && (
              <span
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold"
                style={{ background: cores.bg, color: cores.fg }}
              >
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: cores.fg }} />
                {badgeCabecalho.texto}
              </span>
            )}
          </div>
          {subtitulo && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-3">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{acoes}</div>}
      </div>

      {abas && abas.length > 0 && (
        <nav
          role="tablist"
          aria-label={`Abas de ${titulo}`}
          className="-m-1 mt-5 flex gap-1 overflow-x-auto p-1"
        >
          {abas.map((aba) => {
            const ativa = aba.id === abaAtiva
            return (
              <Link
                key={aba.id}
                role="tab"
                aria-selected={ativa}
                href={aba.href}
                className={cx(
                  'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition-colors duration-200',
                  ativa ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg hover:text-ink',
                )}
              >
                {aba.label}
                {typeof aba.badge === 'number' && aba.badge > 0 && (
                  <span
                    className={cx(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                      ativa ? 'bg-brick text-brick-ink' : 'bg-bg-3 text-ink-2',
                    )}
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
