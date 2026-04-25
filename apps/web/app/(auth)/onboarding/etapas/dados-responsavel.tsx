'use client'

import { useState } from 'react'
import { schemaDadosResponsavel } from '@/lib/validations/onboarding'
import type { DadosOnboarding } from '../page'
import { ArrowRight, User, Hash, Phone, Mail, Lock } from 'lucide-react'

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
      senha: formData.get('senha') as string,
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
    <div className="w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
          Dados do Responsável
        </h2>
        <p className="text-zinc-500 text-lg">
          Precisamos de algumas informações sobre quem vai administrar a loja.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Nome completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="nome_responsavel"
                type="text"
                defaultValue={dadosIniciais.nome_responsavel}
                placeholder="Ex: João da Silva"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.nome_responsavel 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.nome_responsavel && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.nome_responsavel}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              CPF ou CNPJ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="cpf_cnpj"
                type="text"
                defaultValue={dadosIniciais.cpf_cnpj}
                placeholder="000.000.000-00"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.cpf_cnpj 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.cpf_cnpj && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.cpf_cnpj}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Telefone (WhatsApp)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="telefone"
                type="tel"
                defaultValue={dadosIniciais.telefone}
                placeholder="(00) 00000-0000"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.telefone 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.telefone && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.telefone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              E-mail de acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="email"
                type="email"
                defaultValue={dadosIniciais.email}
                placeholder="seu@email.com"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.email && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Crie uma senha forte
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="senha"
                type="password"
                defaultValue={dadosIniciais.senha}
                placeholder="Mínimo de 6 caracteres"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.senha 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.senha && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.senha}</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C1F148]/20"
          >
            Continuar para Loja
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
