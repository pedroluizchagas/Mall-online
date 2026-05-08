'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaBloqueio = z
  .object({
    staff_id: z.string().uuid().optional().nullable(),
    inicio_at: z.string().datetime({ offset: true }),
    fim_at: z.string().datetime({ offset: true }),
    motivo: z.string().max(200).optional().nullable(),
  })
  .refine((b) => new Date(b.fim_at) > new Date(b.inicio_at), {
    message: 'Fim deve ser depois do início',
    path: ['fim_at'],
  })

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

function isoLocalParaUtc(dataYmd: string, horaHm: string): string {
  // Constrói um Date interpretando o input como horário local do servidor
  // (que para uso prático é o horário do lojista). Devolve ISO em UTC.
  const [ano, mes, dia] = dataYmd.split('-').map((s) => parseInt(s, 10))
  const [h, m] = horaHm.split(':').map((s) => parseInt(s, 10))
  const dt = new Date(ano, (mes ?? 1) - 1, dia ?? 1, h ?? 0, m ?? 0, 0, 0)
  return dt.toISOString()
}

export async function listarAgenda(
  store_id: string,
  semanaInicio: Date,
): Promise<AgendaCarregada> {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return { erro: 'Tenant não encontrado', agendamentos: [], bloqueios: [], staff: [] }
  }

  const inicio = new Date(semanaInicio)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 7)

  const inicioIso = inicio.toISOString()
  const fimIso = fim.toISOString()

  const sb = supabase as any

  const [staffRes, agendamentosRes, bloqueiosRes] = await Promise.all([
    sb
      .from('service_staff')
      .select('id, nome, cor')
      .eq('store_id', store_id)
      .eq('tenant_id', tenant.id)
      .order('ordem', { ascending: true }),
    sb
      .from('orders')
      .select(
        'id, agendamento_inicio_at, agendamento_fim_at, staff_id, total, status, consumers(nome)',
      )
      .eq('store_id', store_id)
      .eq('tenant_id', tenant.id)
      .eq('tipo', 'agendamento')
      .gte('agendamento_inicio_at', inicioIso)
      .lt('agendamento_inicio_at', fimIso)
      .order('agendamento_inicio_at', { ascending: true }),
    sb
      .from('service_blocks')
      .select('id, inicio_at, fim_at, staff_id, motivo')
      .eq('store_id', store_id)
      .eq('tenant_id', tenant.id)
      .gte('inicio_at', inicioIso)
      .lt('inicio_at', fimIso)
      .order('inicio_at', { ascending: true }),
  ])

  if (staffRes.error) {
    return { erro: staffRes.error.message, agendamentos: [], bloqueios: [], staff: [] }
  }
  if (agendamentosRes.error) {
    return { erro: agendamentosRes.error.message, agendamentos: [], bloqueios: [], staff: [] }
  }
  if (bloqueiosRes.error) {
    return { erro: bloqueiosRes.error.message, agendamentos: [], bloqueios: [], staff: [] }
  }

  const agendamentos: AgendamentoCalendario[] = (agendamentosRes.data ?? []).map((o: any) => ({
    id: o.id as string,
    inicio_at: o.agendamento_inicio_at as string,
    fim_at: (o.agendamento_fim_at ?? null) as string | null,
    staff_id: (o.staff_id ?? null) as string | null,
    consumer_nome: (o.consumers?.nome ?? null) as string | null,
    total: (o.total ?? 0) as number,
    status: (o.status ?? '') as string,
  }))

  const bloqueios: BloqueioCalendario[] = (bloqueiosRes.data ?? []).map((b: any) => ({
    id: b.id as string,
    inicio_at: b.inicio_at as string,
    fim_at: b.fim_at as string,
    staff_id: (b.staff_id ?? null) as string | null,
    motivo: (b.motivo ?? null) as string | null,
  }))

  const staff: StaffCalendario[] = (staffRes.data ?? []).map((s: any) => ({
    id: s.id as string,
    nome: s.nome as string,
    cor: (s.cor ?? null) as string | null,
  }))

  return { agendamentos, bloqueios, staff }
}

export async function criarBloqueio(store_id: string, formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!store) return { erro: 'Loja não encontrada' }

  const inicioData = formData.get('inicio_data')
  const inicioHora = formData.get('inicio_hora')
  const fimData = formData.get('fim_data')
  const fimHora = formData.get('fim_hora')

  if (!inicioData || !inicioHora || !fimData || !fimHora) {
    return { erro: 'Preencha data e hora de início e fim' }
  }

  const inicio_at = isoLocalParaUtc(String(inicioData), String(inicioHora))
  const fim_at = isoLocalParaUtc(String(fimData), String(fimHora))

  const staffRaw = formData.get('staff_id')
  const staff_id =
    staffRaw && String(staffRaw).length > 0 && String(staffRaw) !== 'todos'
      ? String(staffRaw)
      : null

  const dados = schemaBloqueio.safeParse({
    staff_id,
    inicio_at,
    fim_at,
    motivo: formData.get('motivo') ? String(formData.get('motivo')) : null,
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await (supabase as any).from('service_blocks').insert({
    ...dados.data,
    store_id,
    tenant_id: tenant.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/agenda')
  return { sucesso: true }
}

export async function excluirBloqueio(block_id: string) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await (supabase as any)
    .from('service_blocks')
    .delete()
    .eq('id', block_id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/agenda')
  return { sucesso: true }
}
