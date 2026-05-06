import { formatarReais } from '@mallora/lib'
import { Card } from '@/components/ui/card'

interface Props {
  saldo: { available: number; waiting_funds: number; transferred: number } | null
}

export function CardSaldoPagarme({ saldo }: Props) {
  if (!saldo) {
    return (
      <Card>
        <h3 className="font-semibold text-ink mb-2">Conta de recebimentos</h3>
        <p className="text-sm text-ink-3">
          Conclua a verificação Pagar.me para ver o saldo da sua conta.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-semibold text-ink mb-4">Conta de recebimentos</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-3">Disponível</span>
          <span className="text-lg font-bold text-ink">
            {formatarReais(saldo.available)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-3">A receber</span>
          <span className="text-base font-medium text-ink-2">
            {formatarReais(saldo.waiting_funds)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-3">Já transferido</span>
          <span className="text-base font-medium text-ink-2">
            {formatarReais(saldo.transferred)}
          </span>
        </div>
      </div>

      <p className="text-xs text-ink-3 mt-4 text-center">
        Saldo gerenciado pelo Pagar.me — repasses seguem o cronograma do recebedor.
      </p>
    </Card>
  )
}
