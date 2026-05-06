'use client'

import { useTransition } from 'react'
import { atualizarStatusTenant } from '@/lib/actions/admin'
import { ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react'

const BADGES: Record<string, { bg: string; text: string; label: string }> = {
  trial:     { bg: 'bg-sky/10',     text: 'text-sky',     label: 'Trial' },
  ativa:     { bg: 'bg-ok/10',      text: 'text-ok',      label: 'Ativa' },
  em_atraso: { bg: 'bg-warn/10',    text: 'text-warn',    label: 'Em atraso' },
  cancelada: { bg: 'bg-err/10',     text: 'text-err',     label: 'Cancelada' },
  suspensa:  { bg: 'bg-bg-3',       text: 'text-ink-3',   label: 'Suspensa' },
}

const PAGARME_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: 'bg-ok/10',   text: 'text-ok',    label: 'Ativo' },
  affiliation:  { bg: 'bg-sky/10',  text: 'text-sky',   label: 'Em análise' },
  registration: { bg: 'bg-warn/10', text: 'text-warn',  label: 'Cadastro' },
  pending:      { bg: 'bg-warn/10', text: 'text-warn',  label: 'Pendente' },
  refused:      { bg: 'bg-err/10',  text: 'text-err',   label: 'Recusado' },
  blocked:      { bg: 'bg-err/10',  text: 'text-err',   label: 'Bloqueado' },
  suspended:    { bg: 'bg-bg-3',    text: 'text-ink-3', label: 'Suspenso' },
  inactive:     { bg: 'bg-bg-3',    text: 'text-ink-3', label: 'Inativo' },
}

const PAGARME_FALLBACK = { bg: 'bg-bg-3', text: 'text-ink-3', label: 'Não iniciado' }

export function TabelaTenants({ tenants }: { tenants: any[] }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await atualizarStatusTenant(id, !ativo)
    })
  }

  if (tenants.length === 0) {
    return (
      <div className="bg-bg rounded-lg border border-line py-16 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-ink-3 text-[13px]">Nenhum lojista encontrado.</p>
      </div>
    )
  }

  return (
    <div className="bg-bg rounded-lg border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line bg-bg-2">
            <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              Lojista
            </th>
            <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              Plano
            </th>
            <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              Assinatura
            </th>
            <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              Recebimentos
            </th>
            <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              Cadastro
            </th>
            <th className="px-5 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tenants.map((tenant: any) => {
            const sub = tenant.tenant_subscriptions?.[0]
            const plano = sub?.plans
            const badge = sub
              ? (BADGES[sub.billing_status] ?? { bg: 'bg-bg-3', text: 'text-ink-3', label: sub.billing_status })
              : null
            const pagarmeStatus = tenant.pagarme_onboarding_status
            const pagarmeBadge = pagarmeStatus
              ? (PAGARME_BADGES[pagarmeStatus] ?? {
                  bg: 'bg-bg-3', text: 'text-ink-3', label: pagarmeStatus,
                })
              : PAGARME_FALLBACK

            return (
              <tr key={tenant.id} className="hover:bg-bg-2 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{tenant.nome_responsavel}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5">{tenant.email}</p>
                  {tenant.stores?.[0] && (
                    <p className="text-[11px] text-brick-dk mt-0.5">{tenant.stores[0].nome}</p>
                  )}
                </td>

                <td className="px-5 py-4 text-ink-2">{plano?.nome ?? '—'}</td>

                <td className="px-5 py-4">
                  {badge ? (
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  ) : (
                    <span className="text-ink-3 text-[13px]">Sem assinatura</span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${pagarmeBadge.bg} ${pagarmeBadge.text}`}>
                    {pagarmeBadge.label}
                  </span>
                </td>

                <td className="px-5 py-4 text-[13px] text-ink-3">
                  {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/lojistas/${tenant.id}`}
                      className="flex items-center gap-1 text-[11px] text-brick-dk hover:text-ink font-medium transition-colors"
                    >
                      <ExternalLink size={12} />
                      Ver
                    </a>
                    <button
                      onClick={() => handleToggle(tenant.id, tenant.ativo)}
                      disabled={isPending}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border font-bold
                        transition-all disabled:opacity-50 ${
                        tenant.ativo
                          ? 'border-err/30 text-err hover:bg-err/5'
                          : 'border-ok/30 text-ok hover:bg-ok/5'
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
