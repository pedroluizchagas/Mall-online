import { getPlanos, type Plano } from '@/lib/consultas'
import { contagem, numero, partesDoValor } from '@/lib/format'
import { cx } from '@/lib/cx'
import { PageHeader } from '@/components/admin/page-header'
import { SecaoFolha } from '@/components/admin/folha'
import { EmptyState } from '@/components/admin/empty-state'
import { FormularioPlano } from '@/components/admin/planos/formulario-plano'
import { PartnerIcon } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

export default async function PaginaPlanos() {
  const planos = await getPlanos()
  const ativos = planos.filter((p) => p.ativo)
  const inativos = planos.filter((p) => !p.ativo)

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Financeiro"
        titulo="Planos"
        subtitulo="A mensalidade de cada lojista, cobrada pelo Stripe Billing. Cada plano define os limites do painel."
      />

      {planos.length === 0 ? (
        <div className="cartao mb-12">
          <EmptyState
            icone="tag"
            titulo="Nenhum plano cadastrado"
            descricao="Crie o primeiro plano abaixo — sem plano, o lojista não tem o que assinar."
          />
        </div>
      ) : (
        <div className="mb-12 flex flex-col gap-10">
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {ativos.map((p) => (
              <CartaoPlano key={p.id} plano={p} />
            ))}
          </ul>
          {inativos.length > 0 && (
            <section aria-label="Planos inativos">
              <p className="micro mb-3 text-ink-3">Inativos · {inativos.length}</p>
              <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
                {inativos.map((p) => (
                  <CartaoPlano key={p.id} plano={p} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <SecaoFolha id="novo-plano" sobrelinha="Stripe Billing" titulo="Novo plano">
        <div className="cartao max-w-3xl p-6 sm:p-7">
          <FormularioPlano />
        </div>
      </SecaoFolha>
    </div>
  )
}

function CartaoPlano({ plano: p }: { plano: Plano }) {
  const preco = partesDoValor(p.preco_mensal)
  const recursos = [
    { rotulo: 'Estoque', tem: p.tem_estoque },
    { rotulo: 'Relatórios', tem: p.tem_relatorios },
    { rotulo: 'Antecipação', tem: p.tem_antecipacao },
  ]

  return (
    <li className={cx('cartao flex list-none flex-col p-6', !p.ativo && 'opacity-[0.72]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[21px] font-bold leading-tight tracking-[-0.025em] text-ink">{p.nome}</h2>
          {p.descricao && <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-ink-3">{p.descricao}</p>}
        </div>
        {!p.ativo && <span className="shrink-0 rounded-full bg-bg-3 px-2.5 py-1 text-[11.5px] font-bold text-ink-2">Inativo</span>}
      </div>

      <p className="mt-6 flex items-baseline gap-1.5 text-ink">
        <span className="text-[15px] font-semibold text-ink-3">R$</span>
        <span className="tabular-nums">
          <span className="text-[40px] font-bold leading-none tracking-[-0.04em]">{preco.inteiro}</span>
          <span className="text-[18px] font-bold tracking-[-0.02em]">{preco.decimal}</span>
        </span>
        <span className="text-[13px] font-semibold text-ink-3">/mês</span>
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
        <PartnerIcon name="users" size={15} strokeWidth={2} className="text-ink-3" />
        {p.assinantes > 0 ? contagem(p.assinantes, 'assinante ativo', 'assinantes ativos') : 'Nenhum assinante ativo'}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-5 text-[13px]">
        <Limite rotulo="Lojas" valor={numero(p.max_lojas)} />
        <Limite rotulo="Produtos" valor={numero(p.max_produtos)} />
        <Limite rotulo="Entregadores" valor={numero(p.max_entregadores)} />
        <Limite rotulo="Posts no Explorar" valor={p.max_posts === null ? 'Ilimitados' : numero(p.max_posts)} />
      </dl>

      <ul className="m-0 mt-5 flex list-none flex-wrap gap-1.5 p-0">
        {recursos.map((r) => (
          <li
            key={r.rotulo}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
              r.tem ? 'bg-bg-2 text-ink' : 'text-ink-3',
            )}
          >
            <PartnerIcon name={r.tem ? 'check' : 'minus'} size={12} strokeWidth={2.6} />
            {!r.tem && <span className="sr-only">Sem </span>}
            {r.rotulo}
          </li>
        ))}
      </ul>

      <p className="mt-auto truncate pt-5 font-mono text-[11px] text-ink-3" title={p.stripe_price_id ?? undefined}>
        {p.stripe_price_id ?? 'Sem preço no Stripe'}
      </p>
    </li>
  )
}

function Limite({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-3">{rotulo}</dt>
      <dd className="mt-0.5 font-bold text-ink tabular-nums">{valor}</dd>
    </div>
  )
}
