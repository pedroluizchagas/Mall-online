import { formatarReais } from '@mallevo/lib'
import { getConciliacao } from '@/lib/consultas'
import { contagem, numero } from '@/lib/format'
import { mesAtual, mesValido, rotuloDoMes } from '@/lib/hoje'
import { FORMA_PAGAMENTO } from '@/lib/status'
import { cx } from '@/lib/cx'
import { PageHeader } from '@/components/admin/page-header'
import { SecaoFolha } from '@/components/admin/folha'
import { KPI } from '@/components/admin/kpi'
import { EmptyState } from '@/components/admin/empty-state'
import { SeletorMes } from '@/components/admin/seletor-mes'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

const BASE = '/admin/financeiro'

/**
 * Conciliação do mês: o que passou pelo shopping (pedidos entregues), o que
 * ficou com a plataforma e o que foi repassado. O pedido conta no mês em
 * que foi FEITO, no relógio de Divinópolis.
 */
export default async function PaginaConciliacao({ searchParams }: { searchParams: { mes?: string } }) {
  const atual = mesAtual()
  const pedido = mesValido(searchParams.mes) && searchParams.mes <= atual ? searchParams.mes : atual
  const dados = await getConciliacao(pedido)
  const nomeDoMes = rotuloDoMes(pedido)
  const repassado = dados.repasses.lojistas + dados.repasses.entregadores
  const semMovimento = dados.pedidos.pedidos === 0 && repassado === 0 && dados.repasses.aCaminho.quantidade === 0

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Financeiro"
        titulo="Conciliação"
        subtitulo={`Pedidos entregues e repasses de ${nomeDoMes}${pedido === atual ? ' até agora' : ''} — cada pedido conta no mês em que foi feito.`}
        acoes={<SeletorMes mes={pedido} atual={atual} base={BASE} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI rotulo="GMV" valor={formatarReais(dados.pedidos.gmv)} sub="Soma dos pedidos entregues" />
        <KPI rotulo="Pedidos entregues" valor={numero(dados.pedidos.pedidos)} />
        <KPI rotulo="Ticket médio" valor={formatarReais(dados.pedidos.ticketMedio)} />
        <KPI
          rotulo="Receita da plataforma"
          valor={formatarReais(dados.receita.total)}
          sub={`Comissões ${formatarReais(dados.receita.comissoes)} · antecipações ${formatarReais(dados.receita.antecipacoes)}`}
          destaque
        />
      </div>

      {semMovimento ? (
        <div className="cartao mt-10">
          <EmptyState
            icone="wallet"
            titulo={`Nenhum movimento em ${nomeDoMes}`}
            descricao="Sem pedidos entregues nem repasses registrados neste mês."
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-x-6 gap-y-12 lg:grid-cols-2">
          <SecaoFolha id="repasses" sobrelinha="Pagar.me" titulo="Repasses">
            <div className="cartao p-2">
              <ul className="m-0 flex list-none flex-col p-0">
                <LinhaValor icone="store" rotulo="Repassado a lojistas" valor={dados.repasses.lojistas} />
                <LinhaValor icone="bike" rotulo="Repassado a entregadores" valor={dados.repasses.entregadores} />
                <LinhaValor icone="check-double" rotulo="Total repassado" valor={repassado} forte />
              </ul>
              {(dados.repasses.aCaminho.quantidade > 0 || dados.repasses.falharam.quantidade > 0) && (
                <div className="mx-2 mb-2 mt-1 flex flex-col gap-2">
                  {dados.repasses.aCaminho.quantidade > 0 && (
                    <Aviso
                      tom="aviso"
                      icone="route"
                      titulo={`${contagem(dados.repasses.aCaminho.quantidade, 'repasse a caminho', 'repasses a caminho')}`}
                      texto="Agendados ou em processamento."
                      valor={dados.repasses.aCaminho.valor}
                    />
                  )}
                  {dados.repasses.falharam.quantidade > 0 && (
                    <Aviso
                      tom="perigo"
                      icone="alert"
                      titulo={`${contagem(dados.repasses.falharam.quantidade, 'repasse falhou', 'repasses falharam')}`}
                      texto="A transferência não foi concluída — confira o recebedor no Pagar.me."
                      valor={dados.repasses.falharam.valor}
                    />
                  )}
                </div>
              )}
            </div>
          </SecaoFolha>

          <SecaoFolha id="formas" sobrelinha="Pedidos entregues" titulo="Por forma de pagamento">
            <div className="cartao p-5 sm:p-6">
              {dados.porForma.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-ink-3">Nenhum pedido entregue em {nomeDoMes}.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-5 p-0">
                  {dados.porForma.map((f) => {
                    const fracao = dados.pedidos.gmv > 0 ? f.gmv / dados.pedidos.gmv : 0
                    return (
                      <li key={f.forma}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px] font-semibold text-ink">{FORMA_PAGAMENTO[f.forma] ?? f.forma}</span>
                          <span className="shrink-0 text-[14px] font-bold text-ink tabular-nums">{formatarReais(f.gmv)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-2">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(fracao * 100, 1)}%` }} />
                        </div>
                        <p className="mt-1.5 text-[12px] text-ink-3 tabular-nums">
                          {contagem(f.pedidos, 'pedido', 'pedidos')} · {Math.round(fracao * 100)}% do GMV · comissões{' '}
                          {formatarReais(f.comissoes)}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </SecaoFolha>
        </div>
      )}
    </div>
  )
}

function LinhaValor({
  icone,
  rotulo,
  valor,
  forte = false,
}: {
  icone: PartnerIconName
  rotulo: string
  valor: number
  forte?: boolean
}) {
  return (
    <li className={cx('flex items-center gap-3.5 px-3 py-3', forte && 'mt-1 border-t border-line pt-4')}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink">
        <PartnerIcon name={icone} size={18} strokeWidth={1.9} />
      </span>
      <span className={cx('min-w-0 flex-1 truncate text-[14px]', forte ? 'font-bold text-ink' : 'font-semibold text-ink-2')}>
        {rotulo}
      </span>
      <span className={cx('shrink-0 tabular-nums', forte ? 'text-[17px] font-bold text-ink' : 'text-[14px] font-semibold text-ink')}>
        {formatarReais(valor)}
      </span>
    </li>
  )
}

function Aviso({
  tom,
  icone,
  titulo,
  texto,
  valor,
}: {
  tom: 'aviso' | 'perigo'
  icone: PartnerIconName
  titulo: string
  texto: string
  valor: number
}) {
  const cores = tom === 'aviso' ? { fundo: 'var(--warn-lt)', texto: 'var(--warn)' } : { fundo: 'var(--err-lt)', texto: 'var(--err)' }
  return (
    <div className="flex items-center gap-3 rounded-[16px] px-3.5 py-3" style={{ background: cores.fundo }}>
      <PartnerIcon name={icone} size={17} strokeWidth={2.1} color={cores.texto} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold" style={{ color: cores.texto }}>
          {titulo}
        </span>
        <span className="block text-[12.5px] text-ink-2">{texto}</span>
      </span>
      <span className="shrink-0 text-[14px] font-bold tabular-nums" style={{ color: cores.texto }}>
        {formatarReais(valor)}
      </span>
    </div>
  )
}
