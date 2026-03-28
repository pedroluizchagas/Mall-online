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
  const [horarios, setHorarios] = useState<HorariosFuncionamento>(
    horariosSalvos ?? {}
  )
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
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">
        Horários de funcionamento
      </h2>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          Horários atualizados com sucesso.
        </p>
      )}

      <div className="space-y-3">
        {DIAS.map((dia) => {
          const horarioDia = (horarios as any)[dia.id]
          const ativo = !!horarioDia

          return (
            <div
              key={dia.id}
              className="flex items-center gap-4"
            >
              {/* Toggle do dia */}
              <div className="flex items-center gap-3 w-40">
                <button
                  type="button"
                  onClick={() => toggleDia(dia.id, !ativo)}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    ativo ? 'bg-[#4CAF82]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                      shadow transition-transform ${
                      ativo ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`text-sm ${
                    ativo ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}
                >
                  {dia.label}
                </span>
              </div>

              {/* Inputs de horário */}
              {ativo ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={horarioDia.abre}
                    onChange={(e) =>
                      atualizarHorario(dia.id, 'abre', e.target.value)
                    }
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    value={horarioDia.fecha}
                    onChange={(e) =>
                      atualizarHorario(dia.id, 'fecha', e.target.value)
                    }
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="mt-6 bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
          font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar horários'}
      </button>
    </div>
  )
}
