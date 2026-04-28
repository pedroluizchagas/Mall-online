'use client'

import { useTransition } from 'react'
import { atualizarStatusEntregador } from '@/lib/actions/admin'
import { ExternalLink } from 'lucide-react'

export function TabelaEntregadores({ entregadores }: { entregadores: any[] }) {
  const [isPending, startTransition] = useTransition()

  function handleAprovar(id: string) {
    startTransition(async () => { await atualizarStatusEntregador(id, 'aprovado') })
  }

  function handleReprovar(id: string) {
    startTransition(async () => { await atualizarStatusEntregador(id, 'reprovado') })
  }

  function handleSuspender(id: string) {
    startTransition(async () => { await atualizarStatusEntregador(id, 'suspenso') })
  }

  if (entregadores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card py-16 text-center">
        <p className="text-gray-400 text-sm">Nenhum entregador encontrado com este status.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {['Entregador', 'Tipo', 'Veículo', 'CNH', 'Stripe', 'Cadastro', ''].map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entregadores.map((courier: any) => (
            <tr key={courier.id} className="hover:bg-gray-50/70 transition-colors">
              <td className="px-5 py-4">
                <p className="font-semibold text-gray-800">{courier.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{courier.telefone}</p>
                {courier.tenants && (
                  <p className="text-xs text-[#4CAF82] mt-0.5">
                    {courier.tenants.nome_responsavel}
                  </p>
                )}
              </td>

              <td className="px-5 py-4">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                  courier.tipo === 'autonomo'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {courier.tipo === 'autonomo' ? 'Autônomo' : 'Próprio'}
                </span>
              </td>

              <td className="px-5 py-4 text-gray-600 text-sm capitalize">
                {courier.veiculo_tipo?.replace('_', ' ') ?? '—'}
                {courier.veiculo_placa && (
                  <span className="text-gray-400 ml-1.5 text-xs">({courier.veiculo_placa})</span>
                )}
              </td>

              <td className="px-5 py-4">
                {courier.cnh_foto_url ? (
                  <a
                    href={courier.cnh_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#4CAF82] hover:text-[#1A4D3A] font-medium transition-colors"
                  >
                    <ExternalLink size={11} /> Ver foto
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Não enviada</span>
                )}
              </td>

              <td className="px-5 py-4">
                <span className={`text-xs font-semibold ${
                  courier.stripe_onboarding_ok ? 'text-emerald-600' : 'text-amber-500'
                }`}>
                  {courier.stripe_onboarding_ok ? '✓ OK' : '⏳ Pendente'}
                </span>
              </td>

              <td className="px-5 py-4 text-xs text-gray-400">
                {new Date(courier.criado_em).toLocaleDateString('pt-BR')}
              </td>

              <td className="px-5 py-4">
                <div className="flex gap-1.5">
                  {courier.status === 'pendente' && (
                    <>
                      <ActionBtn
                        onClick={() => handleAprovar(courier.id)}
                        disabled={isPending}
                        variant="success"
                      >
                        Aprovar
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleReprovar(courier.id)}
                        disabled={isPending}
                        variant="danger"
                      >
                        Reprovar
                      </ActionBtn>
                    </>
                  )}
                  {courier.status === 'aprovado' && (
                    <ActionBtn
                      onClick={() => handleSuspender(courier.id)}
                      disabled={isPending}
                      variant="neutral"
                    >
                      Suspender
                    </ActionBtn>
                  )}
                  {['reprovado', 'suspenso'].includes(courier.status) && (
                    <ActionBtn
                      onClick={() => handleAprovar(courier.id)}
                      disabled={isPending}
                      variant="success"
                    >
                      Reativar
                    </ActionBtn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  variant: 'success' | 'danger' | 'neutral'
}) {
  const styles = {
    success: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    danger:  'border-red-200 text-red-600 hover:bg-red-50',
    neutral: 'border-gray-200 text-gray-600 hover:bg-gray-50',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium
        transition-all disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
