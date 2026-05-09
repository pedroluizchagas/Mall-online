import { formatarReais } from '@mallora/lib'
import { Card } from '@/components/ui/card'

const LABELS_BILLING: Record<string, string> = {
  trial: 'Período de teste',
  ativa: 'Ativa',
  em_atraso: 'Pagamento em atraso',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
}

const CORES_BILLING: Record<string, { bg: string; color: string }> = {
  trial: { bg: '#dbeafe', color: '#1e40af' },
  ativa: { bg: '#dcfce7', color: '#166534' },
  em_atraso: { bg: '#fef3c7', color: '#92400e' },
  cancelada: { bg: '#fee2e2', color: '#991b1b' },
  suspensa: { bg: 'var(--bg-2)', color: 'var(--ink-3)' },
}

interface Props {
  assinatura: any
  linkPortal: string | null
}

export function AbaAssinatura({ assinatura, linkPortal }: Props) {
  const plano = assinatura?.plans

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-ink">{plano?.nome ?? 'Plano atual'}</h2>
          {plano?.preco_mensal && (
            <p className="text-sm text-ink-3 mt-0.5">
              {formatarReais(plano.preco_mensal)} / mês
            </p>
          )}
        </div>
        {assinatura?.billing_status && (() => {
          const cor = CORES_BILLING[assinatura.billing_status]
          return (
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={cor}
            >
              {LABELS_BILLING[assinatura.billing_status]}
            </span>
          )
        })()}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        {[
          { label: 'Lojas', val: plano?.max_lojas ?? '—' },
          { label: 'Produtos', val: plano?.max_produtos ?? '—' },
          { label: 'Controle de estoque', val: plano?.tem_estoque ? 'Incluído' : 'Não incluído' },
          { label: 'Antecipação de repasse', val: plano?.tem_antecipacao ? 'Incluído' : 'Não incluído' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--bg-2)' }}>
            <p className="text-ink-3 text-xs">{item.label}</p>
            <p className="font-medium text-ink mt-0.5">{item.val}</p>
          </div>
        ))}
      </div>

      {assinatura?.billing_status === 'trial' && assinatura.trial_termina_em && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: '#dbeafe', border: '1px solid #bfdbfe' }}
        >
          <p className="text-sm" style={{ color: '#1e40af' }}>
            Período de teste até{' '}
            {new Date(assinatura.trial_termina_em).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      {assinatura?.periodo_fim && assinatura.billing_status === 'ativa' && (
        <p className="text-xs text-ink-3 mb-4">
          Próxima cobrança em{' '}
          {new Date(assinatura.periodo_fim).toLocaleDateString('pt-BR')}
        </p>
      )}

      {linkPortal && (
        <a
          href={linkPortal}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          Gerenciar assinatura
        </a>
      )}
    </Card>
  )
}
