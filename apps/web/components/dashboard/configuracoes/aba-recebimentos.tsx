'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

const ROTULO_STATUS: Record<string, string> = {
  pending: 'Em verificação',
  active: 'Verificado',
  refused: 'Reprovado',
  suspended: 'Suspenso',
  registration: 'Cadastro em andamento',
  affiliation: 'Afiliação em andamento',
  blocked: 'Bloqueado',
  inactive: 'Inativo',
}

const COR_STATUS: Record<string, string> = {
  pending: 'var(--warn)',
  active: 'var(--ok)',
  refused: 'var(--brick)',
  suspended: 'var(--brick)',
  registration: 'var(--warn)',
  affiliation: 'var(--warn)',
  blocked: 'var(--brick)',
  inactive: 'var(--ink-3)',
}

const DESCRICAO_STATUS: Record<string, string> = {
  pending: 'Estamos analisando seus dados — você pode acompanhar pelo link de KYC.',
  active: 'Sua conta está pronta para receber repasses.',
  refused: 'O cadastro foi recusado pelo Pagar.me. Entre em contato com o suporte.',
  suspended: 'Sua conta está suspensa. Entre em contato com o suporte.',
  registration: 'Conclua os dados de cadastro para liberar os recebimentos.',
  affiliation: 'Aguardando aprovação final da Pagar.me.',
  blocked: 'Conta bloqueada. Entre em contato com o suporte.',
  inactive: 'Conta inativa. Reative pelo painel ou entre em contato.',
}

function rotuloStatus(status: string): string {
  return ROTULO_STATUS[status] ?? 'Não iniciado'
}

function corStatus(status: string): string {
  return COR_STATUS[status] ?? 'var(--ink-3)'
}

function descricaoStatus(status: string): string {
  return (
    DESCRICAO_STATUS[status] ??
    'Status não reconhecido. Entre em contato com o suporte se persistir.'
  )
}

interface Props {
  tenant: {
    pagarme_recipient_id: string | null
    pagarme_onboarding_status: string
    pagarme_kyc_link: string | null
  }
}

export function AbaRecebimentos({ tenant }: Props) {
  const status = tenant.pagarme_onboarding_status
  const [carregandoKyc, setCarregandoKyc] = useState(false)
  const [erroKyc, setErroKyc] = useState<string | null>(null)
  const [linkKyc, setLinkKyc] = useState<string | null>(tenant.pagarme_kyc_link)

  async function abrirKyc() {
    setCarregandoKyc(true)
    setErroKyc(null)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-pagarme-kyc-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
        }
      )

      const resultado = await resposta.json()
      if (!resposta.ok || !resultado.kyc_link) {
        throw new Error(resultado.error ?? 'Não foi possível obter o link de verificação')
      }

      setLinkKyc(resultado.kyc_link)
      window.open(resultado.kyc_link, '_blank', 'noopener,noreferrer')
    } catch (e: unknown) {
      setErroKyc(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setCarregandoKyc(false)
    }
  }

  const mostrarBotaoKyc = status !== 'active'

  return (
    <div
      className="rounded-xl p-5 space-y-6"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <div>
        <h2 className="font-semibold text-ink mb-1">Conta de recebimentos</h2>
        <p className="text-sm text-ink-3">
          Sua conta Pagar.me para receber os repasses dos pedidos.
        </p>
      </div>

      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: 'var(--bg-2)' }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: corStatus(status) }}
        />
        <div>
          <p className="text-sm font-medium text-ink">{rotuloStatus(status)}</p>
          <p className="text-xs text-ink-3 mt-0.5">{descricaoStatus(status)}</p>
        </div>
      </div>

      {tenant.pagarme_recipient_id && (
        <div>
          <p className="text-xs text-ink-3 mb-1">ID do recebedor Pagar.me</p>
          <p
            className="text-sm font-mono px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
          >
            {tenant.pagarme_recipient_id}
          </p>
        </div>
      )}

      {mostrarBotaoKyc && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={abrirKyc}
            disabled={carregandoKyc}
            className="block w-full text-center py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            {carregandoKyc ? 'Abrindo...' : 'Abrir KYC'}
          </button>
          {linkKyc && (
            <p className="text-xs text-ink-3 text-center">
              Caso o pop-up tenha sido bloqueado,{' '}
              <a
                href={linkKyc}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                clique aqui
              </a>
              .
            </p>
          )}
          {erroKyc && (
            <p className="text-xs text-center" style={{ color: 'var(--brick)' }}>
              {erroKyc}
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-ink-3 space-y-1">
        <p>
          Seus dados bancários são armazenados com segurança pelo Pagar.me.
          A plataforma não tem acesso aos dados da sua conta bancária.
        </p>
        <p>
          O status do cadastro é atualizado automaticamente após a análise do Pagar.me.
        </p>
      </div>
    </div>
  )
}
