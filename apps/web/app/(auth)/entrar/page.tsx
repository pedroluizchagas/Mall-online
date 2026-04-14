'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'

/* ── Painel esquerdo: identidade visual ─────────────────────────────────── */
function PainelMarca() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #1A4D3A 0%, #0f2e22 100%)' }}
    >
      {/* Textura sutil de bolinhas */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4CAF82 0%, #2d8a60 100%)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Mallora</span>
      </div>

      {/* Conteúdo central */}
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-white/80 text-sm font-medium">Plataforma de delivery</span>
        </div>

        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Seu negócio<br />no próximo nível.
        </h2>
        <p className="text-white/55 text-base leading-relaxed max-w-xs">
          Gerencie pedidos, produtos e financeiro em um só lugar — com inteligência e design que seus clientes vão notar.
        </p>

        {/* Stats */}
        <div className="flex gap-8 mt-10">
          {[
            { valor: '98%', label: 'Satisfação' },
            { valor: '< 2min', label: 'Tempo de resposta' },
            { valor: '24/7', label: 'Disponibilidade' },
          ].map(({ valor, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white">{valor}</p>
              <p className="text-white/40 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <p className="relative text-white/25 text-xs">
        © {new Date().getFullYear()} Mallora. Todos os direitos reservados.
      </p>
    </div>
  )
}

/* ── Página de login ────────────────────────────────────────────────────── */
export default function PaginaEntrar() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await login(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <PainelMarca />

      {/* Painel direito: formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface-base">
        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4CAF82 0%, #2d8a60 100%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="text-brand-800 font-bold text-xl tracking-tight">Mallora</span>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-brand-800 tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">
              Acesse o painel do seu negócio
            </p>
          </div>

          <form ref={formRef} action={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Senha</label>
                <a href="#" className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                  Esqueceu?
                </a>
              </div>
              <input
                name="senha"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            {erro && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <p className="text-sm text-red-600">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {enviando ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-500">
            Ainda não tem conta?{' '}
            <Link href="/cadastro" className="text-brand-500 font-semibold hover:text-brand-700 transition-colors">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
