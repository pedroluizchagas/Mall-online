import { formatarReais } from '@mallora/lib'
import { Card } from '@/components/ui/card'

const META: Record<string, { label: string; bg: string; color: string }> = {
  agendado: { label: 'Agendado', bg: '#fbe8a0', color: '#8a6a00' },
  processando: { label: 'Processando', bg: '#d1e1f5', color: '#2a4d7a' },
  concluido: { label: 'Concluído', bg: '#dff0cc', color: '#2a6e1a' },
  falhou: { label: 'Falhou', bg: '#fbd9cf', color: '#a83820' },
}

interface Props {
  repasses: any[]
  totalPendente: number
  totalRecebido: number
}

export function ListaRepasses({ repasses, totalPendente, totalRecebido }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card style={{ background: 'var(--bg-2)' }}>
          <p className="text-xs text-ink-3 mb-1">A receber</p>
          <p className="font-display text-[22px] text-ink tracking-tight">
            {formatarReais(totalPendente)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-3 mb-1">Já recebido</p>
          <p className="font-display text-[22px] text-ink tracking-tight">
            {formatarReais(totalRecebido)}
          </p>
        </Card>
      </div>

      {repasses.length === 0 ? (
        <p className="text-sm text-ink-3 text-center py-6">
          Nenhum repasse registrado ainda.
        </p>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div
            className="grid items-center px-[18px] py-2.5 border-b text-[11px] font-medium uppercase tracking-wider text-ink-3"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 12,
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
            }}
          >
            <div>Data prevista</div>
            <div>Pedidos</div>
            <div>Status</div>
            <div className="text-right">Líquido</div>
          </div>
          {repasses.map((r, i) => {
            const meta = META[r.status] ?? { label: r.status, bg: '#eee', color: '#888' }
            return (
              <div
                key={r.id}
                className={`grid items-center px-[18px] py-3.5 ${i < repasses.length - 1 ? 'border-b border-line' : ''}`}
                style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}
              >
                <div className="text-[13px] font-medium">
                  {new Date(r.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div className="text-[13px] text-ink-2">{r.total_pedidos}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {r.antecipado && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                    >
                      D+2
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold">
                    {formatarReais(r.valor_liquido)}
                  </div>
                  {r.taxa_antecipacao > 0 && (
                    <div className="text-[10px] text-ink-3">
                      taxa −{formatarReais(r.taxa_antecipacao)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
