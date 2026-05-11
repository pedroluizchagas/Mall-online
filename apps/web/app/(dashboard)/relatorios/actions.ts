'use server'

import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import { intervaloPeriodo, PERIODOS_VALIDOS, type Periodo } from './_lib/periodo'

const LIMITE_LINHAS = 10_000

const exportarSchema = z.object({
  periodo: z.enum(PERIODOS_VALIDOS as [Periodo, ...Periodo[]]),
})

type ResultadoExport =
  | { sucesso: true; csv: string; nomeArquivo: string }
  | { erro: string }

interface LinhaPedido {
  id: string
  criado_em: string
  status: string
  total: number
  forma_pagamento: string | null
  tipo: string | null
}

function escaparCsv(valor: string | number | null): string {
  if (valor === null || valor === undefined) return ''
  const s = String(valor)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function exportarRelatorioCsv(periodo: Periodo): Promise<ResultadoExport> {
  const parsed = exportarSchema.safeParse({ periodo })
  if (!parsed.success) return { erro: 'Período inválido' }

  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { inicio, fim } = intervaloPeriodo(parsed.data.periodo)

  const { data, error, count } = await supabase
    .from('orders')
    .select('id, criado_em, status, total, forma_pagamento, tipo', { count: 'exact' })
    .eq('tenant_id', tenant.id)
    .gte('criado_em', inicio.toISOString())
    .lte('criado_em', fim.toISOString())
    .order('criado_em', { ascending: false })
    .limit(LIMITE_LINHAS + 1)

  if (error) return { erro: `Falha ao consultar pedidos: ${error.message}` }
  if ((count ?? 0) > LIMITE_LINHAS || (data?.length ?? 0) > LIMITE_LINHAS) {
    return { erro: 'Período muito amplo (mais de 10.000 pedidos). Reduza o intervalo.' }
  }

  const linhas = (data ?? []) as LinhaPedido[]
  const cabecalho = 'id_pedido,criado_em,status,total_centavos,forma_pagamento,tipo'
  const corpo = linhas
    .map((l) =>
      [
        escaparCsv(l.id),
        escaparCsv(l.criado_em),
        escaparCsv(l.status),
        escaparCsv(l.total),
        escaparCsv(l.forma_pagamento),
        escaparCsv(l.tipo),
      ].join(','),
    )
    .join('\n')

  const csv = `${cabecalho}\n${corpo}`
  const dataHoje = new Date().toISOString().slice(0, 10)
  const nomeArquivo = `relatorio-${parsed.data.periodo}-${dataHoje}.csv`
  return { sucesso: true, csv, nomeArquivo }
}
