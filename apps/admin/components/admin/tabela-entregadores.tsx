'use client'

import { useTransition } from 'react'
import { atualizarStatusEntregador } from '@/lib/actions/admin'

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
      <div className="text-center py-12 text-gray-400">
        Nenhum entregador encontrado com este status.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Entregador</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Veículo</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">CNH</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Stripe</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Cadastro</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {entregadores.map((courier: any) => (
            <tr key={courier.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{courier.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{courier.telefone}</p>
                {courier.tenants && (
                  <p className="text-xs text-gray-400">
                    Lojista: {courier.tenants.nome_responsavel}
                  </p>
                )}
              </td>

              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  courier.tipo === 'autonomo'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {courier.tipo === 'autonomo' ? 'Autônomo' : 'Próprio'}
                </span>
              </td>

              <td className="px-4 py-3 text-gray-600 capitalize">
                {courier.veiculo_tipo?.replace('_', ' ') ?? '—'}
                {courier.veiculo_placa && (
                  <span className="text-gray-400 ml-1">({courier.veiculo_placa})</span>
                )}
              </td>

              <td className="px-4 py-3">
                {courier.cnh_foto_url ? (
                  <a
                    href={courier.cnh_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#4CAF82] hover:underline"
                  >
                    Ver foto
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Não enviada</span>
                )}
              </td>

              <td className="px-4 py-3">
                <span className={`text-xs font-medium ${
                  courier.stripe_onboarding_ok ? 'text-green-600' : 'text-amber-500'
                }`}>
                  {courier.stripe_onboarding_ok ? 'OK' : 'Pendente'}
                </span>
              </td>

              <td className="px-4 py-3 text-xs text-gray-400">
                {new Date(courier.criado_em).toLocaleDateString('pt-BR')}
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {courier.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => handleAprovar(courier.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-green-50 border border-green-200
                          text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReprovar(courier.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-red-50 border border-red-200
                          text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        Reprovar
                      </button>
                    </>
                  )}
                  {courier.status === 'aprovado' && (
                    <button
                      onClick={() => handleSuspender(courier.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 border border-gray-200
                        text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suspender
                    </button>
                  )}
                  {['reprovado', 'suspenso'].includes(courier.status) && (
                    <button
                      onClick={() => handleAprovar(courier.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 bg-green-50 border border-green-200
                        text-green-700 rounded-lg disabled:opacity-50"
                    >
                      Reativar
                    </button>
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
