'use client'

import { useState } from 'react'
import { AbaMeusDados } from './config/aba-meus-dados'
import { AbaAssinatura } from './config/aba-assinatura'
import { AbaStripe } from './config/aba-stripe'

const ABAS = [
  { id: 'dados', label: 'Meus dados' },
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'recebimentos', label: 'Recebimentos' },
]

interface Props {
  dadosConta: {
    email: string
    nome: string
    telefone: string
    cpf_cnpj: string
  }
  tenant: any
  linkExpress: string | null
  assinatura: any
  faturas: any[]
  linkPortal: string | null
}

export function ConfiguracoesAbasConta({ dadosConta, tenant, linkExpress, assinatura, faturas, linkPortal }: Props) {
  const [abaAtiva, setAbaAtiva] = useState('dados')

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

      {abaAtiva === 'dados' && <AbaMeusDados dados={dadosConta} />}
      {abaAtiva === 'assinatura' && (
        <AbaAssinatura
          assinatura={assinatura}
          faturas={faturas}
          linkPortal={linkPortal}
        />
      )}
      {abaAtiva === 'recebimentos' && (
        <AbaStripe tenant={tenant} linkExpress={linkExpress} />
      )}
    </div>
  )
}
