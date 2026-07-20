import { supabase } from './supabase'

// Agenda — espelho de apps/web/lib/actions/agenda.ts (listarAgenda,
// criarBloqueio, excluirBloqueio) sob a mesma RLS.
// docs/partner-app/08-stage-6-operacao-loja.md §5

export interface AgendamentoCalendario {
  id: string
  inicio_at: string
  fim_at: string | null
  staff_id: string | null
  consumer_nome: string | null
  total: number
  status: string
}

export interface BloqueioCalendario {
  id: string
  inicio_at: string
  fim_at: string
  staff_id: string | null
  motivo: string | null
}

export interface StaffCalendario {
  id: string
  nome: string
  cor: string | null
}

export interface AgendaCarregada {
  erro?: string
  agendamentos: AgendamentoCalendario[]
  bloqueios: BloqueioCalendario[]
  staff: StaffCalendario[]
}

export async function listarAgenda(storeId: string, semanaInicio: Date): Promise<AgendaCarregada> {
  const inicio = new Date(semanaInicio)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 7)

  const [staffRes, agendamentosRes, bloqueiosRes] = await Promise.all([
    supabase
      .from('service_staff')
      .select('id, nome, cor')
      .eq('store_id', storeId)
      .order('ordem', { ascending: true }),
    supabase
      .from('orders')
      .select('id, agendamento_inicio_at, agendamento_fim_at, staff_id, total, status, consumers(nome)')
      .eq('store_id', storeId)
      .eq('tipo', 'agendamento')
      .gte('agendamento_inicio_at', inicio.toISOString())
      .lt('agendamento_inicio_at', fim.toISOString())
      .order('agendamento_inicio_at', { ascending: true })
      .returns<
        Array<{
          id: string
          agendamento_inicio_at: string
          agendamento_fim_at: string | null
          staff_id: string | null
          total: number
          status: string
          consumers: { nome: string } | null
        }>
      >(),
    supabase
      .from('service_blocks')
      .select('id, inicio_at, fim_at, staff_id, motivo')
      .eq('store_id', storeId)
      .gte('inicio_at', inicio.toISOString())
      .lt('inicio_at', fim.toISOString())
      .order('inicio_at', { ascending: true }),
  ])

  const erro = staffRes.error?.message ?? agendamentosRes.error?.message ?? bloqueiosRes.error?.message
  if (erro) return { erro, agendamentos: [], bloqueios: [], staff: [] }

  return {
    agendamentos: (agendamentosRes.data ?? []).map((o) => ({
      id: o.id,
      inicio_at: o.agendamento_inicio_at,
      fim_at: o.agendamento_fim_at,
      staff_id: o.staff_id,
      consumer_nome: o.consumers?.nome ?? null,
      total: o.total ?? 0,
      status: o.status ?? '',
    })),
    bloqueios: (bloqueiosRes.data ?? []) as BloqueioCalendario[],
    staff: (staffRes.data ?? []) as StaffCalendario[],
  }
}

export async function criarBloqueio(
  storeId: string,
  tenantId: string,
  campos: { inicioAt: Date; fimAt: Date; motivo?: string }
): Promise<{ sucesso?: true; erro?: string }> {
  if (campos.fimAt <= campos.inicioAt) return { erro: 'O fim deve ser depois do início' }

  const { error } = await supabase.from('service_blocks').insert({
    store_id: storeId,
    tenant_id: tenantId,
    inicio_at: campos.inicioAt.toISOString(),
    fim_at: campos.fimAt.toISOString(),
    motivo: campos.motivo?.trim() || null,
  })
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function excluirBloqueio(blockId: string): Promise<{ sucesso?: true; erro?: string }> {
  const { error } = await supabase.from('service_blocks').delete().eq('id', blockId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}
