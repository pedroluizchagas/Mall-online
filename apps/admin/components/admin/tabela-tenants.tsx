'use client'

import { useTransition } from 'react'
import { atualizarStatusTenant } from '@/lib/actions/admin'
import { ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react'

const BADGES: Record<string, { bg: string; text: string; label: string }> = {
  trial:     { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Trial' },
  ativa:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Ativa' },
  em_atraso: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Em atraso' },
  cancelada: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelada' },
  suspensa:  { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Suspensa' },
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card py-16 text-center">
        <p className="text-gray-400 text-sm">Nenhum lojista encontrado.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Lojista
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Plano
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Assinatura
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Stripe KYC
            </th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cadastro
            </th>
            <th className="px-5 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tenants.map((tenant: any) => {
            const sub = tenant.tenant_subscriptions?.[0]
            const plano = sub?.plans
            const badge = sub ? (BADGES[sub.billing_status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: sub.billing_status }) : null

            return (
              <tr key={tenant.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-800">{tenant.nome_responsavel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tenant.email}</p>
                  {tenant.stores?.[0] && (
                    <p className="text-xs text-[#4CAF82] mt-0.5">{tenant.stores[0].nome}</p>
                  )}
                </td>

                <td className="px-5 py-4 text-gray-600 text-sm">{plano?.nome ?? '—'}</td>

                <td className="px-5 py-4">
                  {badge ? (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Sem assinatura</span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold ${
                    tenant.stripe_onboarding_ok ? 'text-emerald-600' : 'text-amber-500'
                  }`}>
                    {tenant.stripe_onboarding_ok ? '✓ Verificado' : '⏳ Pendente'}
                  </span>
                </td>

                <td className="px-5 py-4 text-xs text-gray-400">
                  {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/lojistas/${tenant.id}`}
                      className="flex items-center gap-1 text-xs text-[#4CAF82] hover:text-[#1A4D3A] font-medium transition-colors"
                    >
                      <ExternalLink size={12} />
                      Ver
                    </a>
                    <button
                      onClick={() => handleToggle(tenant.id, tenant.ativo)}
                      disabled={isPending}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium
                        transition-all disabled:opacity-50 ${
                        tenant.ativo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {tenant.ativo ? (
                        <><ToggleRight size={12} /> Suspender</>
                      ) : (
                        <><ToggleLeft size={12} /> Reativar</>
                      )}
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
