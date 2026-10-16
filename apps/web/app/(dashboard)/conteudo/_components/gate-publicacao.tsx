import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Trava de publicação — a mesma do Partner App (`GatePublicacao`): só
 * publica no Explorar quem tem recebimentos ativos na Pagar.me
 * (`tenantPodePublicar`). O conteúdo já publicado continua visível.
 */
export function GatePublicacao({ contexto }: { contexto: 'conteudo' | 'publicar' }) {
  return (
    <div
      className="sobre-escuro relative isolate flex flex-col gap-4 overflow-hidden rounded-[20px] bg-marquee p-5 text-white sm:flex-row sm:items-center"
      role="status"
    >
      <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-[color:var(--brick)]"
        style={{ background: 'var(--m-glass-2)' }}
      >
        <PartnerIcon name="wallet" size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">
          {contexto === 'publicar' ? 'Ative seus recebimentos para publicar' : 'Publicação bloqueada até ativar os recebimentos'}
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-[color:var(--m-ink-2)]">
          O Explorar mostra sua loja para todo o shopping. Conclua a verificação Pagar.me e a publicação é liberada na hora.
        </p>
      </div>
      <a
        href="/configuracoes?aba=recebimentos"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors bg-brick text-brick-ink hover:bg-brick-dk"
      >
        Configurar recebimentos
        <PartnerIcon name="chevron-right" size={15} strokeWidth={2.4} />
      </a>
    </div>
  )
}
