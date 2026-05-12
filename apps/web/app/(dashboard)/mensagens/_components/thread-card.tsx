import Link from 'next/link'
import { User, Megaphone, Bot, Archive } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { MessageThreadOrigem } from '@mallora/types'

export interface ThreadItem {
  id: string
  consumer_nome: string | null
  origem: MessageThreadOrigem
  ultima_em: string
  nao_lidas_lojista: number
  arquivada: boolean
  ultimo_corpo: string | null
}

const META: Record<MessageThreadOrigem, { Icone: typeof User; rotulo: string }> = {
  cliente: { Icone: User, rotulo: 'Cliente' },
  plataforma: { Icone: Bot, rotulo: 'Plataforma' },
  broadcast: { Icone: Megaphone, rotulo: 'Broadcast' },
}

function tempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h`
  const diffD = Math.round(diffH / 24)
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `há ${diffD}d`
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function snippet(corpo: string | null): string {
  if (!corpo) return 'Sem mensagens ainda'
  const limpo = corpo.replace(/\s+/g, ' ').trim()
  return limpo.length > 120 ? `${limpo.slice(0, 117)}…` : limpo
}

export function ThreadCard({ thread }: { thread: ThreadItem }) {
  const { Icone, rotulo } = META[thread.origem]
  const naoLidas = thread.nao_lidas_lojista

  return (
    <Link href={`/mensagens/${thread.id}`} className="block">
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-2)' }} aria-hidden>
            <Icone className="w-5 h-5" style={{ color: 'var(--ink-2)' }} strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink truncate">{thread.consumer_nome ?? 'Cliente'}</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}>
                {rotulo}
              </span>
              {thread.arquivada && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}>
                  <Archive className="w-3 h-3" /> Arquivada
                </span>
              )}
              <span className="text-[11px] text-ink-3 ml-auto shrink-0">{tempoRelativo(thread.ultima_em)}</span>
            </div>
            <p className="mt-1 text-sm text-ink-2 truncate">{snippet(thread.ultimo_corpo)}</p>
          </div>

          {naoLidas > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              aria-label={`${naoLidas} não lidas`}
            >
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
