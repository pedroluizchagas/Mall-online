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
        if (err.path[0]) novosErros[err.path[0] as string] = err.message
      })
      setErros(novosErros)
      return
    }

    setErros({})
    onAvancar(dados)
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-brand-800 tracking-tight">
          Dados do responsável
        </h2>
        <p className="text-gray-400 text-sm mt-1.5">
          Informe os dados de quem administrará a loja
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input
            name="nome_responsavel"
            type="text"
            defaultValue={dadosIniciais.nome_responsavel}
            placeholder="Seu nome completo"
            className="input-field"
          />
          {erros.nome_responsavel && (
            <p className="text-xs text-red-500 mt-1.5">{erros.nome_responsavel}</p>
          )}
        </div>

        <div>
          <label className="label">CPF ou CNPJ</label>
          <input
            name="cpf_cnpj"
            type="text"
            defaultValue={dadosIniciais.cpf_cnpj}
            placeholder="000.000.000-00"
            className="input-field"
          />
          {erros.cpf_cnpj && (
            <p className="text-xs text-red-500 mt-1.5">{erros.cpf_cnpj}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefone</label>
            <input
              name="telefone"
              type="tel"
              defaultValue={dadosIniciais.telefone}
              placeholder="(00) 00000-0000"
              className="input-field"
            />
            {erros.telefone && (
              <p className="text-xs text-red-500 mt-1.5">{erros.telefone}</p>
            )}
          </div>

          <div>
            <label className="label">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={dadosIniciais.email}
              placeholder="seu@email.com"
              className="input-field"
            />
            {erros.email && (
              <p className="text-xs text-red-500 mt-1.5">{erros.email}</p>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mt-2">
          Continuar
        </button>
      </form>
    </div>
  )
}
