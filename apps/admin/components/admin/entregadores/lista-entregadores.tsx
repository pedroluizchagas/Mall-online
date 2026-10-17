import type { Entregador } from '@/lib/consultas'
import { dataCurta, quando } from '@/lib/format'
import { TIPO_ENTREGADOR, metaEntregador, metaRecebimentos } from '@/lib/status'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { BadgeStatus } from '../badge-status'
import { Tijolo } from '../tijolo'
import { AcoesEntregador } from './acoes-entregador'

/** Colunas no computador: quem é · cadastro · recebimentos · CNH · decisão. */
const GRADE = 'xl:grid-cols-[44px_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_104px_244px]'

export function ListaEntregadores({ entregadores }: { entregadores: Entregador[] }) {
  const agora = Date.now()
  return (
    <div>
      <div aria-hidden className={`micro mb-2 hidden gap-x-5 px-4 text-ink-3 xl:grid ${GRADE}`}>
        <span />
        <span>Entregador</span>
        <span>Cadastro</span>
        <span>Recebimentos</span>
        <span>CNH</span>
        <span />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {entregadores.map((e) => (
          <LinhaEntregador key={e.id} entregador={e} agora={agora} />
        ))}
      </ul>
    </div>
  )
}

function LinhaEntregador({ entregador: e, agora }: { entregador: Entregador; agora: number }) {
  const aoVivo = e.status === 'aprovado' && e.online

  return (
    <li className={`cartao grid list-none grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 xl:gap-x-5 ${GRADE}`}>
      <span className="relative">
        <Tijolo nome={e.nome} foto={e.foto} forma="pessoa" />
        {aoVivo && (
          <span
            aria-hidden
            className="pulso absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-[color:var(--bg)]"
            style={{ background: 'var(--ok-vivo)' }}
          />
        )}
      </span>

      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold text-ink">{e.nome}</span>
          {aoVivo && <span className="shrink-0 text-[12px] font-semibold text-ok">Online</span>}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {[e.telefone, e.veiculo].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink-3">
          {e.tipo === 'proprio' && e.loja ? `Entregador da loja ${e.loja}` : TIPO_ENTREGADOR[e.tipo] ?? e.tipo}
        </p>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3 xl:contents">
        <div className="min-w-0">
          <BadgeStatus meta={metaEntregador(e.status)} contexto="Cadastro" />
          <p className="mt-1 truncate text-[12px] text-ink-3" title={dataCurta(e.criadoEm)}>
            {e.status === 'aprovado' && e.aprovadoEm
              ? `Aprovado em ${dataCurta(e.aprovadoEm)}`
              : `Chegou ${quando(e.criadoEm, agora)}`}
          </p>
        </div>
        <div className="min-w-0 self-start xl:self-center">
          <BadgeStatus meta={metaRecebimentos(e.recebimentos)} contexto="Recebimentos" />
        </div>
        <div className="min-w-0">
          {e.cnhUrl ? (
            <a
              href={e.cnhUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-ink"
            >
              <PartnerIcon name="file" size={15} strokeWidth={2} />
              <span className="sublinha">Ver CNH</span>
              <PartnerIcon name="external" size={12} strokeWidth={2} className="opacity-60 group-hover:opacity-100" />
            </a>
          ) : (
            <span className="text-[12.5px] text-ink-3">Sem CNH</span>
          )}
        </div>
        <div className="ml-auto xl:ml-0 xl:justify-self-end">
          <AcoesEntregador id={e.id} nome={e.nome.split(/\s+/)[0]} status={e.status} />
        </div>
      </div>
    </li>
  )
}
