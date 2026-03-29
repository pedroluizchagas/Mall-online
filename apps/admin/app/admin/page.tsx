import { getMetricasGlobais } from '@/lib/actions/admin'
import { formatarReais } from '@mallora/lib'

export default async function PaginaAdminVisaoGeral() {
  const metricas = await getMetricasGlobais()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D3A]">Visão geral</h1>

      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Plataforma</p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica label="Lojistas ativos" valor={String(metricas.lojistas_ativos)} />
          <CardMetrica label="Assinaturas ativas" valor={String(metricas.assinaturas_ativas)} />
          <CardMetrica label="Entregadores" valor={String(metricas.entregadores_aprovados)} />
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Hoje</p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica label="Pedidos entregues" valor={String(metricas.pedidos_hoje)} />
          <CardMetrica label="GMV" valor={formatarReais(metricas.gmv_hoje)} />
          <CardMetrica
            label="Comissões"
            valor={formatarReais(metricas.receita_comissao_hoje)}
            destaque
          />
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Este mês</p>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica label="Pedidos entregues" valor={String(metricas.pedidos_mes)} />
          <CardMetrica label="GMV" valor={formatarReais(metricas.gmv_mes)} />
          <CardMetrica
            label="Comissões"
            valor={formatarReais(metricas.receita_comissao_mes)}
            destaque
          />
        </div>
      </section>

      {metricas.repasses_pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">Repasses pendentes</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {formatarReais(metricas.repasses_pendentes)}
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Serão processados pelo cron de meia-noite.
          </p>
        </div>
      )}
    </div>
  )
}

function CardMetrica({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        destaque ? 'bg-[#1A4D3A] border-[#1A4D3A]' : 'bg-white border-gray-100'
      }`}
    >
      <p className={`text-xs mb-1 ${destaque ? 'text-green-200' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${destaque ? 'text-white' : 'text-[#1A4D3A]'}`}>
        {valor}
      </p>
    </div>
  )
}
