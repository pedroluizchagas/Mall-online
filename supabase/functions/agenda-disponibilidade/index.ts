// supabase/functions/agenda-disponibilidade/index.ts
//
// Calcula slots livres de agendamento em runtime para um produto services.
// Slots NÃO são pré-criados — são derivados de:
//   stores.horarios + service_blocks + orders confirmados + duracao_min do serviço
//
// Body:
// {
//   store_id: uuid,
//   product_id: uuid,
//   date_from: 'YYYY-MM-DD',  // local da loja (Brasília, UTC-3)
//   date_to: 'YYYY-MM-DD'     // máx 14 dias após date_from
// }
//
// Resposta:
// {
//   duracao_min: number,
//   staff: [{ id, nome, cor }],
//   slots: [{
//     inicio_at: ISO UTC,
//     fim_at: ISO UTC,
//     staff_ids_livres: [uuid]
//   }]
// }
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'

// Granularidade fixa nesta fase
const SLOT_MIN = 30
// Janela máxima de busca (em dias) — guarda contra abuso/erro do cliente
const MAX_DIAS = 14
// Loja é tratada como Brasília. UTC-3 sem DST.
const TZ_OFFSET_MIN = -180

type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'

const DIAS_ORDEM: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

interface JanelaDia {
  abre: string
  fecha: string
}

type Horarios = Partial<Record<DiaSemana, JanelaDia | null>>

const FALLBACK_HORARIO: JanelaDia = { abre: '08:00', fecha: '18:00' }

interface StaffRow {
  id: string
  nome: string
  cor: string | null
}

interface BlockRow {
  staff_id: string | null
  inicio_at: string
  fim_at: string
}

interface AgendamentoRow {
  staff_id: string | null
  agendamento_inicio_at: string
  agendamento_fim_at: string
}

function sobrepoe(
  aInicio: number,
  aFim: number,
  bInicio: number,
  bFim: number,
): boolean {
  return aInicio < bFim && aFim > bInicio
}

// "YYYY-MM-DD" + "HH:MM" no fuso da loja (UTC-3) → epoch ms (UTC).
function localParaEpoch(dataYmd: string, horaHm: string): number {
  const [ano, mes, dia] = dataYmd.split('-').map((s) => parseInt(s, 10))
  const [h, m] = horaHm.split(':').map((s) => parseInt(s, 10))
  // Date.UTC trata os componentes como UTC; somamos -TZ_OFFSET_MIN para corrigir.
  const utcMs = Date.UTC(ano, mes - 1, dia, h, m, 0)
  return utcMs - TZ_OFFSET_MIN * 60_000
}

// epoch ms → "YYYY-MM-DD" no fuso da loja
function epochParaLocalYmd(ms: number): string {
  const local = new Date(ms + TZ_OFFSET_MIN * 60_000)
  const ano = local.getUTCFullYear()
  const mes = String(local.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(local.getUTCDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// epoch ms → dia da semana ('seg', 'ter', ...) no fuso da loja
function diaDaSemanaLocal(ms: number): DiaSemana {
  const local = new Date(ms + TZ_OFFSET_MIN * 60_000)
  return DIAS_ORDEM[local.getUTCDay()]
}

function janelaDoDia(horarios: Horarios | null, dia: DiaSemana): JanelaDia | null {
  if (!horarios) return FALLBACK_HORARIO
  // Loja explicitamente marcada como fechada nesse dia
  if (dia in horarios && horarios[dia] == null) return null
  const j = horarios[dia]
  if (!j) return null
  if (typeof j.abre !== 'string' || typeof j.fecha !== 'string') return null
  return j
}

function listarDias(dataFrom: string, dataTo: string): string[] {
  const dias: string[] = []
  // Itera cumulativamente; usa epoch local meia-noite
  let cur = localParaEpoch(dataFrom, '00:00')
  const fim = localParaEpoch(dataTo, '00:00')
  let guard = 0
  while (cur < fim && guard < MAX_DIAS + 1) {
    dias.push(epochParaLocalYmd(cur))
    cur += 24 * 60 * 60 * 1000
    guard += 1
  }
  return dias
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    await getAuthenticatedUser(req)
    const body = await req.json()
    const { store_id, product_id, date_from, date_to } = body ?? {}

    if (
      typeof store_id !== 'string' ||
      typeof product_id !== 'string' ||
      typeof date_from !== 'string' ||
      typeof date_to !== 'string'
    ) {
      throw new Error('store_id, product_id, date_from e date_to são obrigatórios')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_from) || !/^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
      throw new Error('Datas devem estar no formato YYYY-MM-DD')
    }

    const inicioJanelaMs = localParaEpoch(date_from, '00:00')
    const fimJanelaMs = localParaEpoch(date_to, '00:00')
    if (fimJanelaMs <= inicioJanelaMs) {
      throw new Error('date_to deve ser maior que date_from')
    }
    const diasDif = Math.round((fimJanelaMs - inicioJanelaMs) / (24 * 60 * 60 * 1000))
    if (diasDif > MAX_DIAS) {
      throw new Error(`Janela máxima de ${MAX_DIAS} dias`)
    }

    const supabase = getSupabaseAdmin()

    // 1) Produto: extrai duracao_min do metadata.
    const { data: produto, error: pErr } = await supabase
      .from('products')
      .select('id, store_id, metadata')
      .eq('id', product_id)
      .single()

    if (pErr || !produto) throw new Error('Produto não encontrado')
    if (produto.store_id !== store_id) throw new Error('Produto não pertence à loja')

    const metadata = (produto.metadata ?? {}) as Record<string, unknown>
    const duracaoBruta = metadata.duracao_min
    const duracao_min =
      typeof duracaoBruta === 'number'
        ? duracaoBruta
        : typeof duracaoBruta === 'string'
          ? parseInt(duracaoBruta, 10)
          : NaN
    if (!Number.isFinite(duracao_min) || duracao_min <= 0) {
      throw new Error('Serviço sem duração configurada')
    }

    // 2) Loja: horarios JSONB.
    const { data: store, error: sErr } = await supabase
      .from('stores')
      .select('id, horarios')
      .eq('id', store_id)
      .single()

    if (sErr || !store) throw new Error('Loja não encontrada')
    const horarios = (store.horarios ?? null) as Horarios | null

    // 3) Staff ativo (cor é opcional)
    const sb = supabase as unknown as {
      from: (t: string) => any
    }
    const { data: staffRows } = await sb
      .from('service_staff')
      .select('id, nome, cor')
      .eq('store_id', store_id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    const staff: StaffRow[] = (staffRows ?? []) as StaffRow[]

    if (staff.length === 0) {
      return new Response(
        JSON.stringify({ duracao_min, staff: [], slots: [] }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      )
    }

    const inicioJanelaIso = new Date(inicioJanelaMs).toISOString()
    const fimJanelaIso = new Date(fimJanelaMs).toISOString()

    // 4) Bloqueios que sobrepõem a janela
    const { data: bloqueiosRows } = await sb
      .from('service_blocks')
      .select('staff_id, inicio_at, fim_at')
      .eq('store_id', store_id)
      .lt('inicio_at', fimJanelaIso)
      .gt('fim_at', inicioJanelaIso)

    const bloqueios = ((bloqueiosRows ?? []) as BlockRow[]).map((b) => ({
      staff_id: b.staff_id,
      inicio: new Date(b.inicio_at).getTime(),
      fim: new Date(b.fim_at).getTime(),
    }))

    // 5) Agendamentos que sobrepõem a janela
    const { data: agendaRows } = await sb
      .from('orders')
      .select('staff_id, agendamento_inicio_at, agendamento_fim_at, status')
      .eq('store_id', store_id)
      .eq('tipo', 'agendamento')
      .neq('status', 'cancelado')
      .lt('agendamento_inicio_at', fimJanelaIso)
      .gt('agendamento_fim_at', inicioJanelaIso)

    const agendamentos = ((agendaRows ?? []) as AgendamentoRow[]).map((a) => ({
      staff_id: a.staff_id,
      inicio: new Date(a.agendamento_inicio_at).getTime(),
      fim: new Date(a.agendamento_fim_at).getTime(),
    }))

    const agora = Date.now()
    const dias = listarDias(date_from, date_to)
    const slots: Array<{
      inicio_at: string
      fim_at: string
      staff_ids_livres: string[]
    }> = []

    for (const dia of dias) {
      const diaSemana = diaDaSemanaLocal(localParaEpoch(dia, '00:00'))
      const janela = janelaDoDia(horarios, diaSemana)
      if (!janela) continue

      const aberturaMs = localParaEpoch(dia, janela.abre)
      const fechamentoMs = localParaEpoch(dia, janela.fecha)
      if (fechamentoMs <= aberturaMs) continue

      const duracaoMs = duracao_min * 60_000
      const slotIncMs = SLOT_MIN * 60_000

      for (
        let inicioMs = aberturaMs;
        inicioMs + duracaoMs <= fechamentoMs;
        inicioMs += slotIncMs
      ) {
        if (inicioMs < agora) continue
        const fimMs = inicioMs + duracaoMs

        const livres: string[] = []
        for (const s of staff) {
          // Bloqueio do staff específico OU bloqueio da loja toda
          const blocked = bloqueios.some(
            (b) =>
              (b.staff_id === null || b.staff_id === s.id) &&
              sobrepoe(inicioMs, fimMs, b.inicio, b.fim),
          )
          if (blocked) continue
          // Agendamento existente do staff
          const ocupado = agendamentos.some(
            (a) =>
              a.staff_id === s.id &&
              sobrepoe(inicioMs, fimMs, a.inicio, a.fim),
          )
          if (ocupado) continue
          livres.push(s.id)
        }

        if (livres.length === 0) continue
        slots.push({
          inicio_at: new Date(inicioMs).toISOString(),
          fim_at: new Date(fimMs).toISOString(),
          staff_ids_livres: livres,
        })
      }
    }

    return new Response(
      JSON.stringify({ duracao_min, staff, slots }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      },
    )
  }
})
