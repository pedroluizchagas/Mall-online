'use client'

import { useTransition } from 'react'
import { atualizarStatusTenant } from '@/lib/actions/admin'

const CORES_BILLING: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  ativa: 'bg-green-100 text-green-700',
  em_atraso: 'bg-amber-100 text-amber-700',
  cancelada: 'bg-red-100 text-red-700',
  suspensa: 'bg-gray-100 text-gray-700',
}

const LABELS_BILLING: Record<string, string> = {
  trial: 'Trial',
  ativa: 'Ativa',
  em_atraso: 'Em atraso',
  cancelada: 'Cancelada',
  suspensa: 'Suspensa',
}

export function TabelaTenants({ tenants }: { tenants: any[] }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await atualizarStatusTenant(id, !ativo)
    })
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Nenhum lojista encontrado.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Lojista
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Plano
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Assinatura
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Stripe KYC
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Cadastro
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant: any) => {
            const sub = tenant.tenant_subscriptions?.[0]
            const plano = sub?.plans

            return (
              <tr
                key={tenant.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">
                    {tenant.nome_responsavel}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{tenant.email}</p>
                  {tenant.stores?.[0] && (
                    <p className="text-xs text-gray-400">
                      {tenant.stores[0].nome}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className="text-gray-700">
                    {plano?.nome ?? '—'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {sub ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${CORES_BILLING[sub.billing_status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {LABELS_BILLING[sub.billing_status] ?? sub.billing_status}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Sem assinatura</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      tenant.stripe_onboarding_ok
                        ? 'text-green-600'
                        : 'text-amber-500'
                    }`}
                  >
                    {tenant.stripe_onboarding_ok ? 'Verificado' : 'Pendente'}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/lojistas/${tenant.id}`}
                      className="text-xs text-[#4CAF82] hover:underline"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleToggle(tenant.id, tenant.ativo)}
                      disabled={isPending}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors
                        disabled:opacity-50 ${
                        tenant.ativo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {tenant.ativo ? 'Suspender' : 'Reativar'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
