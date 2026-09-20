import { ArrowRight, CreditCard } from 'lucide-react'

/**
 * Trava de publicação — a mesma do Partner App (`GatePublicacao`): só
 * publica no Explorar quem tem recebimentos ativos na Pagar.me
 * (`tenantPodePublicar`). O conteúdo já publicado continua visível.
 */
export function GatePublicacao({ contexto }: { contexto: 'conteudo' | 'publicar' }) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      role="status"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <CreditCard className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">
          {contexto === 'publicar' ? 'Ative seus recebimentos para publicar' : 'Publicação bloqueada até ativar os recebimentos'}
        </p>
        <p className="text-xs leading-snug mt-1" style={{ opacity: 0.65 }}>
          O Explorar mostra sua loja para todo o shopping. Conclua a verificação Pagar.me e a publicação é liberada na hora.
        </p>
      </div>
      <a
        href="/configuracoes?aba=recebimentos"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity shrink-0"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        Configurar recebimentos
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  )
}
