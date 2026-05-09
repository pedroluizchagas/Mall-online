'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { alternarStatusLoja } from '@/lib/actions/loja-vitrine'
import { showToast } from '@/components/ui/toast'

interface Props {
  inicialAtivo: boolean
}

export function StoreStatusToggle({ inicialAtivo }: Props) {
  const [ativo, setAtivo] = useState(inicialAtivo)
  const [pendente, setPendente] = useState<boolean | null>(null)
  const [isPending, startTransition] = useTransition()

  function pedirConfirmacao(novoAtivo: boolean) {
    if (novoAtivo === ativo) return
    setPendente(novoAtivo)
  }

  function confirmar() {
    if (pendente === null) return
    const novoAtivo = pendente
    const anterior = ativo
    setAtivo(novoAtivo)
    setPendente(null)

    startTransition(async () => {
      const r = await alternarStatusLoja(novoAtivo)
      if ('erro' in r) {
        setAtivo(anterior)
        showToast({
          tipo: 'erro',
          titulo: 'Não foi possível alterar o status',
          descricao: r.erro,
        })
        return
      }
      showToast({
        tipo: 'sucesso',
        titulo: novoAtivo ? 'Loja reaberta' : 'Loja pausada',
      })
    })
  }

  function cancelar() {
    setPendente(null)
  }

  const corPonto = ativo ? 'var(--ok)' : 'var(--warn)'

  return (
    <>
      <div className="relative inline-flex">
        <select
          value={ativo ? 'aberta' : 'pausada'}
          onChange={(e) => pedirConfirmacao(e.target.value === 'aberta')}
          disabled={isPending}
          aria-label="Status da loja"
          className="appearance-none pl-7 pr-8 py-1.5 rounded-full text-xs font-semibold border bg-bg cursor-pointer disabled:opacity-60"
          style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
        >
          <option value="aberta">Aberta</option>
          <option value="pausada">Pausada</option>
        </select>
        <span
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
          style={{ background: corPonto }}
        />
        <ChevronDown
          aria-hidden
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-ink-3"
        />
      </div>

      {pendente !== null && (
        <ConfirmDialog
          titulo={pendente ? 'Reabrir a loja agora?' : 'Pausar a loja?'}
          descricao={
            pendente
              ? 'Clientes poderão fazer pedidos novamente.'
              : 'Tem certeza? Clientes não poderão pedir até reabrir.'
          }
          rotuloConfirmar={pendente ? 'Reabrir' : 'Pausar'}
          onConfirmar={confirmar}
          onCancelar={cancelar}
        />
      )}
    </>
  )
}

function ConfirmDialog({
  titulo,
  descricao,
  rotuloConfirmar,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  descricao: string
  rotuloConfirmar: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-status-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,13,0.45)' }}
      onClick={onCancelar}
    >
      <div
        className="rounded-2xl shadow-xl max-w-sm w-full p-5"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-status-titulo" className="font-semibold text-ink text-base">
          {titulo}
        </h2>
        <p className="text-sm text-ink-3 mt-2 leading-relaxed">{descricao}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
            style={{ color: 'var(--ink-2)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
