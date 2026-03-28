interface Props {
  tenant: {
    stripe_account_id: string | null
    stripe_onboarding_ok: boolean
  }
  linkExpress: string | null
}

export function AbaStripe({ tenant, linkExpress }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">
          Conta de recebimentos
        </h2>
        <p className="text-sm text-gray-500">
          Sua conta Stripe Express para receber os repasses da plataforma.
        </p>
      </div>

      {/* Status do onboarding */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            tenant.stripe_onboarding_ok ? 'bg-green-500' : 'bg-amber-400'
          }`}
        />
        <div>
          <p className="text-sm font-medium text-gray-700">
            {tenant.stripe_onboarding_ok
              ? 'Conta verificada e ativa'
              : 'Verificação pendente'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {tenant.stripe_onboarding_ok
              ? 'Você está pronto para receber repasses.'
              : 'Complete o cadastro para receber pagamentos.'}
          </p>
        </div>
      </div>

      {/* ID da conta (para suporte) */}
      {tenant.stripe_account_id && (
        <div>
          <p className="text-xs text-gray-400 mb-1">ID da conta Stripe</p>
          <p className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2
            rounded-lg">
            {tenant.stripe_account_id}
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="space-y-2">
        {!tenant.stripe_onboarding_ok && (
          <a
            href="/onboarding/stripe/retry"
            className="block w-full text-center bg-[#F5A623] text-white py-2.5
              rounded-lg text-sm font-medium hover:bg-[#e09520] transition-colors"
          >
            Completar verificação
          </a>
        )}

        {tenant.stripe_onboarding_ok && linkExpress && (
          <a
            href={linkExpress}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[#1A4D3A] text-white py-2.5
              rounded-lg text-sm font-medium hover:bg-[#163d2e] transition-colors"
          >
            Acessar conta Stripe
          </a>
        )}
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>
          Seus dados bancários são armazenados com segurança pela Stripe.
          A plataforma não tem acesso aos dados da sua conta bancária.
        </p>
        <p>
          Para suporte relacionado a pagamentos, acesse o Stripe Express
          Dashboard ou entre em contato com o suporte da plataforma.
        </p>
      </div>
    </div>
  )
}
