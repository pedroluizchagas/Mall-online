import { CreditCard, ArrowRight } from 'lucide-react'

export function BannerStripePendente() {
  return (
    <div className="bg-gradient-to-r from-[#1A4D3A] to-[#2d6e54] text-white px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            Configure seus recebimentos para começar a vender
          </p>
          <p className="text-xs text-white/70 leading-tight mt-0.5">
            Sua loja está pronta. Falta conectar a conta bancária via Stripe para receber pagamentos.
          </p>
        </div>
      </div>
      <a
        href="/onboarding/stripe/retry"
        className="flex items-center gap-2 bg-[#C1F148] text-[#18181B] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#aee623] transition-colors shrink-0"
      >
        Configurar agora
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  )
}
