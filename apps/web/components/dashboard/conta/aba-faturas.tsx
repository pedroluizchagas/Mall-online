import { FileText } from 'lucide-react'
import { formatarReais } from '@mallevo/lib'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'

interface Props {
  faturas: any[]
}

export function AbaFaturas({ faturas }: Props) {
  if (faturas.length === 0) {
    return (
      <Card>
        <EmptyState
          icone={FileText}
          titulo="Nenhuma fatura ainda"
          descricao="Quando suas mensalidades forem geradas, elas aparecerão aqui com link para PDF."
        />
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="font-semibold text-ink mb-4">Faturas</h2>
      <div className="space-y-2">
        {faturas.map((fatura) => (
          <div
            key={fatura.id}
            className="flex items-center justify-between p-3 rounded-xl text-sm"
            style={{ background: 'var(--bg-2)' }}
          >
            <div>
              <p className="font-medium text-ink">
                {fatura.numero ?? fatura.id.slice(0, 12)}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                {fatura.data}
                {fatura.periodo_inicio && fatura.periodo_fim && (
                  <> · {fatura.periodo_inicio} a {fatura.periodo_fim}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={
                  fatura.status === 'paid'
                    ? { background: '#dcfce7', color: '#166534' }
                    : { background: '#fee2e2', color: '#991b1b' }
                }
              >
                {fatura.status === 'paid' ? 'Pago' : 'Pendente'}
              </span>
              <span className="font-semibold text-ink">{formatarReais(fatura.valor)}</span>
              {fatura.pdf_url && (
                <a
                  href={fatura.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium underline"
                  style={{ color: 'var(--brick-dk)' }}
                >
                  PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
