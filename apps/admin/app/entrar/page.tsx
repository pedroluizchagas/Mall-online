'use client'

import { useRef, useState } from 'react'
import { loginAdmin } from '@/lib/actions/auth'

export default function PaginaEntrarAdmin() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-2)' }}>
      <div
        className="w-full max-w-sm p-8 rounded-xl border"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--line)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="mb-8">
          <div
            className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
            style={{ background: 'var(--brick)' }}
          >
            <span className="font-bold text-sm" style={{ color: 'var(--brick-ink)' }}>M</span>
          </div>
          <h1 className="text-2xl font-display text-ink">Admin</h1>
          <p className="text-ink-3 text-sm mt-1">Acesso restrito à plataforma</p>
        </div>

        {erroUrl && (
          <p
            className="text-sm rounded-md px-3 py-2 mb-4"
            style={{ background: '#fde8e4', color: 'var(--err)' }}
          >
            {erroUrl}
          </p>
        )}

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border rounded-md px-4 py-2.5 text-sm text-ink bg-bg
                focus:outline-none focus:ring-2 focus:ring-brick transition-shadow"
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Senha
            </label>
            <input
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="w-full border rounded-md px-4 py-2.5 text-sm text-ink bg-bg
                focus:outline-none focus:ring-2 focus:ring-brick transition-shadow"
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          {erro && (
            <p
              className="text-sm rounded-md px-3 py-2"
              style={{ background: '#fde8e4', color: 'var(--err)' }}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-2.5 rounded-full text-sm font-bold
              hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
