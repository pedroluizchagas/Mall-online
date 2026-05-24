'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { formatarReais } from '@/lib/format'
import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * PixClient — port RN→DOM de apps/mobile-consumer/app/checkout/pix.tsx
 * (Stage 3d). Lê `orders` (sessão consumer = 3e) e assina Realtime do
 * pedido; ao `payment_status === 'pago'` vai p/ `/pedido/${id}` (3f).
 * Estrutural/inerte: pré-3e não há pedido (fluxoPix não conclui sem
 * sessão), então cai no estado de erro "Pedido não encontrado".
 * `Share` RN → Web Share API / clipboard.
 */

interface PixOrder {
  id: string
  total: number
  payment_status: string
  pagarme_qr_code: string | null
  pagarme_qr_code_url: string | null
  pagarme_qr_code_expires_at: string | null
}

export function PixClient({ orderId }: { orderId: string | null }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [pedido, setPedido] = useState<PixOrder | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setErro('Pedido não informado.')
      setCarregando(false)
      return
    }

    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, total, payment_status, pagarme_qr_code, pagarme_qr_code_url, pagarme_qr_code_expires_at'
        )
        .eq('id', orderId!)
        .single()

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setPedido(data as PixOrder)
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [orderId, supabase])

  useEffect(() => {
    if (!orderId) return

    const canal = supabase
      .channel(`pedido-pix-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const novo = payload.new as PixOrder
          setPedido((prev) => (prev ? { ...prev, ...novo } : prev))

          if (novo.payment_status === 'pago') {
            router.replace(`/pedido/${orderId}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [orderId, supabase, router])

  async function compartilharCodigo() {
    if (!pedido?.pagarme_qr_code) return
    try {
      if (navigator.share) {
        await navigator.share({ text: pedido.pagarme_qr_code })
      } else {
        await navigator.clipboard.writeText(pedido.pagarme_qr_code)
      }
    } catch {
      // Cancelado/indisponível — sem ação (paridade com o mobile).
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-ink" />
        <p className="mt-4 text-sm font-semibold text-ink-muted">
          Gerando seu Pix…
        </p>
      </div>
    )
  }

  if (erro || !pedido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-lg font-extrabold text-ink">
          Não foi possível abrir o pagamento
        </p>
        <p className="text-sm font-medium text-ink-muted">
          {erro ?? 'Pedido não encontrado.'}
        </p>
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="h-12 rounded-pill bg-accent px-6 text-sm font-extrabold text-ink"
        >
          Voltar ao início
        </button>
      </div>
    )
  }

  const aguardandoQr =
    !pedido.pagarme_qr_code_url || !pedido.pagarme_qr_code

  return (
    <div className="min-h-screen bg-canvas pb-10">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold text-ink">
          Pagamento via Pix
        </h1>
      </header>

      <div className="px-4 pt-2">
        <div className="rounded-lg bg-surface p-6 shadow-soft">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                Total a pagar
              </p>
              <p className="text-[28px] font-extrabold tracking-tight text-ink">
                {formatarReais(pedido.total)}
              </p>
            </div>

            {aguardandoQr ? (
              <div className="flex h-60 w-60 flex-col items-center justify-center gap-3 rounded-md bg-canvasAlt">
                <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-ink" />
                <p className="text-[13px] font-medium text-ink-muted">
                  Aguardando QR Code…
                </p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pedido.pagarme_qr_code_url!}
                alt="QR Code Pix"
                width={240}
                height={240}
                className="h-60 w-60 rounded-md bg-surface object-contain"
              />
            )}

            <p className="text-center text-[13px] font-medium leading-relaxed text-ink-muted">
              Aponte o app do seu banco para o QR Code ou copie o código
              abaixo.
            </p>
          </div>
        </div>
      </div>

      {!aguardandoQr && (
        <div className="px-4 pt-4">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Pix Copia e Cola
          </p>
          <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-soft">
            <p className="break-all rounded-sm bg-canvasAlt p-3 font-mono text-xs font-medium text-ink">
              {pedido.pagarme_qr_code}
            </p>
            <button
              type="button"
              onClick={compartilharCodigo}
              className="h-12 w-full rounded-pill bg-accent text-sm font-extrabold text-ink transition-opacity hover:opacity-90"
            >
              Copiar / Compartilhar código
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-soft">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-ink">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </span>
          <p className="flex-1 text-[13px] font-medium leading-relaxed text-ink">
            Aguardando confirmação do pagamento. Esta tela atualiza
            automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
