import type { Lojista } from '@/lib/consultas'
import { dataCurta, diaEMes, quando } from '@/lib/format'
import { metaAssinatura, metaRecebimentos } from '@/lib/status'
import { urlDaLoja } from '@/lib/storefront-url'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { BadgeStatus } from '../badge-status'
import { Tijolo } from '../tijolo'
import { AcaoLojista } from './acao-lojista'

/**
 * Colunas no computador: quem é · assinatura · recebimentos · ação. No
 * celular a linha vira cartão e as três últimas colunas descem juntas
 * (`xl:contents` devolve cada uma à grade).
 */
const GRADE = 'xl:grid-cols-[44px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_128px]'

export function ListaLojistas({ lojistas }: { lojistas: Lojista[] }) {
  const agora = Date.now()
  return (
    <div>
      <div aria-hidden className={`micro mb-2 hidden gap-x-6 px-4 text-ink-3 xl:grid ${GRADE}`}>
        <span />
        <span>Loja e lojista</span>
        <span>Assinatura</span>
        <span>Recebimentos</span>
        <span />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lojistas.map((l) => (
          <LinhaLojista key={l.id} lojista={l} agora={agora} />
        ))}
      </ul>
    </div>
  )
}

function LinhaLojista({ lojista: l, agora }: { lojista: Lojista; agora: number }) {
  const titulo = l.loja?.nome ?? l.nome
  const assinatura = metaAssinatura(l.assinatura?.status)

  return (
    <li
      className={`cartao grid list-none grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 xl:gap-x-6 ${GRADE} ${
        l.ativo ? '' : 'opacity-[0.72]'
      }`}
    >
      <Tijolo nome={titulo} foto={l.loja?.logo} />

      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold text-ink" title={titulo}>
            {titulo}
          </span>
          {!l.ativo && (
            <span className="shrink-0 rounded-full bg-bg-3 px-2 py-0.5 text-[11px] font-bold text-ink-2">Suspenso</span>
          )}
          {l.totalLojas > 1 && (
            <span className="shrink-0 text-[12px] font-semibold text-ink-3">+{l.totalLojas - 1}</span>
          )}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {l.loja ? `${l.nome} · ` : ''}
          {l.email}
          {l.telefone ? ` · ${l.telefone}` : ''}
        </p>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
          <span title={dataCurta(l.criadoEm)}>Cadastro {quando(l.criadoEm, agora)}</span>
          {l.loja?.slug && (
            <a
              href={urlDaLoja(l.loja.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-w-0 items-center gap-1 font-mono text-[11.5px] text-ink-2 hover:text-ink"
            >
              <span className="truncate">{l.loja.slug}.mallevo.com.br</span>
              <PartnerIcon name="external" size={12} strokeWidth={2} className="shrink-0 opacity-70 group-hover:opacity-100" />
            </a>
          )}
          {l.loja && !l.loja.noAr && <span className="font-semibold text-warn">Loja pausada</span>}
        </p>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3 xl:contents">
        <div className="min-w-0">
          <BadgeStatus meta={assinatura} contexto="Assinatura" />
          <p className="mt-1 truncate text-[12px] text-ink-3">
            {l.assinatura?.plano ?? 'Sem plano'}
            {l.assinatura?.status === 'trial' && l.assinatura.trialTerminaEm
              ? ` · teste até ${diaEMes(l.assinatura.trialTerminaEm)}`
              : ''}
          </p>
        </div>
        <div className="min-w-0 self-start xl:self-center">
          <BadgeStatus meta={metaRecebimentos(l.recebimentos)} contexto="Recebimentos" />
        </div>
        <div className="ml-auto xl:ml-0 xl:justify-self-end">
          <AcaoLojista id={l.id} nome={titulo} ativo={l.ativo} />
        </div>
      </div>
    </li>
  )
}
