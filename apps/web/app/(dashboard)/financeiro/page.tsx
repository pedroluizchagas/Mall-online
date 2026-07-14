import {
  getKpisFinanceiros,
  getFaturamentoDiario,
  getTopProdutos,
  getRepasses,
  getRecipientBalance,
  getPedidosElegiveis,
} from '@/lib/actions/financeiro'
import { KpisFinanceiros } from '@/components/dashboard/kpis-financeiros'
import { GraficoFaturamento } from '@/components/dashboard/grafico-faturamento'
import { ListaRepasses } from '@/components/dashboard/lista-repasses'
import { CardAntecipacao } from '@/components/dashboard/card-antecipacao'
import { CardSaldoPagarme } from '@/components/dashboard/card-saldo-pagarme'
import { TopProdutos } from '@/components/dashboard/top-produtos'
import { PageHeader } from '@/components/dashboard/page-header'
import { ExportarExtratoButton } from '@/components/dashboard/exportar-extrato-button'
import { Card } from '@/components/ui/card'

export default async function PaginaFinanceiro() {
  const [
    kpisHoje,
    kpisMes,
    faturamentoDiario,
    topProdutos,
    repasses,
    saldoPagarme,
    pedidosElegiveis,
  ] = await Promise.all([
    getKpisFinanceiros('hoje'),
    getKpisFinanceiros('mes'),
    getFaturamentoDiario(),
    getTopProdutos(),
    getRepasses(),
    getRecipientBalance(),
    getPedidosElegiveis(),
  ])

  return (
    <div className="p-9 space-y-6 slide-up">
      <PageHeader
        titulo="Financeiro"
        subtitulo="KPIs, repasses e extrato da sua conta de recebimentos."
        acoes={<ExportarExtratoButton />}
      />

      <KpisFinanceiros kpisHoje={kpisHoje} kpisMes={kpisMes} />

      <Card>
        <h2 className="font-bold text-base text-ink mb-4">
          Faturamento — últimos 30 dias
        </h2>
        <GraficoFaturamento dados={faturamentoDiario} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <CardSaldoPagarme saldo={saldoPagarme} />
        <CardAntecipacao elegibilidade={pedidosElegiveis} />
      </div>

      <Card>
        <h2 className="font-bold text-base text-ink mb-4">
          Produtos mais vendidos — últimos 30 dias
        </h2>
        <TopProdutos produtos={topProdutos} />
      </Card>

      <div>
        <h2 className="font-bold text-base text-ink mb-4">Histórico de repasses</h2>
        <ListaRepasses
          repasses={repasses.repasses}
          totalPendente={repasses.total_pendente}
          totalRecebido={repasses.total_recebido}
        />
      </div>
    </div>
  )
}
