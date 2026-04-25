'use client'

import type { DadosOnboarding } from '../page'
import { ShieldCheck, Zap, Lock, Store, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

interface Props {
  carregando: boolean
  onFinalizar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

export function EtapaConfigurarRecebimentos({ carregando, onFinalizar, onVoltar }: Props) {
  return (
    <div className="w-full">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
          Configurar Recebimentos
        </h2>
        <p className="text-zinc-500 text-lg">
          Último passo! Configure sua conta para começar a vender.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-8 mb-8 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#C1F148]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Redirecionamento para a Stripe</h3>
            <p className="text-zinc-500 leading-relaxed">
              Você será redirecionado com segurança para a Stripe, nossa parceira global de pagamentos, para configurar seus dados bancários.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Segurança de nível bancário</h3>
            <p className="text-zinc-500 leading-relaxed">
              Seus dados são criptografados e armazenados com segurança. Nós nunca teremos acesso direto às suas informações bancárias.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Processo rápido e simples</h3>
            <p className="text-zinc-500 leading-relaxed">
              O processo leva cerca de 5 minutos. Tenha em mãos seus documentos de identificação e dados da conta bancária.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
            <Store className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Pronto para vender hoje mesmo</h3>
            <p className="text-zinc-500 leading-relaxed">
              Após a verificação pela Stripe, sua loja estará imediatamente pronta para processar pagamentos e gerar vendas.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onVoltar}
          disabled={carregando}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-zinc-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <button
          type="button"
          onClick={() => onFinalizar({})}
          disabled={carregando}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C1F148]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {carregando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
              Configurando...
            </>
          ) : (
            <>
              Concluir e ir para a Stripe
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
