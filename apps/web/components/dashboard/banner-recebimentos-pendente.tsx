import { CreditCard, ArrowRight } from 'lucide-react'

export function BannerRecebimentosPendente() {
  return (
    <div
      className="px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            Configure seus recebimentos para começar a vender
          </p>
          <p className="text-xs leading-tight mt-0.5" style={{ opacity: 0.6 }}>
            Sua loja está pronta. Falta concluir a verificação Pagar.me para receber pagamentos.
          </p>
        </div>
      </div>
      <a
        href="/configuracoes?aba=recebimentos"
        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity shrink-0"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        Configurar agora
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  )
}
