import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { MessageAutorTipo, MessageThreadOrigem } from '@mallora/types'
import { marcarThreadLida } from '../actions'
import { MensagemBubble, type MensagemItem } from '../_components/mensagem-bubble'
import { AcaoArquivarButton } from '../_components/acao-arquivar-button'
import { RealtimeThread } from '../_components/realtime-thread'
import { Composer } from '../_components/composer'

interface LinhaThread {
  id: string
  tenant_id: string
  arquivada: boolean
  origem: string
  consumers: { nome: string | null; telefone: string | null } | { nome: string | null; telefone: string | null }[] | null
}

const ROTULOS_ORIGEM: Record<MessageThreadOrigem, string> = {
  cliente: 'Iniciada pelo cliente',
  plataforma: 'Iniciada pela plataforma',
  broadcast: 'Broadcast',
}

export default async function PaginaThread({ params }: { params: { threadId: string } }) {
  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return <div className="p-9"><p className="text-ink-3">Tenant não encontrado.</p></div>
  }

  const { data: threadRaw } = await supabase
    .from('message_threads')
    .select('id, tenant_id, arquivada, origem, consumers!left(nome, telefone)')
    .eq('id', params.threadId)
    .maybeSingle()

  const thread = threadRaw as LinhaThread | null
  if (!thread || thread.tenant_id !== tenant.id) notFound()

  const { data: mensagensRaw } = await supabase
    .from('messages')
    .select('id, autor_tipo, corpo, criada_em')
    .eq('thread_id', thread.id)
    .order('criada_em', { ascending: true })
    .limit(50)

  const mensagens: MensagemItem[] = (mensagensRaw ?? []).map((m) => ({
    id: m.id as string,
    autor_tipo: (m.autor_tipo as MessageAutorTipo) ?? 'sistema',
    corpo: m.corpo as string,
    criada_em: m.criada_em as string,
  }))

  // Marcar como lida ao abrir (revalida lista para atualizar contador).
  await marcarThreadLida(thread.id)

  const consumer = Array.isArray(thread.consumers) ? thread.consumers[0] : thread.consumers
  const nomeConsumer = consumer?.nome ?? 'Cliente'
  const telefoneConsumer = consumer?.telefone ?? null
  const origem = (thread.origem as MessageThreadOrigem) ?? 'cliente'

  return (
    <div className="p-9 slide-up max-w-3xl mx-auto w-full">
      <Link href="/mensagens" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para mensagens
      </Link>

      <header className="mb-5 p-4 rounded-2xl flex items-start justify-between gap-4 flex-wrap" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-tight m-0">{nomeConsumer}</h1>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-3 flex-wrap">
            <span>{ROTULOS_ORIGEM[origem]}</span>
            {telefoneConsumer && (
              <>
                <span>·</span>
                <a href={`tel:${telefoneConsumer}`} className="inline-flex items-center gap-1 hover:underline">
                  <Phone className="w-3 h-3" /> {telefoneConsumer}
                </a>
              </>
            )}
          </div>
        </div>
        <AcaoArquivarButton threadId={thread.id} arquivada={thread.arquivada} />
      </header>

      {mensagens.length === 0 ? (
        <div className="p-8 rounded-2xl text-center" style={{ background: 'var(--bg)', border: '1px dashed var(--line)' }}>
          <MessageCircle className="w-6 h-6 mx-auto mb-2 text-ink-3" strokeWidth={1.75} />
          <p className="text-sm text-ink-2 font-medium">Sem mensagens nesta conversa ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mensagens.map((m) => <MensagemBubble key={m.id} mensagem={m} />)}
        </div>
      )}

      {thread.arquivada ? (
        <div
          className="mt-6 p-4 rounded-2xl text-center"
          style={{ background: 'rgba(91,138,199,0.08)', border: '1px dashed rgba(91,138,199,0.30)' }}
        >
          <p className="text-sm text-ink-2 font-medium">
            Conversa arquivada. Desarquive para responder.
          </p>
        </div>
      ) : (
        <Composer threadId={thread.id} />
      )}

      <RealtimeThread threadId={thread.id} />
    </div>
  )
}
