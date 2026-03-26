'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallora/lib'
import { solicitarAntecipacao } from '@/lib/actions/financeiro'

interface Elegibilidade {
  elegivel: boolean
  motivo: string | null
  pedidos: number
  valor_bruto: number
  taxa: number
  valor_liquido: number
}

export function CardAntecipacao({ elegibilidade }: { elegibilidade: Elegibilidade }) {
  const [confirmando, setConfirmando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSolicitar() {
    setErro(null)
    startTransition(async () => {
      const resultado = await solicitarAntecipacao()
      if (resultado.erro) {
        setErro(resultado.erro)
      } else {
        setSucesso(true)
        setConfirmando(false)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-[#1A4D3A] mb-1">
        Antecipar repasse
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Receba em D+2 em vez de D+7. Taxa de R$0,75 por pedido.
      </p>

      {sucesso ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            Antecipação solicitada com sucesso.
          </p>
          <p className="text-xs text-green-600 mt-1">
            O repasse será processado no próximo ciclo (D+2).
          </p>
        </div>
      ) : !elegibilidade.elegivel ? (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">{elegibilidade.motivo}</p>
        </div>
      ) : !confirmando ? (
        <div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pedidos elegíveis</span>
              <span className="font-medium">{elegibilidade.pedidos}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor bruto</span>
              <span className="font-medium">
                {formatarReais(elegibilidade.valor_bruto)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxa de antecipação</span>
              <span className="font-medium text-amber-600">
                -{formatarReais(elegibilidade.taxa)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
              <span>Você recebe</span>
              <span className="text-[#1A4D3A]">
                {formatarReais(elegibilidade.valor_liquido)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setConfirmando(true)}
            className="w-full bg-[#F5A623] text-white py-2.5 rounded-lg text-sm
              font-medium hover:bg-[#e09520] transition-colors"
          >
            Solicitar antecipação
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700 mb-4">
            Confirma a antecipação de {formatarReais(elegibilidade.valor_liquido)}
            {' '}com desconto de {formatarReais(elegibilidade.taxa)}?
          </p>

          {erro && (
            <p className="text-sm text-red-600 mb-3">{erro}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              disabled={isPending}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSolicitar}
              disabled={isPending}
              className="flex-1 py-2 bg-[#F5A623] text-white rounded-lg text-sm
                font-medium disabled:opacity-50"
            >
              {isPending ? 'Aguarde...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
