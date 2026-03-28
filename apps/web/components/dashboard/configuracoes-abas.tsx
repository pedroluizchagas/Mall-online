'use client'

import { useState } from 'react'
import { AbaGeral } from './config/aba-geral'
import { AbaHorarios } from './config/aba-horarios'
import { AbaEntrega } from './config/aba-entrega'
import { AbaPagamentos } from './config/aba-pagamentos'
import { AbaStripe } from './config/aba-stripe'

const ABAS = [
  { id: 'geral', label: 'Dados gerais' },
  { id: 'horarios', label: 'Horários' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'stripe', label: 'Conta Stripe' },
]

interface Props {
  loja: any
  tenant: any
  linkExpress: string | null
}

export function ConfiguracoesAbas({ loja, tenant, linkExpress }: Props) {
  const [abaAtiva, setAbaAtiva] = useState('geral')

  return (
    <div>
      {/* Navegação por abas */}
      <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              abaAtiva === aba.id
                ? 'border-[#1A4D3A] text-[#1A4D3A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'geral' && <AbaGeral loja={loja} />}
      {abaAtiva === 'horarios' && <AbaHorarios horarios={loja.horarios} />}
      {abaAtiva === 'entrega' && <AbaEntrega loja={loja} />}
      {abaAtiva === 'pagamentos' && <AbaPagamentos loja={loja} />}
      {abaAtiva === 'stripe' && (
        <AbaStripe tenant={tenant} linkExpress={linkExpress} />
      )}
    </div>
  )
}
