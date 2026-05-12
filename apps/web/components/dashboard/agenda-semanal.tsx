'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react'
import type {
  AgendamentoCalendario,
  BloqueioCalendario,
  StaffCalendario,
} from '@/lib/actions/agenda'
import { criarBloqueio, excluirBloqueio } from '@/lib/actions/agenda'

interface Props {
  storeId: string
  semanaInicioYmd: string
  agendamentos: AgendamentoCalendario[]
  bloqueios: BloqueioCalendario[]
  staff: StaffCalendario[]
  horaAbertura: number
  horaFechamento: number
  usandoHorariosDefault: boolean
}

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

function ymd(date: Date): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function parseYmdLocal(s: string): Date {
  const [a, m, d] = s.split('-').map((p) => parseInt(p, 10))
  return new Date(a, m - 1, d)
}

function deslocarDias(date: Date, dias: number): Date {
  const novo = new Date(date)
  novo.setDate(novo.getDate() + dias)
  return novo
}

function rotuloMesAno(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

function formatarDiaCurto(date: Date): { numero: string; sigla: string } {
  return {
    numero: String(date.getDate()).padStart(2, '0'),
    sigla: DIAS[(date.getDay() + 6) % 7], // segunda = 0
  }
}

function formatarHora(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function durMin(de: Date, ate: Date): number {
  return Math.max(0, Math.round((ate.getTime() - de.getTime()) / 60000))
}

export function AgendaSemanal({
  storeId,
  semanaInicioYmd,
  agendamentos,
  bloqueios,
  staff,
  horaAbertura,
  horaFechamento,
  usandoHorariosDefault,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const semanaInicio = useMemo(() => parseYmdLocal(semanaInicioYmd), [semanaInicioYmd])
  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => deslocarDias(semanaInicio, i)),
    [semanaInicio],
  )

  const horas = useMemo(() => {
    const arr: number[] = []
    for (let h = horaAbertura; h < horaFechamento; h++) arr.push(h)
    return arr
  }, [horaAbertura, horaFechamento])

  const corPorStaff = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of staff) {
      if (s.cor) map.set(s.id, s.cor)
    }
    return map
  }, [staff])

  const nomePorStaff = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of staff) map.set(s.id, s.nome)
    return map
  }, [staff])

  function navegar(dias: number) {
    const nova = deslocarDias(semanaInicio, dias)
    const novaYmd = ymd(nova)
    const params = new URLSearchParams(searchParams.toString())
    params.set('semana', novaYmd)
    router.push(`/agenda?${params.toString()}`)
  }

  function irParaHoje() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('semana')
    const qs = params.toString()
    router.push(qs ? `/agenda?${qs}` : '/agenda')
  }

  // Agrupa eventos por dia (índice 0..6).
  const eventosPorDia = useMemo(() => {
    const ag: Array<Array<{ tipo: 'agendamento'; dado: AgendamentoCalendario; inicio: Date; fim: Date }>> =
      Array.from({ length: 7 }, () => [])
    const bl: Array<Array<{ tipo: 'bloqueio'; dado: BloqueioCalendario; inicio: Date; fim: Date }>> =
      Array.from({ length: 7 }, () => [])

    for (const a of agendamentos) {
      const inicio = new Date(a.inicio_at)
      const fim = a.fim_at ? new Date(a.fim_at) : new Date(inicio.getTime() + 30 * 60000)
      const idx = Math.floor((inicio.getTime() - semanaInicio.getTime()) / (24 * 3600 * 1000))
      if (idx >= 0 && idx < 7) ag[idx].push({ tipo: 'agendamento', dado: a, inicio, fim })
    }

    for (const b of bloqueios) {
      const inicio = new Date(b.inicio_at)
      const fim = new Date(b.fim_at)
      const idx = Math.floor((inicio.getTime() - semanaInicio.getTime()) / (24 * 3600 * 1000))
      if (idx >= 0 && idx < 7) bl[idx].push({ tipo: 'bloqueio', dado: b, inicio, fim })
    }

    return { ag, bl }
  }, [agendamentos, bloqueios, semanaInicio])

  const linhaPx = 56 // altura de cada hora

  function topoDoEvento(inicio: Date): number {
    const minutosDesdeAbertura = (inicio.getHours() - horaAbertura) * 60 + inicio.getMinutes()
    return (minutosDesdeAbertura / 60) * linhaPx
  }

  function alturaDoEvento(inicio: Date, fim: Date): number {
    const minutos = durMin(inicio, fim)
    return Math.max(20, (minutos / 60) * linhaPx)
  }

  // Modal "novo bloqueio"
  const [modalAberto, setModalAberto] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  async function aoSubmeterBloqueio(formData: FormData) {
    setErroForm(null)
    const r = await criarBloqueio(storeId, formData)
    if (r.erro) {
      setErroForm(r.erro)
      return
    }
    setModalAberto(false)
    router.refresh()
  }

  function aoExcluirBloqueio(id: string, motivo: string | null) {
    if (!confirm(`Excluir bloqueio${motivo ? ` "${motivo}"` : ''}?`)) return
    startTransition(() => {
      void (async () => {
        const r = await excluirBloqueio(id)
        if (r.erro) alert(r.erro)
        else router.refresh()
      })()
    })
  }

  const hojeYmd = ymd(new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navegar(-7)}
            aria-label="Semana anterior"
            className="p-2 rounded-lg border hover:bg-bg-2 transition-colors"
            style={{ borderColor: 'var(--line)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={irParaHoje}
            className="px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-bg-2 transition-colors"
            style={{ borderColor: 'var(--line)' }}
          >
            Hoje
          </button>
          <button
            onClick={() => navegar(7)}
            aria-label="Próxima semana"
            className="p-2 rounded-lg border hover:bg-bg-2 transition-colors"
            style={{ borderColor: 'var(--line)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-sm text-ink-2 ml-2 capitalize">
            {rotuloMesAno(semanaInicio)}
          </p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar bloqueio
        </button>
      </div>

      {usandoHorariosDefault && (
        <div
          className="px-4 py-2.5 rounded-xl text-xs"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
        >
          Mostrando 8h–18h por padrão. Configure os horários da loja em Configurações.
        </div>
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
        >
          <div
            className="px-2 py-2 text-[10px] uppercase font-semibold text-ink-3"
            style={{ borderBottom: '1px solid var(--line)' }}
          />
          {dias.map((d) => {
            const { numero, sigla } = formatarDiaCurto(d)
            const ehHoje = ymd(d) === hojeYmd
            return (
              <div
                key={d.toISOString()}
                className="px-2 py-2 text-center"
                style={{ borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)' }}
              >
                <div
                  className="text-[10px] uppercase font-semibold tracking-wider"
                  style={{ color: ehHoje ? 'var(--brick)' : 'var(--ink-3)' }}
                >
                  {sigla}
                </div>
                <div
                  className="text-[18px] font-bold"
                  style={{ color: ehHoje ? 'var(--brick)' : 'var(--ink)' }}
                >
                  {numero}
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="grid relative"
          style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
        >
          <div className="flex flex-col">
            {horas.map((h) => (
              <div
                key={h}
                className="text-[11px] text-ink-3 px-2 py-1"
                style={{
                  height: linhaPx,
                  borderBottom: '1px solid var(--line)',
                  borderRight: '1px solid var(--line)',
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {dias.map((d, diaIdx) => (
            <div
              key={d.toISOString()}
              className="relative"
              style={{ borderRight: '1px solid var(--line)' }}
            >
              {horas.map((h) => (
                <div
                  key={h}
                  style={{
                    height: linhaPx,
                    borderBottom: '1px solid var(--line)',
                  }}
                />
              ))}

              {eventosPorDia.bl[diaIdx].map((evt) => {
                const top = topoDoEvento(evt.inicio)
                const altura = alturaDoEvento(evt.inicio, evt.fim)
                return (
                  <button
                    key={evt.dado.id}
                    onClick={() => aoExcluirBloqueio(evt.dado.id, evt.dado.motivo)}
                    className="absolute left-1 right-1 rounded-md text-left px-1.5 py-0.5 text-[10px] font-medium hover:opacity-90 transition-opacity"
                    style={{
                      top,
                      height: altura,
                      background: 'rgba(107, 114, 128, 0.18)',
                      border: '1px dashed rgba(107, 114, 128, 0.6)',
                      color: 'var(--ink-2)',
                    }}
                    title={`${formatarHora(evt.inicio)}–${formatarHora(evt.fim)}${
                      evt.dado.motivo ? ` · ${evt.dado.motivo}` : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span className="truncate">
                        {evt.dado.motivo ?? 'Bloqueio'}
                      </span>
                    </div>
                    <div className="text-[9px] opacity-80">
                      {formatarHora(evt.inicio)}–{formatarHora(evt.fim)}
                      {evt.dado.staff_id
                        ? ` · ${nomePorStaff.get(evt.dado.staff_id) ?? '?'}`
                        : ' · loja'}
                    </div>
                  </button>
                )
              })}

              {eventosPorDia.ag[diaIdx].map((evt) => {
                const top = topoDoEvento(evt.inicio)
                const altura = alturaDoEvento(evt.inicio, evt.fim)
                const cor =
                  (evt.dado.staff_id && corPorStaff.get(evt.dado.staff_id)) ?? 'var(--brick)'
                return (
                  <Link
                    key={evt.dado.id}
                    href={`/pedidos/${evt.dado.id}`}
                    className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-90 transition-opacity"
                    style={{
                      top,
                      height: altura,
                      background: cor,
                      color: '#ffffff',
                    }}
                    title={`${formatarHora(evt.inicio)}–${formatarHora(evt.fim)} · ${
                      evt.dado.consumer_nome ?? 'Cliente'
                    }`}
                  >
                    <div className="truncate">{evt.dado.consumer_nome ?? 'Cliente'}</div>
                    <div className="text-[9px] opacity-90">
                      {formatarHora(evt.inicio)}–{formatarHora(evt.fim)}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {staff.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
          <span>Legenda:</span>
          {staff.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: s.cor ?? 'var(--brick)' }}
              />
              {s.nome}
            </span>
          ))}
        </div>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setModalAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="font-display text-xl m-0">Novo bloqueio</h2>
              <p className="text-xs text-ink-3">
                Reserve um intervalo da agenda. Útil para folgas, almoços ou feriados.
              </p>
            </div>

            {erroForm && (
              <div
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: '#fde8e4', color: 'var(--err)' }}
              >
                {erroForm}
              </div>
            )}

            <form
              action={aoSubmeterBloqueio}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">Profissional</label>
                <select
                  name="staff_id"
                  className="w-full border rounded-xl px-4 py-2 text-sm bg-bg"
                  style={{ borderColor: 'var(--line)' }}
                  defaultValue="todos"
                >
                  <option value="todos">Loja inteira (todos)</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Início</label>
                  <input
                    type="date"
                    name="inicio_data"
                    required
                    defaultValue={hojeYmd}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-bg"
                    style={{ borderColor: 'var(--line)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Hora</label>
                  <input
                    type="time"
                    name="inicio_hora"
                    required
                    defaultValue="12:00"
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-bg"
                    style={{ borderColor: 'var(--line)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Fim</label>
                  <input
                    type="date"
                    name="fim_data"
                    required
                    defaultValue={hojeYmd}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-bg"
                    style={{ borderColor: 'var(--line)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Hora</label>
                  <input
                    type="time"
                    name="fim_hora"
                    required
                    defaultValue="13:00"
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-bg"
                    style={{ borderColor: 'var(--line)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">Motivo</label>
                <input
                  type="text"
                  name="motivo"
                  maxLength={200}
                  placeholder="Ex: Almoço"
                  className="w-full border rounded-xl px-4 py-2 text-sm bg-bg"
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-3 py-1.5 text-sm text-ink-3 hover:text-ink-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full text-sm font-bold"
                  style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                >
                  Adicionar bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
