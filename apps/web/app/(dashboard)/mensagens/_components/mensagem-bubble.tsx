import type { MessageAutorTipo } from '@mallora/types'

const FORMATO_HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export interface MensagemItem {
  id: string
  autor_tipo: MessageAutorTipo
  corpo: string
  criada_em: string
}

const ESTILO: Record<MessageAutorTipo, { wrap: string; bubble: React.CSSProperties; meta: string }> = {
  lojista: { wrap: 'justify-end', bubble: { background: 'var(--brick)', color: 'var(--brick-ink)' }, meta: 'text-right' },
  consumer: { wrap: 'justify-start', bubble: { background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--line)' }, meta: 'text-left' },
  sistema: { wrap: 'justify-center', bubble: { background: 'rgba(91,138,199,0.10)', color: 'var(--ink-2)', border: '1px solid rgba(91,138,199,0.28)' }, meta: 'text-center' },
}

export function MensagemBubble({ mensagem }: { mensagem: MensagemItem }) {
  const tipo = mensagem.autor_tipo
  const estilo = ESTILO[tipo] ?? ESTILO.sistema
  const hora = FORMATO_HORA.format(new Date(mensagem.criada_em))
  const max = tipo === 'sistema' ? 'max-w-[80%]' : 'max-w-[72%]'

  return (
    <div className={`flex ${estilo.wrap}`}>
      <div className={`flex flex-col gap-1 ${max}`}>
        <div className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line" style={estilo.bubble}>
          {mensagem.corpo}
        </div>
        <span className={`text-[11px] text-ink-3 ${estilo.meta}`}>{hora}</span>
      </div>
    </div>
  )
}
