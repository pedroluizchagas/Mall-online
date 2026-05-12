'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SupportTicketPrioridade, SupportTicketStatus } from '@mallora/types'
import { Card } from '@/components/ui/card'
import { AcaoStatusButton } from './acao-status-button'

export interface TicketItem {
  id: string
  assunto: string
  mensagem: string
  prioridade: SupportTicketPrioridade
  status: SupportTicketStatus
  criada_em: string
  atualizada_em: string
}

const CORES_PRIORIDADE: Record<SupportTicketPrioridade, { bg: string; fg: string; bd: string; label: string }> = {
  baixa:   { bg: 'rgba(91,138,199,0.10)', fg: 'var(--sky)',  bd: 'rgba(91,138,199,0.28)', label: 'Baixa' },
  normal:  { bg: 'rgba(120,120,120,0.10)', fg: 'var(--ink-2)', bd: 'var(--line)',          label: 'Normal' },
  alta:    { bg: 'rgba(224,166,26,0.12)', fg: 'var(--warn)', bd: 'rgba(224,166,26,0.30)', label: 'Alta' },
  critica: { bg: 'rgba(224,90,59,0.10)',  fg: 'var(--err)',  bd: 'rgba(224,90,59,0.28)',  label: 'Crítica' },
}

const CORES_STATUS: Record<SupportTicketStatus, { bg: string; fg: string; bd: string; label: string }> = {
  aberto:        { bg: 'rgba(91,138,199,0.10)', fg: 'var(--sky)',  bd: 'rgba(91,138,199,0.28)', label: 'Aberto' },
  em_andamento:  { bg: 'rgba(224,166,26,0.12)', fg: 'var(--warn)', bd: 'rgba(224,166,26,0.30)', label: 'Em andamento' },
  resolvido:     { bg: 'rgba(79,176,37,0.10)',  fg: 'var(--ok)',   bd: 'rgba(79,176,37,0.25)',  label: 'Resolvido' },
  fechado:       { bg: 'rgba(120,120,120,0.10)', fg: 'var(--ink-3)', bd: 'var(--line)',         label: 'Fechado' },
}

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} d`
  const meses = Math.floor(d / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(d / 365)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

function Badge({ cor }: { cor: { bg: string; fg: string; bd: string; label: string } }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cor.bg, color: cor.fg, border: `1px solid ${cor.bd}` }}
    >{cor.label}</span>
  )
}

export function TicketCard({ ticket }: { ticket: TicketItem }) {
  const [aberto, setAberto] = useState(false)
  const corPrio = CORES_PRIORIDADE[ticket.prioridade]
  const corStatus = CORES_STATUS[ticket.status]
  const snippet = ticket.mensagem.length > 140 ? `${ticket.mensagem.slice(0, 140)}…` : ticket.mensagem

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-ink text-sm">{ticket.assunto}</h3>
              <Badge cor={corPrio} />
              <Badge cor={corStatus} />
            </div>
            <p className="mt-1.5 text-xs text-ink-3">
              Atualizado {tempoRelativo(ticket.atualizada_em)}
            </p>
            {!aberto && (
              <p className="mt-2 text-sm text-ink-2 leading-relaxed line-clamp-2">{snippet}</p>
            )}
          </div>
          <ChevronDown
            className="w-4 h-4 text-ink-3 shrink-0 transition-transform"
            style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden
          />
        </div>
      </button>

      {aberto && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{ticket.mensagem}</p>
          <div className="mt-4 flex justify-end">
            <AcaoStatusButton ticketId={ticket.id} status={ticket.status} />
          </div>
        </div>
      )}
    </Card>
  )
}
