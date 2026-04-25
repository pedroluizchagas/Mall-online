import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Package, Clock, Truck, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react'

interface ProximoPasso {
  id: string
  titulo: string
  descricao: string
  href: string
  icone: typeof Package
  concluido: boolean
}

export default async function PaginaInicio() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single()

  const { data: loja } = await supabase
    .from('stores')
    .select('id, nome, horarios, taxa_entrega, raio_entrega_km')
    .eq('tenant_id', tenant?.id ?? '')
    .single()

  const { count: totalProdutos } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant?.id ?? '')

  const horariosConfigurados = !!(loja?.horarios && Object.keys(loja.horarios as object).length > 0)
  const entregaConfigurada = !!(loja?.taxa_entrega !== null && loja?.raio_entrega_km && loja.raio_entrega_km > 0)
  const temProdutos = (totalProdutos ?? 0) > 0

  const proximosPassos: ProximoPasso[] = [
    {
      id: 'recebimentos',
      titulo: 'Configurar recebimentos',
      descricao: 'Conecte sua conta bancária via Stripe para receber pagamentos.',
      href: '/onboarding/stripe/retry',
      icone: CreditCard,
      concluido: !!tenant?.stripe_onboarding_ok,
    },
    {
      id: 'produtos',
      titulo: 'Cadastrar produtos',
      descricao: 'Adicione seu catálogo para começar a vender.',
      href: '/produtos/novo',
      icone: Package,
      concluido: temProdutos,
    },
    {
      id: 'horarios',
      titulo: 'Horários de funcionamento',
      descricao: 'Configure quando sua loja estará aberta para pedidos.',
      href: '/configuracoes',
      icone: Clock,
      concluido: horariosConfigurados,
    },
    {
      id: 'entrega',
      titulo: 'Configurar entrega',
      descricao: 'Defina taxa, raio de atendimento e tempo médio.',
      href: '/configuracoes',
      icone: Truck,
      concluido: entregaConfigurada,
    },
  ]

  const concluidos = proximosPassos.filter(p => p.concluido).length
  const total = proximosPassos.length
  const progresso = Math.round((concluidos / total) * 100)
  const tudoPronto = concluidos === total

  return (
    <div className="min-h-full bg-zinc-100 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">
            {loja?.nome ?? 'Minha loja'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {tudoPronto
              ? 'Tudo pronto! Sua loja está configurada e funcionando.'
              : 'Complete a configuração abaixo para começar a receber pedidos.'}
          </p>
        </div>

        {/* Progress hero card */}
        <div className="relative bg-[#18181B] rounded-2xl p-7 mb-5 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#C1F148]/[0.07] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-[#C1F148]/[0.04] rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-3">
                Configuração da loja
              </p>
              <div className="flex items-end gap-3">
                <span className="text-[56px] font-bold text-white leading-none tracking-tighter">
                  {progresso}
                </span>
                <span className="text-2xl font-semibold text-zinc-500 mb-1.5">%</span>
              </div>
              <p className="text-zinc-500 text-sm mt-2">
                <span className="text-zinc-300 font-medium">{concluidos}</span>
                {' '}de{' '}
                <span className="text-zinc-300 font-medium">{total}</span>
                {' '}etapas concluídas
              </p>
            </div>

            {/* Step dots */}
            <div className="hidden sm:flex flex-col gap-2 pt-1">
              {proximosPassos.map(passo => (
                <div key={passo.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    passo.concluido ? 'bg-[#C1F148]' : 'bg-zinc-700'
                  }`} />
                  <span className={`text-xs ${passo.concluido ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {passo.titulo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative z-10 mt-6 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C1F148] rounded-full transition-all duration-700"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Setup steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {proximosPassos.map((passo, index) => {
            const Icon = passo.icone
            return (
              <Link
                key={passo.id}
                href={passo.href}
                className={`group relative rounded-2xl border p-5 transition-all duration-200 ${
                  passo.concluido
                    ? 'bg-white border-zinc-200/60 opacity-70 hover:opacity-100'
                    : 'bg-white border-zinc-200/60 hover:border-zinc-300 hover:shadow-sm hover:-translate-y-px'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon / Check */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    passo.concluido
                      ? 'bg-[#C1F148] text-[#18181B]'
                      : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200'
                  }`}>
                    {passo.concluido
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Icon className="w-5 h-5" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Step number */}
                      <span className="text-[10px] font-semibold text-zinc-400 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-[13.5px] font-semibold text-zinc-900 leading-tight">
                        {passo.titulo}
                      </h3>
                    </div>
                    <p className="text-[12.5px] text-zinc-500 leading-relaxed">
                      {passo.descricao}
                    </p>
                  </div>

                  <ArrowRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-all ${
                    passo.concluido
                      ? 'text-zinc-300'
                      : 'text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5'
                  }`} />
                </div>

                {/* Concluído tag */}
                {passo.concluido && (
                  <div className="absolute top-3.5 right-3.5">
                    <span className="text-[10px] font-semibold bg-[#C1F148]/20 text-zinc-700 px-2 py-0.5 rounded-full">
                      Feito
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

      </div>
    </div>
  )
}
