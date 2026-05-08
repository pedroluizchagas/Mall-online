'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { StaffForm } from './staff-form'
import {
  alternarAtivoStaff,
  atualizarStaff,
  criarStaff,
  excluirStaff,
} from '@/lib/actions/staff'

interface StaffMembro {
  id: string
  nome: string
  foto_url: string | null
  cor: string | null
  ativo: boolean
  ordem: number
}

interface Props {
  storeId: string
  staff: StaffMembro[]
}

export function StaffLista({ storeId, staff }: Props) {
  const [adicionando, setAdicionando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const acaoCriar = async (_estado: any, formData: FormData) => {
    const r = await criarStaff(storeId, formData)
    if (r.sucesso) setAdicionando(false)
    return r
  }

  function gerarAcaoAtualizar(id: string) {
    return async (_estado: any, formData: FormData) => {
      const r = await atualizarStaff(id, formData)
      if (r.sucesso) setEditandoId(null)
      return r
    }
  }

  function aoToggle(id: string, ativo: boolean) {
    startTransition(() => {
      void alternarAtivoStaff(id, ativo)
    })
  }

  function aoExcluir(id: string, nome: string) {
    if (!confirm(`Excluir ${nome}? Esta ação não pode ser desfeita.`)) return
    startTransition(() => {
      void excluirStaff(id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">
            {staff.length === 0
              ? 'Nenhum profissional cadastrado.'
              : `${staff.length} profissional${staff.length === 1 ? '' : 'is'} cadastrado${staff.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        {!adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar profissional
          </button>
        )}
      </div>

      {adicionando && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <p className="text-sm font-semibold text-ink mb-3">Novo profissional</p>
          <StaffForm action={acaoCriar} onCancelar={() => setAdicionando(false)} />
        </div>
      )}

      <ul className="space-y-2">
        {staff.map((membro) => (
          <li
            key={membro.id}
            className="rounded-xl p-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
          >
            {editandoId === membro.id ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Editar profissional</p>
                <StaffForm
                  action={gerarAcaoAtualizar(membro.id)}
                  staff={membro}
                  onCancelar={() => setEditandoId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {membro.foto_url ? (
                  <img
                    src={membro.foto_url}
                    alt={membro.nome}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: membro.cor ?? 'var(--bg-2)',
                      color: 'var(--brick-ink)',
                    }}
                  >
                    {membro.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{membro.nome}</p>
                    {membro.cor && (
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ background: membro.cor }}
                        aria-label={`Cor ${membro.cor}`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-ink-3">{membro.ativo ? 'Ativo' : 'Inativo'}</p>
                </div>
                <label className="flex items-center gap-1 text-xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={membro.ativo}
                    onChange={(e) => aoToggle(membro.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                  Ativo
                </label>
                <button
                  onClick={() => setEditandoId(membro.id)}
                  className="px-3 py-1.5 rounded-lg text-xs border inline-flex items-center gap-1"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => aoExcluir(membro.id, membro.nome)}
                  className="px-3 py-1.5 rounded-lg text-xs border inline-flex items-center gap-1"
                  style={{ borderColor: 'var(--line)', color: 'var(--err)' }}
                >
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
