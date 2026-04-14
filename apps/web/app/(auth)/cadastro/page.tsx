'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { cadastro } from '@/lib/actions/auth'

/* ── Painel esquerdo: identidade visual ─────────────────────────────────── */
function PainelMarca() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #1A4D3A 0%, #0f2e22 100%)' }}
    >
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
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span className="text-white/80 text-sm font-medium">Comece hoje, é grátis</span>
        </div>

        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Venda mais.<br />Gerencie menos.
        </h2>
        <p className="text-white/55 text-base leading-relaxed max-w-xs">
          Configure sua loja em minutos e comece a receber pedidos com toda a estrutura que seu negócio precisa.
        </p>

        {/* Benefícios */}
        <ul className="mt-10 space-y-3">
          {[
            'Gestão de pedidos em tempo real',
            'Repasses automáticos via Stripe',
            'Relatórios financeiros completos',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(76, 175, 130, 0.2)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <span className="text-white/65 text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-white/25 text-xs">
        © {new Date().getFullYear()} Mallora. Todos os direitos reservados.
      </p>
    </div>
  )
}

/* ── Página de cadastro ─────────────────────────────────────────────────── */
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
              Crie sua conta
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">
              Configure sua loja e comece a vender hoje
            </p>
          </div>

          <form ref={formRef} action={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Nome completo</label>
              <input
                name="nome"
                type="text"
                required
                autoComplete="name"
                placeholder="Seu nome"
                className="input-field"
              />
            </div>

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
              <label className="label">Senha</label>
              <input
                name="senha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
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
                  Criando conta...
                </>
              ) : 'Criar conta grátis'}
            </button>

            <p className="text-center text-xs text-gray-400 leading-relaxed">
              Ao criar sua conta você concorda com os{' '}
              <a href="#" className="underline underline-offset-2 hover:text-gray-600 transition-colors">Termos de Uso</a>
              {' '}e{' '}
              <a href="#" className="underline underline-offset-2 hover:text-gray-600 transition-colors">Política de Privacidade</a>.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link href="/entrar" className="text-brand-500 font-semibold hover:text-brand-700 transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
