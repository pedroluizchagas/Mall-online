import { formatarReais } from '@mallora/lib'
import { Card } from '@/components/ui/card'

interface Props {
  saldo: { disponivel: number; pendente: number } | null
  linkExpress: string | null
}

export function CardSaldoStripe({ saldo, linkExpress }: Props) {
  if (!saldo) {
    return (
      <Card>
        <h3 className="font-semibold text-ink mb-2">Conta de recebimentos</h3>
        <p className="text-sm text-ink-3">Configure sua conta Stripe para ver o saldo.</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-semibold text-ink mb-4">Conta de recebimentos</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-3">Disponível para saque</span>
          <span className="text-lg font-bold text-ink">
            {formatarReais(saldo.disponivel)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-3">Pendente de liberação</span>
          <span className="text-base font-medium text-ink-2">
            {formatarReais(saldo.pendente)}
          </span>
        </div>
      </div>

      {linkExpress && (
        <a
          href={linkExpress}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          Acessar conta e sacar
        </a>
      )}

      <p className="text-xs text-ink-3 mt-2 text-center">
        Saques processados pelo Stripe — dados bancários gerenciados com segurança.
      </p>
    </Card>
  )
}
