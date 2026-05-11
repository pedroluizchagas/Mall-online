import { Phone, Bike } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AlternarAtivoButton } from './alternar-ativo-button'

export type CourierStatus = 'pendente' | 'aprovado' | 'reprovado' | 'suspenso'

export interface EntregadorItem {
  id: string
  nome: string
  telefone: string | null
  status: CourierStatus
  online: boolean
}

const ROTULOS_STATUS: Record<CourierStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Ativo',
  reprovado: 'Reprovado',
  suspenso: 'Inativo',
}

const ESTILOS_STATUS: Record<CourierStatus, { bg: string; fg: string; bd: string }> = {
  pendente: { bg: 'rgba(224,166,26,0.12)', fg: 'var(--warn)', bd: 'rgba(224,166,26,0.30)' },
  aprovado: { bg: 'rgba(79,176,37,0.10)', fg: 'var(--ok)', bd: 'rgba(79,176,37,0.25)' },
  reprovado: { bg: 'rgba(224,90,59,0.10)', fg: 'var(--err)', bd: 'rgba(224,90,59,0.28)' },
  suspenso: { bg: 'var(--bg-2)', fg: 'var(--ink-2)', bd: 'var(--line)' },
}

export function EntregadorCard({ entregador }: { entregador: EntregadorItem }) {
  const ativo = entregador.status === 'aprovado'
  const cores = ESTILOS_STATUS[entregador.status]

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-ink text-sm">{entregador.nome}</h3>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: cores.bg, color: cores.fg, border: `1px solid ${cores.bd}` }}
            >
              {ROTULOS_STATUS[entregador.status]}
            </span>
            {entregador.online && ativo && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: 'var(--ok)' }}
              >
                <Bike className="w-3 h-3" /> Online
              </span>
            )}
          </div>
          {entregador.telefone && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-3">
              <Phone className="w-3 h-3" />
              <span>{entregador.telefone}</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {(entregador.status === 'aprovado' || entregador.status === 'suspenso') && (
            <AlternarAtivoButton courierId={entregador.id} ativo={ativo} />
          )}
        </div>
      </div>
    </Card>
  )
}
