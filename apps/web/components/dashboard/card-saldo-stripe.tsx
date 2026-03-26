import { formatarReais } from '@mallora/lib'

interface Props {
  saldo: { disponivel: number; pendente: number } | null
  linkExpress: string | null
}

export function CardSaldoStripe({ saldo, linkExpress }: Props) {
  if (!saldo) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-[#1A4D3A] mb-2">
          Conta de recebimentos
        </h3>
        <p className="text-sm text-gray-400">
          Configure sua conta Stripe para ver o saldo.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-[#1A4D3A] mb-4">
        Conta de recebimentos
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Disponível para saque</span>
          <span className="text-lg font-bold text-[#1A4D3A]">
            {formatarReais(saldo.disponivel)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Pendente de liberação</span>
          <span className="text-base font-medium text-gray-600">
            {formatarReais(saldo.pendente)}
          </span>
        </div>
      </div>

      {linkExpress && (
        <a
          href={linkExpress}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center bg-[#1A4D3A] text-white
            py-2.5 rounded-lg text-sm font-medium hover:bg-[#163d2e] transition-colors"
        >
          Acessar conta e sacar
        </a>
      )}

      <p className="text-xs text-gray-400 mt-2 text-center">
        Saques processados pelo Stripe — dados bancários gerenciados com segurança.
      </p>
    </div>
  )
}
