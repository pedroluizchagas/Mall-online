import { formatarReais } from '@mallora/lib'

const LABELS_STATUS: Record<string, string> = {
  agendado: 'Agendado',
  processando: 'Processando',
  concluido: 'Concluído',
  falhou: 'Falhou',
}

const CORES_STATUS: Record<string, string> = {
  agendado: 'bg-amber-100 text-amber-700',
  processando: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  falhou: 'bg-red-100 text-red-700',
}

interface Props {
  repasses: any[]
  totalPendente: number
  totalRecebido: number
}

export function ListaRepasses({ repasses, totalPendente, totalRecebido }: Props) {
  return (
    <div>
      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-600 mb-1">A receber</p>
          <p className="text-lg font-bold text-amber-800">
            {formatarReais(totalPendente)}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-xs text-green-600 mb-1">Já recebido</p>
          <p className="text-lg font-bold text-green-800">
            {formatarReais(totalRecebido)}
          </p>
        </div>
      </div>

      {/* Tabela de repasses */}
      {repasses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Nenhum repasse registrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {repasses.map((repasse) => (
            <div
              key={repasse.id}
              className="flex items-center justify-between p-3
                bg-gray-50 rounded-xl text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${CORES_STATUS[repasse.status]}`}
                  >
                    {LABELS_STATUS[repasse.status]}
                  </span>
                  {repasse.antecipado && (
                    <span className="text-xs bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded-full">
                      Antecipado
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {repasse.total_pedidos} pedidos ·{' '}
                  Previsto para{' '}
                  {new Date(repasse.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
                {repasse.taxa_antecipacao > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Taxa antecipação: -{formatarReais(repasse.taxa_antecipacao)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1A4D3A]">
                  {formatarReais(repasse.valor_liquido)}
                </p>
                {repasse.stripe_transfer_id && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {repasse.stripe_transfer_id.slice(0, 12)}...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
