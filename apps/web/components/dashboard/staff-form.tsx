'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'

interface StaffMembro {
  id: string
  nome: string
  foto_url: string | null
  cor: string | null
  ativo: boolean
  ordem: number
}

interface Props {
  action: (estado: any, formData: FormData) => Promise<any>
  staff?: StaffMembro
  onCancelar?: () => void
}

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

const CORES_SUGERIDAS = [
  '#e8624a',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6b7280',
]

function BotaoSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

export function StaffForm({ action, staff, onCancelar }: Props) {
  const [estado, dispatch] = useFormState(action, null)
  const [cor, setCor] = useState<string>(staff?.cor ?? CORES_SUGERIDAS[0])
  const [ativo, setAtivo] = useState<boolean>(staff?.ativo ?? true)

  return (
    <form action={dispatch} className="space-y-4">
      {estado?.erro && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: '#fde8e4', color: 'var(--err)' }}
        >
          {estado.erro}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Nome</label>
        <input
          name="nome"
          defaultValue={staff?.nome}
          required
          minLength={2}
          maxLength={80}
          placeholder="Ex: Ana"
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Foto (URL)</label>
        <input
          name="foto_url"
          type="url"
          defaultValue={staff?.foto_url ?? ''}
          placeholder="https://..."
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
        <p className="text-xs text-ink-3 mt-1">Opcional. Cole a URL da foto da/o profissional.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">
          Cor no calendário
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {CORES_SUGERIDAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              aria-label={`Escolher cor ${c}`}
              className="w-8 h-8 rounded-full transition-transform"
              style={{
                background: c,
                outline: cor === c ? '2px solid var(--ink)' : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="w-9 h-9 rounded border cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          />
        </div>
        <input type="hidden" name="cor" value={cor} />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Ativo</span>
      </label>
      <input type="hidden" name="ativo" value={ativo ? 'true' : 'false'} />

      <input type="hidden" name="ordem" value={staff?.ordem ?? 0} />

      <div className="flex items-center gap-3 pt-2">
        <BotaoSubmit label={staff ? 'Salvar alterações' : 'Adicionar profissional'} />
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-ink-3 hover:text-ink-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
