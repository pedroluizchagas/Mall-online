import { CORES_TOM, type MetaStatus } from '@/lib/status'

/**
 * Badge de status (soft 18% + texto no tom), o mesmo desenho do StatusPill do
 * painel web. `rotulo` dá contexto ao leitor de tela ("Assinatura: Ativa").
 */
export function BadgeStatus({ meta, contexto }: { meta: MetaStatus; contexto?: string }) {
  const cores = CORES_TOM[meta.tom]
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold leading-none"
      style={{ background: cores.fundo, color: cores.texto }}
      title={meta.rotulo}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: cores.texto }} />
      {contexto && <span className="sr-only">{contexto}: </span>}
      {/* Coluna estreita corta o rótulo em vez de invadir a vizinha. */}
      <span className="truncate">{meta.rotulo}</span>
    </span>
  )
}
