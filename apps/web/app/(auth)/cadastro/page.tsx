'use client'

import { useRef, useState } from 'react'
import { cadastro } from '@/lib/actions/auth'

export default function PaginaCadastro() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await cadastro(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A4D3A]">
            Criar sua conta
          </h1>
          <p className="text-gray-500 mt-1">
            Comece a vender na plataforma
          </p>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo
            </label>
            <input
              name="nome"
              type="text"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              name="senha"
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors disabled:opacity-50"
          >
            {enviando ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta?{' '}
          <a href="/entrar" className="text-[#4CAF82] font-medium">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
