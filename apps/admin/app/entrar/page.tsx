'use client'

import { useRef, useState } from 'react'
import { loginAdmin } from '@/lib/actions/auth'
import { Mail, Lock, Loader2, ShieldCheck, BarChart3 } from 'lucide-react'

export default function PaginaEntrarAdmin() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const erroUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('erro') === 'acesso-negado'
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-[1200px] bg-white rounded-[2.5rem] flex shadow-2xl overflow-hidden min-h-[700px]">

        {/* Left Side - Form */}
        <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:px-20 relative">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-10">
              <div className="w-12 h-12 rounded-xl bg-[#18181B] flex items-center justify-center mb-8 shadow-md">
                <span className="text-[#C1F148] font-bold text-2xl">M</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">
                Painel Admin
              </h1>
              <p className="text-zinc-500">
                Acesso restrito à plataforma Mallevo
              </p>
            </div>

            {erroUrl && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 text-center font-medium mb-6">
                {erroUrl}
              </div>
            )}

            <form ref={formRef} action={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@mallevo.com"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#18181B] focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input
                    name="senha"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#18181B] focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              {erro && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 text-center font-medium">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full flex items-center justify-center gap-2 bg-[#18181B] text-[#C1F148] py-4 rounded-xl font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-zinc-900/20"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Acessar painel'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Branding Banner */}
        <div className="hidden lg:flex w-[55%] p-4">
          <div className="w-full h-full bg-[#18181B] rounded-[2rem] relative overflow-hidden flex flex-col justify-between p-12 lg:p-16">

            {/* Background Glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#C1F148]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#C1F148]/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 max-w-md">
              <h2 className="text-5xl lg:text-6xl font-medium text-white leading-[1.1] tracking-tight">
                Gerencie a <br />
                <span className="text-[#C1F148] italic pr-2">plataforma</span> com <br />
                total controle.
              </h2>
            </div>

            {/* Floating UI Elements */}
            <div className="relative z-10 w-full flex justify-end mt-12 h-64">

              {/* Main Card */}
              <div className="absolute bottom-0 right-0 w-80 bg-zinc-100 rounded-3xl p-6 shadow-2xl border border-white/10 backdrop-blur-sm z-20 translate-x-4 translate-y-4">
                <div className="w-8 h-8 rounded-lg bg-[#18181B] flex items-center justify-center mb-6">
                  <span className="text-[#C1F148] font-bold text-sm">M</span>
                </div>
                <p className="text-4xl font-semibold text-zinc-900 tracking-tight mb-1">
                  1.248<span className="text-zinc-400 text-2xl"> lojas</span>
                </p>
                <p className="text-zinc-500 text-sm mb-8">Lojistas ativos</p>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-zinc-800 font-medium text-sm">Plataforma</p>
                    <p className="text-zinc-500 text-xs mt-0.5">mallevo.com.br</p>
                  </div>
                  <div className="bg-[#C1F148] text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-full">
                    Online
                  </div>
                </div>
              </div>

              {/* Smaller Stat Card behind */}
              <div className="absolute bottom-20 right-64 w-48 bg-[#27272A] rounded-2xl p-5 shadow-xl border border-white/5 z-10 rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
                <div className="w-8 h-8 rounded-full bg-[#C1F148]/20 flex items-center justify-center mb-3">
                  <BarChart3 className="w-4 h-4 text-[#C1F148]" />
                </div>
                <p className="text-white font-medium mb-0.5">Pedidos hoje</p>
                <p className="text-2xl font-semibold text-[#C1F148]">+847</p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
