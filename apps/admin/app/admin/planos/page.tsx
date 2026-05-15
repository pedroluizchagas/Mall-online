import { getPlanos } from '@/lib/actions/admin'
import { FormularioPlano } from '@/components/admin/formulario-plano'
import { formatarReais } from '@mallevo/lib'
import { CreditCard, CheckCircle2, XCircle, Plus } from 'lucide-react'

export default async function PaginaPlanos() {
  const planos = await getPlanos()

  return (
    <div className="p-9 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-berry/10 flex items-center justify-center">
          <CreditCard size={17} className="text-berry" />
        </div>
        <h1 className="font-bold text-[17px] tracking-tight text-ink">Planos</h1>
      </div>

      {/* Planos list */}
      <div className="space-y-3">
        {planos.map((plano: any) => (
          <div
            key={plano.id}
            className={`bg-bg rounded-lg border p-5 transition-opacity ${
              plano.ativo ? 'border-line' : 'border-line opacity-50'
            }`}
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                {plano.ativo ? (
                  <CheckCircle2 size={16} className="text-ok flex-shrink-0" />
                ) : (
                  <XCircle size={16} className="text-ink-3 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-ink">{plano.nome}</p>
                  {plano.descricao && (
                    <p className="text-[13px] text-ink-3 mt-0.5">{plano.descricao}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[17px] font-bold text-ink">
                  {formatarReais(plano.preco_mensal)}
                  <span className="text-[13px] font-normal text-ink-3">/mês</span>
                </p>
                {!plano.ativo && (
                  <span className="text-[13px] text-ink-3">Inativo</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                `${plano.max_lojas} loja(s)`,
                `${plano.max_produtos} produto(s)`,
                `${plano.max_entregadores} entregador(es)`,
                ...(plano.tem_estoque ? ['Estoque'] : []),
                ...(plano.tem_antecipacao ? ['Antecipação'] : []),
              ].map((item) => (
                <span
                  key={item}
                  className="text-[11px] bg-bg-2 text-ink-2 px-2.5 py-1 rounded-full font-medium"
                >
                  {item}
                </span>
              ))}
            </div>

            {plano.stripe_price_id && (
              <p className="text-[10px] text-ink-3 font-mono mt-3 truncate">
                {plano.stripe_price_id}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Novo plano */}
      <div className="bg-bg border border-line rounded-lg p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-5">
          <Plus size={16} className="text-brick-dk" />
          <h2 className="font-semibold text-ink">Novo plano</h2>
        </div>
        <FormularioPlano />
      </div>
    </div>
  )
}
