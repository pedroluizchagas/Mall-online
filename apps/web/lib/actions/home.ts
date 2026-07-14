'use server'

import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Leituras da home (dashboard-redesign 03 §3.1 / Fase 4 §5).
 *
 * - getSaudeLoja(): checklist permanente "Saúde da loja" — o SetupWizard
 *   continua no fluxo inicial; depois de completo esta barra mantém a
 *   memória do progresso e agrega avisos operacionais acionáveis.
 * - getAvaliacaoMedia(): nota real para o KPI (antes hard-coded "—").
 * - getInsightBairro(): insight real de bairro em alta (antes o
 *   InsightBar exibia "Niterói +18%" fixo no código).
 */

export type SeveridadeAviso = 'ok' | 'info' | 'aviso' | 'erro'

export interface AvisoSaude {
  id: string
  severidade: SeveridadeAviso
  titulo: string
  cta?: { label: string; href: string }
}

export async function getSaudeLoja(): Promise<AvisoSaude[]> {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status')
    .single()
  if (!tenant) return []

  const { data: loja } = await supabase
    .from('stores')
    .select('id, ativo, horarios, taxa_entrega, raio_entrega_km, theme')
    .eq('tenant_id', tenant.id)
    .limit(1)
    .maybeSingle()
  if (!loja) return []

  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const [
    { count: totalProdutos },
    { count: semFoto },
    { data: comEstoque },
    { data: reviews7d },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', loja.id),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', loja.id)
      .is('foto_url', null),
    supabase
      .from('products')
      .select('id, stock_quantity, stock_minimo')
      .eq('store_id', loja.id)
      .eq('track_stock', true),
    supabase
      .from('store_reviews')
      .select('estrelas_loja')
      .eq('tenant_id', tenant.id)
      .gte('criada_em', seteDiasAtras.toISOString()),
  ])

  const avisos: AvisoSaude[] = []

  // ── Fundações (as 4 etapas do SetupWizard, agora permanentes) ──────────
  const recebimentosOk = tenant.pagarme_onboarding_status === 'active'
  avisos.push(
    recebimentosOk
      ? { id: 'recebimentos', severidade: 'ok', titulo: 'Recebimentos verificados' }
      : {
          id: 'recebimentos',
          severidade: 'erro',
          titulo: 'Conta de recebimentos pendente',
          cta: { label: 'Configurar', href: '/configuracoes?aba=recebimentos' },
        },
  )

  avisos.push(
    (totalProdutos ?? 0) > 0
      ? { id: 'produtos', severidade: 'ok', titulo: `${totalProdutos} produtos no catálogo` }
      : {
          id: 'produtos',
          severidade: 'erro',
          titulo: 'Nenhum produto cadastrado',
          cta: { label: 'Cadastrar', href: '/produtos/novo' },
        },
  )

  const horariosOk = !!(loja.horarios && Object.keys(loja.horarios as object).length > 0)
  avisos.push(
    horariosOk
      ? { id: 'horarios', severidade: 'ok', titulo: 'Horários configurados' }
      : {
          id: 'horarios',
          severidade: 'erro',
          titulo: 'Horários não configurados',
          cta: { label: 'Configurar', href: '/configuracoes?aba=horarios' },
        },
  )

  const entregaOk = loja.taxa_entrega !== null && (loja.raio_entrega_km ?? 0) > 0
  avisos.push(
    entregaOk
      ? { id: 'entrega', severidade: 'ok', titulo: 'Entrega configurada' }
      : {
          id: 'entrega',
          severidade: 'erro',
          titulo: 'Entrega não configurada',
          cta: { label: 'Configurar', href: '/configuracoes?aba=entrega' },
        },
  )

  // ── Avisos operacionais ────────────────────────────────────────────────
  if (loja.ativo === false) {
    avisos.push({
      id: 'loja_pausada',
      severidade: 'erro',
      titulo: 'Loja pausada — clientes não conseguem pedir',
      cta: { label: 'Reabrir', href: '/minha-loja' },
    })
  }

  if ((semFoto ?? 0) > 0) {
    avisos.push({
      id: 'sem_foto_produto',
      severidade: 'aviso',
      titulo: `${semFoto} produto${(semFoto ?? 0) === 1 ? '' : 's'} sem foto`,
      cta: { label: 'Revisar', href: '/produtos' },
    })
  }

  const estoqueBaixo = (comEstoque ?? []).filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 10),
  ).length
  if (estoqueBaixo > 0) {
    avisos.push({
      id: 'estoque_baixo',
      severidade: 'aviso',
      titulo: `${estoqueBaixo} produto${estoqueBaixo === 1 ? '' : 's'} com estoque baixo`,
      cta: { label: 'Ver estoque', href: '/produtos' },
    })
  }

  const notas = (reviews7d ?? []).map((r) => r.estrelas_loja)
  if (notas.length >= 3) {
    const media = notas.reduce((s, n) => s + n, 0) / notas.length
    if (media < 3.5) {
      avisos.push({
        id: 'avaliacao_baixa',
        severidade: 'aviso',
        titulo: `Avaliação média baixa esta semana (${media.toFixed(1)})`,
        cta: { label: 'Ver avaliações', href: '/avaliacoes' },
      })
    }
  }

  // Vitrine sem estilo publicado → a loja renderiza com a aparência genérica.
  const temEstilo =
    !!loja.theme &&
    typeof loja.theme === 'object' &&
    typeof (loja.theme as Record<string, unknown>).preset === 'string'
  if (!temEstilo) {
    avisos.push({
      id: 'vitrine_sem_estilo',
      severidade: 'info',
      titulo: 'Sua vitrine ainda usa a aparência padrão',
      cta: { label: 'Personalizar', href: '/minha-loja' },
    })
  }

  return avisos
}

/** Média de avaliações (30 dias) para o KPI da home. null = sem avaliações. */
export async function getAvaliacaoMedia(): Promise<number | null> {
  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return null

  const trintaDias = new Date()
  trintaDias.setDate(trintaDias.getDate() - 30)

  const { data } = await supabase
    .from('store_reviews')
    .select('estrelas_loja')
    .eq('tenant_id', tenant.id)
    .gte('criada_em', trintaDias.toISOString())
    .limit(1000)

  if (!data || data.length === 0) return null
  return data.reduce((s, r) => s + r.estrelas_loja, 0) / data.length
}

export interface InsightBairro {
  bairro: string
  delta: number
  pedidos: number
}

/**
 * Bairro em alta: compara pedidos por bairro nos últimos 7 dias vs os 7
 * anteriores e devolve o de maior crescimento (mínimo 3 pedidos na semana).
 * null = dados insuficientes → a InsightBar não renderiza.
 */
export async function getInsightBairro(): Promise<InsightBairro | null> {
  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return null

  const agora = new Date()
  const seteDias = new Date(agora)
  seteDias.setDate(seteDias.getDate() - 7)
  const quatorzeDias = new Date(agora)
  quatorzeDias.setDate(quatorzeDias.getDate() - 14)

  const { data } = await supabase
    .from('orders')
    .select('criado_em, endereco_entrega')
    .eq('tenant_id', tenant.id)
    .gte('criado_em', quatorzeDias.toISOString())
    .limit(2000)

  if (!data || data.length === 0) return null

  const atual = new Map<string, number>()
  const anterior = new Map<string, number>()
  for (const o of data) {
    const bairro = (o.endereco_entrega as { bairro?: string } | null)?.bairro?.trim()
    if (!bairro) continue
    const alvo = new Date(o.criado_em) >= seteDias ? atual : anterior
    alvo.set(bairro, (alvo.get(bairro) ?? 0) + 1)
  }

  let melhor: InsightBairro | null = null
  for (const [bairro, n] of atual) {
    if (n < 3) continue
    const antes = anterior.get(bairro) ?? 0
    const delta = antes === 0 ? 100 : Math.round(((n - antes) / antes) * 100)
    if (delta <= 0) continue
    if (!melhor || delta > melhor.delta) melhor = { bairro, delta, pedidos: n }
  }
  return melhor
}
