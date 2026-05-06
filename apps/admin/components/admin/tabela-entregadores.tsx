'use client'

import { useTransition } from 'react'
import { atualizarStatusEntregador } from '@/lib/actions/admin'
import { ExternalLink } from 'lucide-react'

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
      <div className="bg-bg rounded-lg border border-line py-16 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-ink-3 text-[13px]">Nenhum entregador encontrado com este status.</p>
      </div>
    )
  }

  return (
    <div className="bg-bg rounded-lg border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line bg-bg-2">
            {['Entregador', 'Tipo', 'Veículo', 'CNH', 'Recebimentos', 'Cadastro', ''].map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entregadores.map((courier: any) => {
            const pagarmeStatus = courier.pagarme_onboarding_status
            const pagarmeBadge = pagarmeStatus
              ? (PAGARME_BADGES[pagarmeStatus] ?? {
                  bg: 'bg-bg-3', text: 'text-ink-3', label: pagarmeStatus,
                })
              : PAGARME_FALLBACK
            return (
            <tr key={courier.id} className="hover:bg-bg-2 transition-colors">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{courier.nome}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">{courier.telefone}</p>
                {courier.tenants && (
                  <p className="text-[11px] text-brick-dk mt-0.5">
                    {courier.tenants.nome_responsavel}
                  </p>
                )}
              </td>

              <td className="px-5 py-4">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                  courier.tipo === 'autonomo'
                    ? 'bg-berry/10 text-berry'
                    : 'bg-sky/10 text-sky'
                }`}>
                  {courier.tipo === 'autonomo' ? 'Autônomo' : 'Próprio'}
                </span>
              </td>

              <td className="px-5 py-4 text-ink-2 capitalize">
                {courier.veiculo_tipo?.replace('_', ' ') ?? '—'}
                {courier.veiculo_placa && (
                  <span className="text-ink-3 ml-1.5 text-[11px]">({courier.veiculo_placa})</span>
                )}
              </td>

              <td className="px-5 py-4">
                {courier.cnh_foto_url ? (
                  <a
                    href={courier.cnh_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-brick-dk hover:text-ink font-medium transition-colors"
                  >
                    <ExternalLink size={11} /> Ver foto
                  </a>
                ) : (
                  <span className="text-[13px] text-ink-3">Não enviada</span>
                )}
              </td>

              <td className="px-5 py-4">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${pagarmeBadge.bg} ${pagarmeBadge.text}`}>
                  {pagarmeBadge.label}
                </span>
              </td>

              <td className="px-5 py-4 text-[13px] text-ink-3">
                {new Date(courier.criado_em).toLocaleDateString('pt-BR')}
              </td>

              <td className="px-5 py-4">
                <div className="flex gap-1.5">
                  {courier.status === 'pendente' && (
                    <>
                      <ActionBtn onClick={() => handleAprovar(courier.id)} disabled={isPending} variant="success">
                        Aprovar
                      </ActionBtn>
                      <ActionBtn onClick={() => handleReprovar(courier.id)} disabled={isPending} variant="danger">
                        Reprovar
                      </ActionBtn>
                    </>
                  )}
                  {courier.status === 'aprovado' && (
                    <ActionBtn onClick={() => handleSuspender(courier.id)} disabled={isPending} variant="neutral">
                      Suspender
                    </ActionBtn>
                  )}
                  {['reprovado', 'suspenso'].includes(courier.status) && (
                    <ActionBtn onClick={() => handleAprovar(courier.id)} disabled={isPending} variant="success">
                      Reativar
                    </ActionBtn>
                  )}
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
    success: 'border-ok/30 text-ok hover:bg-ok/5',
    danger:  'border-err/30 text-err hover:bg-err/5',
    neutral: 'border-line text-ink-3 hover:bg-bg-2',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] px-2.5 py-1.5 rounded-full border font-bold
        transition-all disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
