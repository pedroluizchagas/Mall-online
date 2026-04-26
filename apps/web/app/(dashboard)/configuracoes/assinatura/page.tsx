import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
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

export default async function PaginaAssinatura() {
  const [dadosAssinatura, faturas, linkPortal] = await Promise.all([
    getDadosAssinatura(),
    getFaturas(),
    getLinkPortalAssinatura(),
  ])

  const assinatura = dadosAssinatura.assinatura as any
  const plano = assinatura?.plans

  return (
    <div className="p-9 max-w-2xl space-y-6 slide-up">
      <h1 className="font-display text-[32px] leading-tight text-ink">Assinatura</h1>

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

      <Card>
        <h2 className="font-semibold text-ink mb-4">Faturas</h2>

        {faturas.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhuma fatura encontrada.</p>
        ) : (
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
        )}
      </Card>
    </div>
  )
}
