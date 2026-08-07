import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { OfertaRota, ParadaRota, RotaAtiva } from '@/store/useRotaStore'

// packages/types/src/supabase.ts é GERADO do banco (`pnpm types:generate`) e
// ainda não conhece delivery_routes / route_stops / dispatch_offers nem as
// RPCs de despacho — as migrations 20260807120000..2 precisam ser aplicadas
// primeiro. Editar o arquivo gerado à mão seria desfeito no próximo generate,
// então o acesso a essas tabelas passa por um cliente sem tipagem.
//
// TODO: aplicar as migrations, rodar `pnpm types:generate` e trocar `db` de
// volta por `supabase` — aí o typecheck volta a cobrir estas consultas.
const db = supabase as unknown as SupabaseClient

// Acesso ao motor de despacho (docs/31-logistica-de-entrega.md).
// Toda decisão mora no banco; aqui só lemos o estado e chamamos as RPCs
// aceitar_oferta_despacho / recusar_oferta_despacho, que são transacionais.

function enderecoDe(json: any): string {
  if (!json) return 'Endereço não informado'
  const rua = json.rua ?? ''
  const numero = json.numero ?? ''
  const bairro = json.bairro ?? ''
  return [`${rua}, ${numero}`.trim().replace(/^,\s*/, ''), bairro]
    .filter(Boolean)
    .join(' — ')
}

/** Ofertas de rota vivas para o entregador (não respondidas e não expiradas). */
export async function carregarOfertas(courierId: string): Promise<OfertaRota[]> {
  const { data, error } = await db
    .from('dispatch_offers')
    .select(`
      id,
      route_id,
      expira_em,
      delivery_routes!inner (
        id, drops, ganho_total, distancia_total_m, duracao_estimada_s,
        carga_porte, carga_refrigerada, carga_fragil,
        route_stops (
          ordem, tipo, endereco,
          stores ( nome, endereco )
        )
      )
    `)
    .eq('courier_id', courierId)
    .is('resposta', null)
    .gt('expira_em', new Date().toISOString())

  if (error || !data) return []

  return data.map((o: any) => {
    const rota = o.delivery_routes
    const paradas = (rota.route_stops ?? []) as any[]
    const coleta = paradas.find((p) => p.tipo === 'coleta')
    const entregas = paradas
      .filter((p) => p.tipo === 'entrega')
      .sort((a, b) => a.ordem - b.ordem)

    return {
      oferta_id: o.id,
      route_id: o.route_id,
      expira_em: o.expira_em,
      drops: rota.drops,
      ganho_total: rota.ganho_total,
      distancia_total_m: rota.distancia_total_m,
      duracao_estimada_s: rota.duracao_estimada_s,
      carga_porte: rota.carga_porte,
      carga_refrigerada: rota.carga_refrigerada,
      carga_fragil: rota.carga_fragil,
      store_nome: coleta?.stores?.nome ?? 'Loja',
      store_endereco: coleta?.endereco ?? enderecoDe(coleta?.stores?.endereco),
      enderecos_entrega: entregas.map(
        (p) => p.endereco ?? 'Endereço não informado',
      ),
    } satisfies OfertaRota
  })
}

/** Rota em execução do entregador, com as paradas hidratadas. */
export async function carregarRotaAtiva(courierId: string): Promise<RotaAtiva | null> {
  const { data, error } = await db
    .from('delivery_routes')
    .select(`
      id, status, drops, ganho_total, distancia_total_m,
      route_stops (
        id, ordem, tipo, order_id, store_id, lat, lng, endereco, status,
        stores ( nome, telefone ),
        orders ( volumes, consumers ( nome ) )
      ),
      delivery_assignments ( id, order_id, codigo_confirmacao )
    `)
    .eq('courier_id', courierId)
    .in('status', ['aceita', 'em_andamento'])
    .maybeSingle()

  if (error || !data) return null

  const assignments = (data.delivery_assignments ?? []) as any[]

  const paradas: ParadaRota[] = ((data.route_stops ?? []) as any[])
    .map((p) => {
      const assignment = assignments.find((a) => a.order_id === p.order_id)
      return {
        id: p.id,
        ordem: p.ordem,
        tipo: p.tipo,
        order_id: p.order_id,
        store_id: p.store_id,
        lat: p.lat,
        lng: p.lng,
        endereco: p.endereco,
        status: p.status,
        titulo:
          p.tipo === 'coleta'
            ? (p.stores?.nome ?? 'Loja')
            : (p.orders?.consumers?.nome ?? 'Consumidor'),
        telefone: p.tipo === 'coleta' ? (p.stores?.telefone ?? null) : null,
        codigo_confirmacao: assignment?.codigo_confirmacao ?? null,
        assignment_id: assignment?.id ?? null,
        volumes: p.orders?.volumes ?? 1,
      } satisfies ParadaRota
    })
    .sort((a, b) => a.ordem - b.ordem)

  return {
    route_id: data.id,
    status: data.status,
    drops: data.drops,
    ganho_total: data.ganho_total,
    distancia_total_m: data.distancia_total_m,
    paradas,
  }
}

/**
 * Aceita a oferta. O aceite é serializado no banco (FOR UPDATE na rota):
 * quando dois entregadores tocam "aceitar" ao mesmo tempo — provável no
 * broadcast — o segundo recebe ok=false com o motivo, sem duplicar
 * assignment. Por isso o retorno precisa ser tratado, não ignorado.
 */
export async function aceitarOferta(
  ofertaId: string,
): Promise<{ ok: boolean; motivo?: string }> {
  const { data, error } = await db.rpc('aceitar_oferta_despacho', {
    p_offer_id: ofertaId,
  })

  if (error) return { ok: false, motivo: error.message }

  const r = Array.isArray(data) ? data[0] : data
  return { ok: !!r?.ok, motivo: r?.motivo ?? undefined }
}

export async function recusarOferta(ofertaId: string): Promise<boolean> {
  const { data, error } = await db.rpc('recusar_oferta_despacho', {
    p_offer_id: ofertaId,
  })
  return !error && !!data
}

/** Confirma a coleta na loja: todas as paradas de coleta da rota. */
export async function confirmarColetaRota(routeId: string, stopId: string) {
  const agora = new Date().toISOString()

  await db
    .from('route_stops')
    .update({ status: 'concluida', concluida_em: agora })
    .eq('id', stopId)

  await db
    .from('delivery_routes')
    .update({ status: 'em_andamento' })
    .eq('id', routeId)

  // Espelha no assignment: é ele que o dashboard do lojista e o consumer
  // já leem hoje (docs/12 e docs/18). A rota é operacional, o assignment
  // continua sendo o registro por pedido.
  await db
    .from('delivery_assignments')
    .update({ status: 'coletada', coletado_em: agora })
    .eq('route_id', routeId)
}

/** Confirma a entrega de um drop específico da rota. */
export async function confirmarEntregaDrop(
  parada: ParadaRota,
  comprovanteUrl?: string,
) {
  const agora = new Date().toISOString()

  await db
    .from('route_stops')
    .update({ status: 'concluida', concluida_em: agora })
    .eq('id', parada.id)

  if (parada.assignment_id) {
    await db
      .from('delivery_assignments')
      .update({
        status: 'entregue',
        entregue_em: agora,
        comprovante_url: comprovanteUrl ?? null,
      })
      .eq('id', parada.assignment_id)
  }

  await db
    .from('orders')
    .update({ status: 'entregue' })
    .eq('id', parada.order_id)
}

/** Fecha a rota quando o último drop foi concluído. */
export async function concluirRota(routeId: string) {
  await db
    .from('delivery_routes')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('id', routeId)
}

export function formatarDistancia(metros?: number | null): string {
  if (!metros) return '—'
  return metros >= 1000
    ? `${(metros / 1000).toFixed(1)} km`
    : `${Math.round(metros)} m`
}

export function formatarDuracao(segundos?: number | null): string {
  if (!segundos) return '—'
  const min = Math.round(segundos / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}
