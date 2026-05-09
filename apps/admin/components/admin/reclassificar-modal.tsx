'use client'

import { useState, useTransition } from 'react'
import { Tag, X } from 'lucide-react'
import { reclassificarLoja } from '@/lib/actions/reclassificar'

type CategoriaOpcao = { id: string; slug: string | null; nome: string }

export function ReclassificarModal({
  storeId,
  storeNome,
  categorias,
}: {
  storeId: string
  storeNome: string
  categorias: CategoriaOpcao[]
}) {
  const [aberto, setAberto] = useState(false)
  const [categoriaId, setCategoriaId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function fechar() {
    setAberto(false)
    setErro(null)
    setCategoriaId('')
    setMotivo('')
  }

  function enviar() {
    setErro(null)
    if (!categoriaId) {
      setErro('Selecione a nova categoria')
      return
    }
    if (motivo.trim().length < 10) {
      setErro('Motivo precisa de pelo menos 10 caracteres')
      return
    }
    const fd = new FormData()
    fd.set('store_id', storeId)
    fd.set('categoria_nova_id', categoriaId)
    fd.set('motivo', motivo.trim())

    startTransition(async () => {
      const res = await reclassificarLoja(fd)
      if (res?.erro) {
        setErro(res.erro)
        return
      }
      fechar()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors hover:bg-bg-2"
        style={{
          borderColor: 'var(--line)',
          color: 'var(--ink-2)',
        }}
      >
        <Tag size={12} />
        Reclassificar
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          role="dialog"
          aria-modal="true"
          onClick={fechar}
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-6"
            style={{
              background: 'var(--bg)',
              boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-bg-2"
              style={{ color: 'var(--ink-3)' }}
            >
              <X size={16} />
            </button>

            <h3 className="font-bold text-[16px] text-ink mb-1">
              Reclassificar loja
            </h3>
            <p className="text-[12px] text-ink-3 mb-5">
              {storeNome} · trocar categoria de "Outros" para um nicho
              específico.
            </p>

            <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">
              Nova categoria
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] mb-4"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            >
              <option value="">Selecione uma categoria…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">
              Motivo da reclassificação
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex.: contato com lojista, identificou-se como pet shop"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] resize-none"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
            <p className="text-[11px] text-ink-3 mt-1">
              {motivo.length}/500 · mínimo 10 caracteres.
            </p>

            {erro && (
              <p
                className="text-[12px] mt-3 px-3 py-2 rounded-lg"
                style={{ background: '#fee2e2', color: '#991b1b' }}
              >
                {erro}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={fechar}
                disabled={pending}
                className="px-4 py-2 rounded-full text-[13px] font-medium"
                style={{ color: 'var(--ink-2)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={pending}
                className="px-5 py-2 rounded-full text-[13px] font-bold disabled:opacity-50"
                style={{
                  background: 'var(--brick)',
                  color: 'var(--brick-ink)',
                }}
              >
                {pending ? 'Reclassificando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
