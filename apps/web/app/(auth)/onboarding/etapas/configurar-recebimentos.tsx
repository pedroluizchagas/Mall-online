'use client'

import type { DadosOnboarding } from '../page'

interface Props {
  carregando: boolean
  onFinalizar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

export function EtapaConfigurarRecebimentos({ carregando, onFinalizar, onVoltar }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A4D3A] mb-1">
        Configurar recebimentos
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Configure sua conta para receber pagamentos
      </p>

      <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4CAF82]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#4CAF82] text-sm font-bold">1</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">Redirecionamento para a Stripe</p>
            <p className="text-sm text-gray-500">
              Você será redirecionado para a Stripe, nossa parceira de pagamentos, para configurar seus dados bancários.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4CAF82]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#4CAF82] text-sm font-bold">2</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">Processo rápido</p>
            <p className="text-sm text-gray-500">
              O processo leva cerca de 5 minutos. Tenha em mãos seus dados bancários e documentos.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4CAF82]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#4CAF82] text-sm font-bold">3</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">Segurança garantida</p>
            <p className="text-sm text-gray-500">
              Seus dados bancários são armazenados com segurança pela Stripe. Não temos acesso a eles.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4CAF82]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#4CAF82] text-sm font-bold">4</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">Pronto para vender</p>
            <p className="text-sm text-gray-500">
              Após a configuração, você estará pronto para receber pagamentos dos seus clientes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onVoltar}
          disabled={carregando}
          className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => onFinalizar({})}
          disabled={carregando}
          className="flex-1 bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors disabled:opacity-50"
        >
          {carregando ? 'Configurando...' : 'Configurar conta de recebimentos'}
        </button>
      </div>
    </div>
  )
}
