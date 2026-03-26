import {
  getKpisFinanceiros,
  getFaturamentoDiario,
  getTopProdutos,
  getRepasses,
  getSaldoStripe,
  getLinkExpressDashboard,
  getPedidosElegiveis,
} from '@/lib/actions/financeiro'
import { KpisFinanceiros } from '@/components/dashboard/kpis-financeiros'
import { GraficoFaturamento } from '@/components/dashboard/grafico-faturamento'
import { ListaRepasses } from '@/components/dashboard/lista-repasses'
import { CardAntecipacao } from '@/components/dashboard/card-antecipacao'
import { CardSaldoStripe } from '@/components/dashboard/card-saldo-stripe'
import { TopProdutos } from '@/components/dashboard/top-produtos'

export default async function PaginaFinanceiro() {
  // Carregar tudo em paralelo
  const [
    kpisHoje,
    kpisMes,
    faturamentoDiario,
    topProdutos,
    repasses,
    saldoStripe,
    linkExpress,
    pedidosElegiveis,
  ] = await Promise.all([
    getKpisFinanceiros('hoje'),
    getKpisFinanceiros('mes'),
    getFaturamentoDiario(),
    getTopProdutos(),
    getRepasses(),
    getSaldoStripe(),
    getLinkExpressDashboard(),
    getPedidosElegiveis(),
  ])

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Financeiro</h1>

      {/* KPIs do dia e do mês */}
      <KpisFinanceiros kpisHoje={kpisHoje} kpisMes={kpisMes} />

      {/* Gráfico de faturamento dos últimos 30 dias */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">
          Faturamento — últimos 30 dias
        </h2>
        <GraficoFaturamento dados={faturamentoDiario} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saldo na conta Stripe */}
        <CardSaldoStripe saldo={saldoStripe} linkExpress={linkExpress} />

        {/* Antecipação de repasse */}
        <CardAntecipacao elegibilidade={pedidosElegiveis} />
      </div>

      {/* Top produtos */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">
          Produtos mais vendidos — últimos 30 dias
        </h2>
        <TopProdutos produtos={topProdutos} />
      </div>

      {/* Histórico de repasses */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#1A4D3A] mb-4">Repasses</h2>
        <ListaRepasses
          repasses={repasses.repasses}
          totalPendente={repasses.total_pendente}
          totalRecebido={repasses.total_recebido}
        />
      </div>
    </div>
  )
}
