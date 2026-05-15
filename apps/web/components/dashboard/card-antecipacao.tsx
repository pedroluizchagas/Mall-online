'use client'

import { useState, useTransition } from 'react'
import { Zap } from 'lucide-react'
import { formatarReais } from '@mallevo/lib'
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
    startTransition(() => {
      void solicitarAntecipacao().then((r) => {
        if (r.erro) setErro(r.erro)
        else {
          setSucesso(true)
          setConfirmando(false)
        }
      })
    })
  }

  return (
    <div
      className="rounded-lg p-[18px] relative overflow-hidden"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
    >
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'var(--brick)', opacity: 0.2, filter: 'blur(30px)' }}
      />
      <div className="relative">
        <div
          className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1.5"
          style={{ opacity: 0.6 }}
        >
          <Zap className="w-3 h-3" />
          Antecipação inteligente
        </div>
        <h3
          className="font-display mt-2"
          style={{ fontSize: 24, lineHeight: 1.15 }}
        >
          Receba em <span style={{ color: 'var(--brick-lt)' }}>2 dias</span>, não em 7.
        </h3>
        <div className="text-xs mt-1.5 leading-relaxed" style={{ opacity: 0.7 }}>
          Escolha quais repasses antecipar. Taxa transparente de R$ 0,75 por pedido — sem surpresa.
        </div>

        {sucesso ? (
          <div
            className="mt-5 p-3.5 rounded-md text-[13px]"
            style={{ background: 'rgba(192, 241, 72, 0.15)', border: '1px solid var(--brick)' }}
          >
            Antecipação solicitada. Será processada em D+2.
          </div>
        ) : !elegibilidade.elegivel ? (
          <div
            className="mt-5 p-3.5 rounded-md text-[13px]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {elegibilidade.motivo}
          </div>
        ) : (
          <>
            <div
              className="mt-5 p-3.5 rounded-md"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex justify-between text-xs" style={{ opacity: 0.8 }}>
                <span>{elegibilidade.pedidos} pedidos × R$ 0,75</span>
                <span>− {formatarReais(elegibilidade.taxa)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ opacity: 0.8 }}>
                <span>Valor total</span>
                <span>{formatarReais(elegibilidade.valor_bruto)}</span>
              </div>
              <div
                className="my-2.5"
                style={{ height: 1, background: 'rgba(255,255,255,0.15)' }}
              />
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium">Líquido em 2 dias</span>
                <span className="text-xl font-semibold" style={{ color: 'var(--brick-lt)' }}>
                  {formatarReais(elegibilidade.valor_liquido)}
                </span>
              </div>
            </div>

            {erro && <div className="text-[12px] text-err mt-3">{erro}</div>}

            {!confirmando ? (
              <button
                onClick={() => setConfirmando(true)}
                className="mt-3.5 w-full py-3 rounded-md text-sm font-bold transition-colors"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                Solicitar antecipação
              </button>
            ) : (
              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={() => setConfirmando(false)}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-md text-sm font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'var(--bg)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSolicitar}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-md text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                >
                  {isPending ? 'Aguarde...' : 'Confirmar'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
