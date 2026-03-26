import { getDadosAssinatura, getFaturas, getLinkPortalAssinatura } from '@/lib/actions/assinatura'
import { formatarReais } from '@mallora/lib'

const LABELS_BILLING: Record<string, string> = {
  trial: 'Período de teste',
  ativa: 'Ativa',
  em_atraso: 'Pagamento em atraso',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
}

const CORES_BILLING: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  ativa: 'bg-green-100 text-green-700',
  em_atraso: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-red-100 text-red-700',
  suspensa: 'bg-gray-100 text-gray-700',
}

export default async function PaginaAssinatura() {
  const [{ assinatura }, faturas, linkPortal] = await Promise.all([
    getDadosAssinatura(),
    getFaturas(),
    getLinkPortalAssinatura(),
  ])

  const plano = assinatura?.plans as any

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Assinatura</h1>

      {/* Card do plano atual */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              {plano?.nome ?? 'Plano atual'}
            </h2>
            {plano?.preco_mensal && (
              <p className="text-sm text-gray-500 mt-0.5">
                {formatarReais(plano.preco_mensal)} / mês
              </p>
            )}
          </div>
          {assinatura?.billing_status && (
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium
                ${CORES_BILLING[assinatura.billing_status]}`}
            >
              {LABELS_BILLING[assinatura.billing_status]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Lojas</p>
            <p className="font-medium mt-0.5">{plano?.max_lojas ?? '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Produtos</p>
            <p className="font-medium mt-0.5">{plano?.max_produtos ?? '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Controle de estoque</p>
            <p className="font-medium mt-0.5">
              {plano?.tem_estoque ? 'Incluído' : 'Não incluído'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Antecipação de repasse</p>
            <p className="font-medium mt-0.5">
              {plano?.tem_antecipacao ? 'Incluído' : 'Não incluído'}
            </p>
          </div>
        </div>

        {assinatura?.billing_status === 'trial' && assinatura.trial_termina_em && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              Período de teste até{' '}
              {new Date(assinatura.trial_termina_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {assinatura?.periodo_fim && assinatura.billing_status === 'ativa' && (
          <p className="text-xs text-gray-400 mb-4">
            Próxima cobrança em{' '}
            {new Date(assinatura.periodo_fim).toLocaleDateString('pt-BR')}
          </p>
        )}

        {linkPortal && (
          <a
            href={linkPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-[#1A4D3A] text-[#1A4D3A]
              py-2.5 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
          >
            Gerenciar assinatura
          </a>
        )}
      </div>

      {/* Histórico de faturas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Faturas</h2>

        {faturas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="space-y-2">
            {faturas.map((fatura) => (
              <div
                key={fatura.id}
                className="flex items-center justify-between p-3
                  bg-gray-50 rounded-xl text-sm"
              >
                <div>
                  <p className="font-medium text-gray-700">
                    {fatura.numero ?? fatura.id.slice(0, 12)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fatura.data}
                    {fatura.periodo_inicio && fatura.periodo_fim && (
                      <> · {fatura.periodo_inicio} a {fatura.periodo_fim}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      fatura.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {fatura.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  <span className="font-semibold text-[#1A4D3A]">
                    {formatarReais(fatura.valor)}
                  </span>
                  {fatura.pdf_url && (
                    <a
                      href={fatura.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#4CAF82] underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
