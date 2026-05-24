'use client'

import {
  timelineDoStatus,
  type IconeStatus,
  type PassoTimeline,
} from '@/lib/status-pedido'

/**
 * OrderStatusTimeline — UI pura da timeline do pedido (Stage 3f).
 * Espelha o `PassoTimeline` interno de
 * apps/mobile-consumer/app/pedido/[id].tsx (concluído/atual/pendente).
 */
export function OrderStatusTimeline({ statusAtual }: { statusAtual: string }) {
  const passos = timelineDoStatus(statusAtual)
  if (statusAtual === 'cancelado') return null

  return (
    <div>
      {passos.map((passo, i) => (
        <PassoLinha
          key={passo.meta.status}
          passo={passo}
          ultimo={i === passos.length - 1}
        />
      ))}
    </div>
  )
}

function PassoLinha({
  passo,
  ultimo,
}: {
  passo: PassoTimeline
  ultimo: boolean
}) {
  const { meta, estado } = passo
  const concluido = estado === 'concluido'
  const atual = estado === 'atual'

  const circuloClasse = concluido
    ? 'bg-accent text-ink'
    : atual
    ? `${corBg(meta.cor)} text-white`
    : 'bg-canvasAlt text-ink-soft'
  const linhaClasse = concluido ? 'bg-accent' : 'bg-line'
  const tituloClasse =
    estado === 'pendente'
      ? 'text-ink-soft font-medium'
      : atual
      ? 'text-ink font-extrabold'
      : 'text-ink font-bold'

  return (
    <div className="flex gap-3.5">
      <div className="flex w-8 flex-col items-center">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${circuloClasse} ${
            atual ? 'scale-105' : ''
          }`}
        >
          <IconeStatusSvg nome={concluido ? 'check-circle' : meta.icone} />
        </span>
        {!ultimo && (
          <span className={`mt-1 min-h-6 w-0.5 flex-1 ${linhaClasse}`} />
        )}
      </div>

      <div className={`flex-1 ${ultimo ? '' : 'pb-4'}`}>
        <p className={`text-sm ${tituloClasse}`}>{meta.rotuloLongo}</p>
        {atual && (
          <p className="mt-0.5 text-xs font-medium text-ink-muted">
            {meta.descricao}
          </p>
        )}
      </div>
    </div>
  )
}

function corBg(cor: PassoTimeline['meta']['cor']): string {
  return cor === 'warning'
    ? 'bg-warning'
    : cor === 'info'
    ? 'bg-info'
    : cor === 'success'
    ? 'bg-success'
    : cor === 'danger'
    ? 'bg-danger'
    : 'bg-accent'
}

export function IconeStatusSvg({
  nome,
  size = 16,
  strokeWidth = 2.2,
}: {
  nome: IconeStatus
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {nome === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </>
      )}
      {nome === 'check-circle' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
      )}
      {nome === 'chef' && (
        <>
          <path d="M7 14h10v6H7zM7 14a4 4 0 1 1 1.5-7.7A3.5 3.5 0 0 1 15 6a3.5 3.5 0 0 1 2 7.3" />
        </>
      )}
      {nome === 'bike' && (
        <>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l4-7h4l3 7M14 5h3l1 3" />
        </>
      )}
      {nome === 'truck' && (
        <>
          <rect x="2" y="7" width="12" height="9" rx="1" />
          <path d="M14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </>
      )}
      {nome === 'close-circle' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </>
      )}
    </svg>
  )
}
