import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { money } from '@/lib/format'

interface Props {
  proximoValor: number
  proximaData: string
  banco?: string
  antecipacaoData?: string
  antecipacaoCusto?: number
  antecipacaoElegivel?: number
}

export function RepasseCard({
  proximoValor,
  proximaData,
  banco = '—',
  antecipacaoData,
  antecipacaoCusto,
  antecipacaoElegivel,
}: Props) {
  const valor = proximoValor.toFixed(2).replace('.', ',').split(',')
  return (
    <Card
      className="!p-[22px]"
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderColor: 'var(--ink)',
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h3
          className="m-0 text-base font-bold tracking-tight"
          style={{ color: 'var(--bg)' }}
        >
          Repasse
        </h3>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          D+7
        </span>
      </div>

      <div
        className="text-[10px] uppercase font-semibold tracking-wider"
        style={{ opacity: 0.5 }}
      >
        Próximo recebimento
      </div>
      <div className="flex items-baseline gap-1 mt-1.5">
        <span className="text-sm" style={{ opacity: 0.7 }}>
          R$
        </span>
        <span className="font-display" style={{ fontSize: 34 }}>
          {valor[0]}
          <span style={{ opacity: 0.7 }}>,{valor[1]}</span>
        </span>
      </div>
      <div className="text-[11px] mt-0.5" style={{ opacity: 0.6 }}>
        {proximaData} · {banco}
      </div>

      {antecipacaoData && antecipacaoCusto !== undefined && (
        <div
          className="mt-4 rounded-[14px]"
          style={{
            padding: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}
        >
          <div className="text-[11px]" style={{ opacity: 0.8 }}>
            Receber em{' '}
            <strong style={{ color: 'var(--brick)' }}>{antecipacaoData} (D+2)</strong>?
          </div>
          <div className="text-[10px] mt-0.5" style={{ opacity: 0.5 }}>
            R$ 0,75/pedido · total {money(antecipacaoCusto)}
          </div>
          <Link
            href="/financeiro"
            className="block mt-2.5 w-full text-center rounded-full font-bold text-xs cursor-pointer"
            style={{
              padding: '9px 12px',
              background: 'var(--brick)',
              color: 'var(--brick-ink)',
            }}
          >
            Antecipar recebimento{antecipacaoElegivel ? ` · ${money(antecipacaoElegivel)}` : ''}
          </Link>
        </div>
      )}
    </Card>
  )
}
