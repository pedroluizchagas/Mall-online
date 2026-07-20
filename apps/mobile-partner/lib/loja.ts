import type { HorariosFuncionamento, Json } from '@mallevo/types'
import { supabase } from './supabase'
import { comprimirEUploadImagem } from './upload'

// Minha loja — espelho de apps/web/lib/actions/lojas.ts e do upload de
// assets de loja-vitrine.ts (bucket store-assets,
// {tenant_id}/{logo|banner}-{uuid}.jpg). Mesma RLS do Dashboard.
// docs/partner-app/08-stage-6-operacao-loja.md

export interface DadosLoja {
  id: string
  nome: string
  descricao: string | null
  telefone: string | null
  slug: string | null
  ativo: boolean
  logo_url: string | null
  banner_url: string | null
  horarios: HorariosFuncionamento | null
  taxa_entrega: number
  tempo_entrega: number | null
  raio_entrega_km: number | null
  usa_entregadores_proprios: boolean
  aceita_pix: boolean
  aceita_cartao_online: boolean
  endereco: {
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  } | null
}

export async function getDadosLoja(storeId: string): Promise<DadosLoja | null> {
  const { data } = await supabase
    .from('stores')
    .select(
      'id, nome, descricao, telefone, slug, ativo, logo_url, banner_url, horarios, taxa_entrega, tempo_entrega, raio_entrega_km, usa_entregadores_proprios, aceita_pix, aceita_cartao_online, endereco'
    )
    .eq('id', storeId)
    .single()
  return (data as unknown as DadosLoja) ?? null
}

type Resultado = { sucesso?: true; erro?: string }

export async function atualizarDadosGerais(
  storeId: string,
  campos: { nome: string; descricao: string | null; telefone: string | null }
): Promise<Resultado> {
  if (campos.nome.trim().length < 2) return { erro: 'Nome obrigatório' }
  if (campos.telefone && campos.telefone.replace(/\D/g, '').length < 10) {
    return { erro: 'Telefone inválido' }
  }
  const { error } = await supabase
    .from('stores')
    .update({
      nome: campos.nome.trim(),
      descricao: campos.descricao?.trim() || null,
      telefone: campos.telefone?.trim() || null,
    })
    .eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Pausar/reabrir a loja — espelha alternarLojaAtiva (loja-vitrine.ts). */
export async function alternarLojaAtiva(storeId: string, ativo: boolean): Promise<Resultado> {
  const { error } = await supabase.from('stores').update({ ativo }).eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function atualizarHorarios(
  storeId: string,
  horarios: HorariosFuncionamento
): Promise<Resultado> {
  // HorariosFuncionamento é estruturalmente Json; o cast satisfaz a coluna jsonb.
  const { error } = await supabase
    .from('stores')
    .update({ horarios: horarios as unknown as Json })
    .eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function atualizarConfigEntrega(
  storeId: string,
  campos: {
    taxa_entrega: number // centavos
    tempo_entrega: number | null
    raio_entrega_km: number | null
    usa_entregadores_proprios: boolean
  }
): Promise<Resultado> {
  if (campos.taxa_entrega < 0) return { erro: 'Taxa inválida' }
  const { error } = await supabase.from('stores').update(campos).eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function atualizarMetodosPagamento(
  storeId: string,
  campos: { aceita_pix: boolean; aceita_cartao_online: boolean }
): Promise<Resultado> {
  const { error } = await supabase.from('stores').update(campos).eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

export async function atualizarEndereco(
  storeId: string,
  endereco: NonNullable<DadosLoja['endereco']>
): Promise<Resultado> {
  const { error } = await supabase.from('stores').update({ endereco }).eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Logo/banner — bucket store-assets, path do publicarVitrine. */
export async function atualizarImagemLoja(
  storeId: string,
  tenantId: string,
  tipo: 'logo' | 'banner',
  uriLocal: string
): Promise<Resultado> {
  const caminho = `${tenantId}/${tipo}-${gerarUuid()}.jpg`
  const up = await comprimirEUploadImagem(uriLocal, 'store-assets', caminho)
  if (up.erro || !up.url) return { erro: up.erro ?? 'Falha no upload' }

  const { error } = await supabase
    .from('stores')
    .update(tipo === 'logo' ? { logo_url: up.url } : { banner_url: up.url })
    .eq('id', storeId)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

function gerarUuid(): string {
  // RN Hermes tem crypto.randomUUID em runtimes recentes; fallback simples.
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
