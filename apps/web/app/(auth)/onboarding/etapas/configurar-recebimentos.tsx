'use client'

import type { DadosOnboarding } from '../page'

interface Props {
  carregando: boolean
  onFinalizar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

const passos = [
  {
    titulo: 'Redirecionamento para a Stripe',
    descricao: 'Você será redirecionado para a Stripe, nossa parceira de pagamentos, para configurar seus dados bancários.',
  },
  {
    titulo: 'Processo rápido',
    descricao: 'O processo leva cerca de 5 minutos. Tenha em mãos seus dados bancários e documentos.',
  },
  {
    titulo: 'Segurança garantida',
    descricao: 'Seus dados bancários são armazenados com segurança pela Stripe. Não temos acesso a eles.',
  },
  {
    titulo: 'Pronto para vender',
    descricao: 'Após a configuração, você estará pronto para receber pagamentos dos seus clientes.',
  },
]

export function EtapaConfigurarRecebimentos({ carregando, onFinalizar, onVoltar }: Props) {
  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-brand-800 tracking-tight">
          Configurar recebimentos
        </h2>
        <p className="text-gray-400 text-sm mt-1.5">
          Último passo — configure sua conta para receber pagamentos
        </p>
      </div>

      {/* Passos Stripe */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 mb-5 space-y-5">
        {passos.map((passo, i) => (
          <div key={passo.titulo} className="flex items-start gap-4">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
              style={{ background: 'rgba(76,175,130,0.10)', color: '#2d8a60' }}
            >
              {i + 1}
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm leading-none mb-1">{passo.titulo}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{passo.descricao}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Selo segurança */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span className="text-xs text-gray-400">Processado com segurança via Stripe</span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onVoltar}
          disabled={carregando}
          className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 text-sm"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => onFinalizar({})}
          disabled={carregando}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {carregando ? (
            <>
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Configurando...
            </>
          ) : 'Configurar conta de recebimentos'}
        </button>
      </div>
    </div>
  )
}
