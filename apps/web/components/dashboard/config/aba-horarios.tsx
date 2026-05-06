'use client'

import { useState, useTransition } from 'react'
import { atualizarHorarios } from '@/lib/actions/lojas'
import type { HorariosFuncionamento } from '@mallora/types'

const DIAS = [
  { id: 'seg', label: 'Segunda-feira' },
  { id: 'ter', label: 'Terça-feira' },
  { id: 'qua', label: 'Quarta-feira' },
  { id: 'qui', label: 'Quinta-feira' },
  { id: 'sex', label: 'Sexta-feira' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
]

export function AbaHorarios({
  horarios: horariosSalvos,
}: {
  horarios: HorariosFuncionamento | null
}) {
  const [horarios, setHorarios] = useState<HorariosFuncionamento>(horariosSalvos ?? {})
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function toggleDia(dia: string, ativo: boolean) {
    setHorarios((prev) => {
      if (!ativo) {
        const novo = { ...prev }
        delete (novo as any)[dia]
        return novo
      }
      return { ...prev, [dia]: { abre: '08:00', fecha: '18:00' } }
    })
  }

  function atualizarHorario(dia: string, campo: 'abre' | 'fecha', valor: string) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...(prev as any)[dia], [campo]: valor },
    }))
  }

  function handleSalvar() {
    setSucesso(false)
    setErro(null)
    startTransition(async () => {
      const resultado = await atualizarHorarios(horarios)
      if (resultado.erro) setErro(resultado.erro)
      else setSucesso(true)
    })
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-4">Horários de funcionamento</h2>

      {erro && (
        <p className="text-sm px-3 py-2 rounded-xl mb-4" style={{ background: '#fde8e4', color: 'var(--err)' }}>
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm px-3 py-2 rounded-xl mb-4" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
          Horários atualizados com sucesso.
        </p>
      )}

      <div className="space-y-3">
        {DIAS.map((dia) => {
          const horarioDia = (horarios as any)[dia.id]
          const ativo = !!horarioDia

          return (
            <div key={dia.id} className="flex items-center gap-4">
              <div className="flex items-center gap-3 w-40">
                <button
                  type="button"
                  onClick={() => toggleDia(dia.id, !ativo)}
                  className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: ativo ? 'var(--brick)' : 'var(--bg-3)' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    style={{ transform: ativo ? 'translateX(16px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className={`text-sm ${ativo ? 'text-ink font-medium' : 'text-ink-3'}`}>
                  {dia.label}
                </span>
              </div>

              {ativo ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={horarioDia.abre}
                    onChange={(e) => atualizarHorario(dia.id, 'abre', e.target.value)}
                    className="border rounded-xl px-3 py-1.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
                    style={{ borderColor: 'var(--line)' }}
                  />
                  <span className="text-ink-3 text-sm">até</span>
                  <input
                    type="time"
                    value={horarioDia.fecha}
                    onChange={(e) => atualizarHorario(dia.id, 'fecha', e.target.value)}
                    className="border rounded-xl px-3 py-1.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
                    style={{ borderColor: 'var(--line)' }}
                  />
                </div>
              ) : (
                <span className="text-sm text-ink-3">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="mt-6 px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        {isPending ? 'Salvando...' : 'Salvar horários'}
      </button>
    </div>
  )
}
