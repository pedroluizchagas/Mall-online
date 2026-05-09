import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateCTA {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  icone: LucideIcon
  titulo: string
  descricao?: string
  cta?: EmptyStateCTA
  cta2?: EmptyStateCTA
}

const CLASSE_BOTAO =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold transition-colors'
const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)' }
const ESTILO_SECUNDARIO = { background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)' }

function BotaoCTA({ cta, variante }: { cta: EmptyStateCTA; variante: 'primaria' | 'secundaria' }) {
  const estilo = variante === 'primaria' ? ESTILO_PRIMARIO : ESTILO_SECUNDARIO
  return cta.href ? (
    <Link href={cta.href} className={CLASSE_BOTAO} style={estilo}>{cta.label}</Link>
  ) : (
    <button type="button" onClick={cta.onClick} className={CLASSE_BOTAO} style={estilo}>{cta.label}</button>
  )
}

export function EmptyState({ icone: Icone, titulo, descricao, cta, cta2 }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-2)' }}
      >
        <Icone className="w-6 h-6" style={{ color: 'var(--ink-3)' }} />
      </div>
      <h2 className="font-display text-[20px] leading-tight mb-1.5">{titulo}</h2>
      {descricao && (
        <p className="text-ink-3 text-sm max-w-md leading-relaxed mb-5">{descricao}</p>
      )}
      {(cta || cta2) && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {cta && <BotaoCTA cta={cta} variante="primaria" />}
          {cta2 && <BotaoCTA cta={cta2} variante="secundaria" />}
        </div>
      )}
    </div>
  )
}
