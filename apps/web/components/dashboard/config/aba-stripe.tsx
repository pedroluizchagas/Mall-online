interface Props {
  tenant: {
    stripe_account_id: string | null
    stripe_onboarding_ok: boolean
  }
  linkExpress: string | null
}

export function AbaStripe({ tenant, linkExpress }: Props) {
  return (
    <div
      className="rounded-xl p-5 space-y-6"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <div>
        <h2 className="font-semibold text-ink mb-1">Conta de recebimentos</h2>
        <p className="text-sm text-ink-3">
          Sua conta Stripe Express para receber os repasses da plataforma.
        </p>
      </div>

      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: 'var(--bg-2)' }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: tenant.stripe_onboarding_ok ? 'var(--ok)' : 'var(--warn)' }}
        />
        <div>
          <p className="text-sm font-medium text-ink">
            {tenant.stripe_onboarding_ok ? 'Conta verificada e ativa' : 'Verificação pendente'}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">
            {tenant.stripe_onboarding_ok
              ? 'Você está pronto para receber repasses.'
              : 'Complete o cadastro para receber pagamentos.'}
          </p>
        </div>
      </div>

      {tenant.stripe_account_id && (
        <div>
          <p className="text-xs text-ink-3 mb-1">ID da conta Stripe</p>
          <p
            className="text-sm font-mono px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
          >
            {tenant.stripe_account_id}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {!tenant.stripe_onboarding_ok && (
          <a
            href="/onboarding/stripe/retry"
            className="block w-full text-center py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            Completar verificação
          </a>
        )}

        {tenant.stripe_onboarding_ok && linkExpress && (
          <a
            href={linkExpress}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}
          >
            Acessar conta Stripe
          </a>
        )}
      </div>

      <div className="text-xs text-ink-3 space-y-1">
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
