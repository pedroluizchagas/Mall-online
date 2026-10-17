import type { ReactNode } from 'react'

/**
 * Cabeçalho de módulo — o letreiro do corredor de serviço (o mesmo do painel
 * web): sobrelinha micro, título em Jakarta com tracking fechado, subtítulo e
 * as ações à direita, que quebram para baixo do título em vez de espremê-lo.
 */
export function PageHeader({
  titulo,
  subtitulo,
  sobrelinha,
  acoes,
}: {
  titulo: string
  subtitulo?: ReactNode
  /** Micro em caixa alta acima do título (o "corredor" do módulo). */
  sobrelinha?: string
  acoes?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-8">
      <div className="min-w-[240px] flex-1">
        {sobrelinha && <p className="micro mb-3 text-ink-3">{sobrelinha}</p>}
        <h1 className="m-0 text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[38px]">{titulo}</h1>
        {subtitulo && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-3">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{acoes}</div>}
    </header>
  )
}
