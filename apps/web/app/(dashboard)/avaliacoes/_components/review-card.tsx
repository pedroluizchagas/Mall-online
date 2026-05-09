import Link from 'next/link'
import { Flag, MessageCircle, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ResponderForm } from './responder-form'
import { SinalizarDialog } from './sinalizar-dialog'

export interface ReviewItem {
  id: string
  order_id: string
  estrelas_loja: number
  estrelas_entrega: number | null
  comentario: string | null
  resposta_lojista: string | null
  respondida_em: string | null
  sinalizada: boolean
  motivo_sinalizacao: string | null
  criada_em: string
  consumer_nome: string | null
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function Estrelas({ valor, rotulo, sm }: { valor: number; rotulo?: string; sm?: boolean }) {
  const dim = sm ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <div className="inline-flex items-center gap-1" role="img" aria-label={`${rotulo ?? 'Avaliação'}: ${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={dim}
          strokeWidth={1.75}
          style={{
            color: n <= valor ? 'var(--warn)' : 'var(--ink-3)',
            fill: n <= valor ? 'var(--warn)' : 'transparent',
          }}
        />
      ))}
      {rotulo && <span className="text-[11px] text-ink-3 ml-1 font-medium">{rotulo}</span>}
    </div>
  )
}

export function ReviewCard({ review }: { review: ReviewItem }) {
  const respondida = review.respondida_em !== null
  const data = FORMATO_DATA.format(new Date(review.criada_em))

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Estrelas valor={review.estrelas_loja} rotulo="Loja" />
            {review.estrelas_entrega !== null && (
              <Estrelas valor={review.estrelas_entrega} rotulo="Entrega" sm />
            )}
            {review.sinalizada && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: 'rgba(224,90,59,0.10)',
                  color: 'var(--err)',
                  border: '1px solid rgba(224,90,59,0.28)',
                }}
              >
                <Flag className="w-3 h-3" /> Sinalizada
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-3 flex-wrap">
            <span className="font-medium text-ink-2">{review.consumer_nome ?? 'Cliente'}</span>
            <span>·</span>
            <Link
              href={`/pedidos?pedido=${review.order_id}`}
              className="hover:underline"
              style={{ color: 'var(--sky)' }}
            >
              Pedido #{review.order_id.slice(0, 8)}
            </Link>
            <span>·</span>
            <span>{data}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!respondida && <ResponderForm reviewId={review.id} />}
          <SinalizarDialog reviewId={review.id} sinalizada={review.sinalizada} />
        </div>
      </div>

      {review.comentario && (
        <p className="mt-3 text-sm text-ink leading-relaxed whitespace-pre-line">{review.comentario}</p>
      )}

      {review.sinalizada && review.motivo_sinalizacao && (
        <div
          className="mt-3 p-3 rounded-xl text-xs"
          style={{
            background: 'rgba(224,90,59,0.05)',
            border: '1px solid rgba(224,90,59,0.20)',
            color: 'var(--ink-2)',
          }}
        >
          <strong className="text-ink">Motivo: </strong>{review.motivo_sinalizacao}
        </div>
      )}

      {respondida && review.resposta_lojista && (
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2 mb-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Sua resposta
            {review.respondida_em && (
              <span className="text-ink-3 font-normal">· {FORMATO_DATA.format(new Date(review.respondida_em))}</span>
            )}
          </div>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{review.resposta_lojista}</p>
        </div>
      )}
    </Card>
  )
}
