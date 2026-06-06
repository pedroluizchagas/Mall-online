import Link from 'next/link'
import { Package, Clock, Truck, CreditCard, ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react'

interface ProximoPasso {
  id: string
  titulo: string
  descricao: string
  href: string
  icone: LucideIcon
  concluido: boolean
}

interface Props {
  nomeLoja: string
  recebimentosOk: boolean
  temProdutos: boolean
  horariosConfigurados: boolean
  entregaConfigurada: boolean
}

export function SetupWizard({
  nomeLoja,
  recebimentosOk,
  temProdutos,
  horariosConfigurados,
  entregaConfigurada,
}: Props) {
  const proximosPassos: ProximoPasso[] = [
    {
      id: 'recebimentos',
      titulo: 'Configurar recebimentos',
      descricao: 'Conclua a verificação Pagar.me para receber pagamentos.',
      href: '/configuracoes?aba=recebimentos',
      icone: CreditCard,
      concluido: recebimentosOk,
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

  const concluidos = proximosPassos.filter((p) => p.concluido).length
  const total = proximosPassos.length
  const progresso = Math.round((concluidos / total) * 100)

  return (
    <div className="p-6 lg:p-9 slide-up">
      <div className="max-w-3xl mx-auto">
        <div className="mb-7">
          <h1 className="font-display text-[34px] text-ink leading-tight">{nomeLoja}</h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Complete a configuração abaixo para começar a receber pedidos.
          </p>
        </div>

        {/* Progress hero */}
        <div
          className="relative rounded-xl p-7 mb-5 overflow-hidden"
          style={{ background: 'var(--ink)' }}
        >
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'var(--brick)', opacity: 0.07 }}
          />
          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'rgba(245,245,240,0.5)' }}
              >
                Configuração da loja
              </p>
              <div className="flex items-end gap-3">
                <span
                  className="font-display leading-none tracking-tighter"
                  style={{ fontSize: 56, color: 'var(--bg)' }}
                >
                  {progresso}
                </span>
                <span className="text-2xl font-semibold mb-1.5" style={{ color: 'rgba(245,245,240,0.5)' }}>
                  %
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: 'rgba(245,245,240,0.5)' }}>
                <span className="font-medium" style={{ color: 'rgba(245,245,240,0.85)' }}>
                  {concluidos}
                </span>{' '}
                de{' '}
                <span className="font-medium" style={{ color: 'rgba(245,245,240,0.85)' }}>
                  {total}
                </span>{' '}
                etapas concluídas
              </p>
            </div>

            <div className="hidden sm:flex flex-col gap-2 pt-1">
              {proximosPassos.map((passo) => (
                <div key={passo.id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: passo.concluido ? 'var(--brick)' : 'rgba(245,245,240,0.15)',
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: passo.concluido ? 'rgba(245,245,240,0.7)' : 'rgba(245,245,240,0.4)' }}
                  >
                    {passo.titulo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative z-10 mt-6 h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(245,245,240,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ background: 'var(--brick)', width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {proximosPassos.map((passo, index) => {
            const Icon = passo.icone
            return (
              <Link
                key={passo.id}
                href={passo.href}
                className={`group relative rounded-lg border p-5 transition-all ${
                  passo.concluido
                    ? 'opacity-70 hover:opacity-100'
                    : 'hover:shadow-md hover:-translate-y-px'
                }`}
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--line)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                    style={
                      passo.concluido
                        ? { background: 'var(--brick)', color: 'var(--brick-ink)' }
                        : { background: 'var(--bg-2)', color: 'var(--ink-3)' }
                    }
                  >
                    {passo.concluido ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-ink-3 font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-[13.5px] font-semibold text-ink leading-tight">
                        {passo.titulo}
                      </h3>
                    </div>
                    <p className="text-[12.5px] text-ink-3 leading-relaxed">{passo.descricao}</p>
                  </div>

                  <ArrowRight
                    className="w-4 h-4 flex-shrink-0 mt-1 transition-all text-ink-3 group-hover:translate-x-0.5"
                  />
                </div>

                {passo.concluido && (
                  <div className="absolute top-3.5 right-3.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--brick-lt)', color: 'var(--ink)' }}
                    >
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
