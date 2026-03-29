'use client'

import { useRef, useState } from 'react'
import { loginAdmin } from '@/lib/actions/auth'

export default function PaginaEntrarAdmin() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Exibir erro de acesso negado vindo do middleware
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  const erroUrl = params?.get('erro') === 'acesso-negado'
    ? 'Acesso restrito a administradores.'
    : null

  async function handleSubmit(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await loginAdmin(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#1A4D3A] rounded-xl mb-4" />
          <h1 className="text-2xl font-bold text-[#1A4D3A]">Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito à plataforma</p>
        </div>

        {erroUrl && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
            {erroUrl}
          </p>
        )}

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82] text-sm"
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
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82] text-sm"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-[#1A4D3A] text-white py-3 rounded-lg font-medium
              hover:bg-[#163d2e] transition-colors disabled:opacity-50 text-sm"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
