'use client'

import { useState } from 'react'
import { AbaGeral } from './config/aba-geral'
import { AbaHorarios } from './config/aba-horarios'
import { AbaEntrega } from './config/aba-entrega'
import { AbaPagamentos } from './config/aba-pagamentos'

const ABAS = [
  { id: 'geral', label: 'Dados gerais' },
  { id: 'horarios', label: 'Horários' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'pagamentos', label: 'Pagamentos' },
]

interface Props {
  loja: any
}

export function ConfiguracoesAbasLoja({ loja }: Props) {
  const [abaAtiva, setAbaAtiva] = useState('geral')

  return (
    <div>
      <div
        className="flex gap-1 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={
              abaAtiva === aba.id
                ? { borderColor: 'var(--brick)', color: 'var(--ink)' }
                : { borderColor: 'transparent', color: 'var(--ink-3)' }
            }
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'geral' && <AbaGeral loja={loja} />}
      {abaAtiva === 'horarios' && <AbaHorarios horarios={loja.horarios} />}
      {abaAtiva === 'entrega' && <AbaEntrega loja={loja} />}
      {abaAtiva === 'pagamentos' && <AbaPagamentos loja={loja} />}
    </div>
  )
}
