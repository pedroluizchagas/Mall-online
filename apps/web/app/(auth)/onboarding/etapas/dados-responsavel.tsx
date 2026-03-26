'use client'

import { useState } from 'react'
import { schemaDadosResponsavel } from '@/lib/validations/onboarding'
import type { DadosOnboarding } from '../page'

interface Props {
  dadosIniciais: Partial<DadosOnboarding>
  onAvancar: (dados: Partial<DadosOnboarding>) => void
}

export function EtapaDadosResponsavel({ dadosIniciais, onAvancar }: Props) {
  const [erros, setErros] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const dados = {
      nome_responsavel: formData.get('nome_responsavel') as string,
      cpf_cnpj: formData.get('cpf_cnpj') as string,
      telefone: formData.get('telefone') as string,
      email: formData.get('email') as string,
    }

    const resultado = schemaDadosResponsavel.safeParse(dados)

    if (!resultado.success) {
      const novosErros: Record<string, string> = {}
      resultado.error.errors.forEach(err => {
        if (err.path[0]) {
          novosErros[err.path[0] as string] = err.message
        }
      })
      setErros(novosErros)
      return
    }

    setErros({})
    onAvancar(dados)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A4D3A] mb-1">
        Dados do responsável
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Informe os dados de quem administrará a loja
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            name="nome_responsavel"
            type="text"
            defaultValue={dadosIniciais.nome_responsavel}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros.nome_responsavel && (
            <p className="text-sm text-red-600 mt-1">{erros.nome_responsavel}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF ou CNPJ
          </label>
          <input
            name="cpf_cnpj"
            type="text"
            defaultValue={dadosIniciais.cpf_cnpj}
            placeholder="000.000.000-00"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros.cpf_cnpj && (
            <p className="text-sm text-red-600 mt-1">{erros.cpf_cnpj}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            name="telefone"
            type="tel"
            defaultValue={dadosIniciais.telefone}
            placeholder="(00) 00000-0000"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros.telefone && (
            <p className="text-sm text-red-600 mt-1">{erros.telefone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={dadosIniciais.email}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros.email && (
            <p className="text-sm text-red-600 mt-1">{erros.email}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors mt-6"
        >
          Continuar
        </button>
      </form>
    </div>
  )
}
