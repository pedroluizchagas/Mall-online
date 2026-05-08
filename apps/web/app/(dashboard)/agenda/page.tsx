import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getTemplateByStore } from '@mallora/lib'
import type { HorariosFuncionamento } from '@mallora/types'
import { listarAgenda } from '@/lib/actions/agenda'
import { AgendaSemanal } from '@/components/dashboard/agenda-semanal'

type StoreComCategoria = {
  id: string
  nome: string | null
  horarios: HorariosFuncionamento | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

const ABERTURA_DEFAULT = 8
const FECHAMENTO_DEFAULT = 18

interface Props {
  searchParams: { semana?: string }
}

function ymd(date: Date): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function inicioDaSemana(date: Date): Date {
  // Segunda como início. JS getDay(): 0=Dom, 1=Seg, …, 6=Sab.
  const copia = new Date(date)
  copia.setHours(0, 0, 0, 0)
  const diaSemana = (copia.getDay() + 6) % 7 // 0 = segunda
  copia.setDate(copia.getDate() - diaSemana)
  return copia
}

function parseSemanaParam(s: string | undefined): Date {
  if (!s) return inicioDaSemana(new Date())
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return inicioDaSemana(new Date())
  const [_, ano, mes, dia] = m
  return inicioDaSemana(new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)))
}

function calcularJanelaHorarios(horarios: HorariosFuncionamento | null): {
  abertura: number
  fechamento: number
  usandoDefault: boolean
} {
  if (!horarios) {
    return { abertura: ABERTURA_DEFAULT, fechamento: FECHAMENTO_DEFAULT, usandoDefault: true }
  }
  const dias: Array<keyof HorariosFuncionamento> = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
  let menorAbre = 24
  let maiorFecha = 0
  let temAlgum = false
  for (const d of dias) {
    const cfg = horarios[d]
    if (!cfg || !cfg.abre || !cfg.fecha) continue
    const abre = parseInt(cfg.abre.split(':')[0] ?? '', 10)
    const fecha = parseInt(cfg.fecha.split(':')[0] ?? '', 10)
    if (Number.isFinite(abre) && Number.isFinite(fecha)) {
      menorAbre = Math.min(menorAbre, abre)
      maiorFecha = Math.max(maiorFecha, fecha + (cfg.fecha.endsWith(':00') ? 0 : 1))
      temAlgum = true
    }
  }
  if (!temAlgum) {
    return { abertura: ABERTURA_DEFAULT, fechamento: FECHAMENTO_DEFAULT, usandoDefault: true }
  }
  return {
    abertura: Math.max(0, Math.min(23, menorAbre)),
    fechamento: Math.max(menorAbre + 1, Math.min(24, maiorFecha)),
    usandoDefault: false,
  }
}

export default async function PaginaAgenda({ searchParams }: Props) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) redirect('/onboarding')

  const { data: store } = (await supabase
    .from('stores')
    .select('id, nome, horarios, categoria:categories(id, slug, nome, icone)')
    .eq('tenant_id', tenant.id)
    .single()) as { data: StoreComCategoria | null }

  if (!store) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const template = getTemplateByStore(store)

  if (!template.modulos.agenda) {
    return (
      <div className="p-9 space-y-3">
        <h1 className="font-display text-[32px] m-0 leading-tight">Agenda</h1>
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          Sua loja não usa agenda. Esta seção fica disponível para lojas do tipo Serviços.
        </div>
      </div>
    )
  }

  const semanaInicio = parseSemanaParam(searchParams?.semana)
  const semanaInicioYmd = ymd(semanaInicio)
  const { abertura, fechamento, usandoDefault } = calcularJanelaHorarios(store.horarios)

  const { agendamentos, bloqueios, staff, erro } = await listarAgenda(store.id, semanaInicio)

  return (
    <div className="p-9 space-y-5 slide-up">
      <div>
        <h1 className="font-display text-[32px] m-0 leading-tight">Agenda</h1>
        <p className="text-ink-3 text-[13px] mt-0.5">
          Visualize agendamentos confirmados e bloqueie horários para folgas, almoços ou feriados.
        </p>
      </div>

      {erro && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: '#fde8e4', color: 'var(--err)' }}
        >
          {erro}
        </div>
      )}

      <AgendaSemanal
        storeId={store.id}
        semanaInicioYmd={semanaInicioYmd}
        agendamentos={agendamentos}
        bloqueios={bloqueios}
        staff={staff}
        horaAbertura={abertura}
        horaFechamento={fechamento}
        usandoHorariosDefault={usandoDefault}
      />
    </div>
  )
}
