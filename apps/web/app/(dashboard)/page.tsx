import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Package, Clock, Truck, CreditCard, ArrowRight, Store } from 'lucide-react'

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
      descricao: 'Adicione seu cardápio ou catálogo para começar a vender.',
      href: '/produtos/novo',
      icone: Package,
      concluido: temProdutos,
    },
    {
      id: 'horarios',
      titulo: 'Definir horários de funcionamento',
      descricao: 'Configure quando sua loja estará aberta para receber pedidos.',
      href: '/configuracoes',
      icone: Clock,
      concluido: horariosConfigurados,
    },
    {
      id: 'entrega',
      titulo: 'Configurar entrega',
      descricao: 'Defina taxa, raio de atendimento e tempo médio de entrega.',
      href: '/configuracoes',
      icone: Truck,
      concluido: entregaConfigurada,
    },
  ]

  const concluidos = proximosPassos.filter(p => p.concluido).length
  const progresso = Math.round((concluidos / proximosPassos.length) * 100)

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1A4D3A] flex items-center justify-center">
            <Store className="w-5 h-5 text-[#C1F148]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A4D3A]">
            {loja?.nome ?? 'Sua loja'}
          </h1>
        </div>
        <p className="text-gray-500 text-lg">
          Bem-vindo ao painel da Mallora. Vamos finalizar a configuração do seu negócio.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Configuração do negócio</h2>
            <p className="text-sm text-gray-500">{concluidos} de {proximosPassos.length} etapas concluídas</p>
          </div>
          <span className="text-2xl font-bold text-[#1A4D3A]">{progresso}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1A4D3A] to-[#4CAF82] transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proximosPassos.map(passo => {
          const Icon = passo.icone
          return (
            <Link
              key={passo.id}
              href={passo.href}
              className={`group relative bg-white rounded-2xl border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                passo.concluido
                  ? 'border-emerald-100 bg-emerald-50/30'
                  : 'border-gray-100 hover:border-[#1A4D3A]/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  passo.concluido
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#1A4D3A]/5 text-[#1A4D3A]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-zinc-900">{passo.titulo}</h3>
                    {passo.concluido && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Concluído
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {passo.descricao}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1A4D3A] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
