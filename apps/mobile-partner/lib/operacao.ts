import { supabase } from './supabase'

// Operação da loja — espelhos das actions/páginas do Dashboard:
// avaliações (avaliacoes/actions.ts), mensagens (message_threads/messages,
// ambas na publication Realtime), convites de entregador
// (entregadores/actions.ts), tickets (ajuda) e conta (auth.ts).
// docs/partner-app/08-stage-6-operacao-loja.md

type Resultado = { sucesso?: true; erro?: string }

// ————— Avaliações —————

export interface Avaliacao {
  id: string
  order_id: string
  estrelas_loja: number
  estrelas_entrega: number | null
  comentario: string | null
  resposta_lojista: string | null
  respondida_em: string | null
  sinalizada: boolean
  criada_em: string
  consumers: { nome: string } | null
}

export async function listarAvaliacoes(): Promise<Avaliacao[]> {
  const { data } = await supabase
    .from('store_reviews')
    .select(
      'id, order_id, estrelas_loja, estrelas_entrega, comentario, resposta_lojista, respondida_em, sinalizada, criada_em, consumers!inner(nome)'
    )
    .order('criada_em', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as Avaliacao[]
}

/** Responder — mesma mutação do Dashboard (só se ainda sem resposta). */
export async function responderAvaliacao(reviewId: string, resposta: string): Promise<Resultado> {
  const texto = resposta.trim()
  if (texto.length < 2) return { erro: 'Escreva uma resposta' }
  if (texto.length > 600) return { erro: 'Resposta muito longa (máx. 600)' }

  const { error } = await supabase
    .from('store_reviews')
    .update({ resposta_lojista: texto, respondida_em: new Date().toISOString() })
    .eq('id', reviewId)
    .is('respondida_em', null)

  if (error) return { erro: error.message }
  return { sucesso: true }
}

// ————— Mensagens —————

export interface Thread {
  id: string
  origem: string
  arquivada: boolean
  nao_lidas_lojista: number
  ultima_em: string
  order_id: string | null
  consumers: { nome: string } | null
}

export async function listarThreads(): Promise<Thread[]> {
  const { data } = await supabase
    .from('message_threads')
    .select('id, origem, arquivada, nao_lidas_lojista, ultima_em, order_id, consumers(nome)')
    .eq('arquivada', false)
    .order('ultima_em', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as Thread[]
}

export interface Mensagem {
  id: string
  thread_id: string
  autor_tipo: string
  corpo: string
  criada_em: string
}

export async function listarMensagens(threadId: string): Promise<Mensagem[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, thread_id, autor_tipo, corpo, criada_em')
    .eq('thread_id', threadId)
    .order('criada_em', { ascending: true })
    .limit(200)
  return (data ?? []) as Mensagem[]
}

export async function enviarMensagem(threadId: string, corpo: string): Promise<Resultado> {
  const texto = corpo.trim()
  if (!texto) return { erro: 'Mensagem vazia' }

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('messages').insert({
    thread_id: threadId,
    autor_tipo: 'lojista',
    autor_id: user?.id ?? null,
    corpo: texto,
  })
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Zera o contador de não lidas do lojista ao abrir a conversa. */
export async function marcarThreadLida(threadId: string): Promise<void> {
  await supabase
    .from('message_threads')
    .update({ nao_lidas_lojista: 0 })
    .eq('id', threadId)
}

// ————— Entregadores (próprios + convites) —————

export interface EntregadorProprio {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  status: string
  online: boolean
}

export async function listarEntregadoresProprios(tenantId: string): Promise<EntregadorProprio[]> {
  const { data } = await supabase
    .from('couriers')
    .select('id, nome, telefone, foto_url, status, online')
    .eq('tenant_id', tenantId)
    .order('nome')
  return (data ?? []) as EntregadorProprio[]
}

export interface Convite {
  token: string
  nome: string
  telefone: string
  email: string | null
  expira_em: string
  usado_em: string | null
  criada_em: string
}

export async function listarConvites(): Promise<Convite[]> {
  const { data } = await supabase
    .from('courier_invites')
    .select('token, nome, telefone, email, expira_em, usado_em, criada_em')
    .is('usado_em', null)
    .order('criada_em', { ascending: false })
    .limit(20)
  return (data ?? []) as Convite[]
}

/** Espelha criarConvite do Dashboard (token/expira gerados pelo banco). */
export async function criarConvite(
  tenantId: string,
  campos: { nome: string; telefone: string; email?: string }
): Promise<{ sucesso?: true; token?: string; erro?: string }> {
  const nome = campos.nome.trim()
  const telefone = campos.telefone.replace(/\D/g, '')
  if (nome.length < 2) return { erro: 'Nome muito curto' }
  if (telefone.length < 10 || telefone.length > 13) return { erro: 'Telefone inválido' }

  const { data, error } = await supabase
    .from('courier_invites')
    .insert({
      tenant_id: tenantId,
      nome,
      telefone,
      email: campos.email?.trim() || null,
    })
    .select('token')
    .single()

  if (error || !data) return { erro: error?.message ?? 'Falha ao gerar convite' }
  return { sucesso: true, token: data.token }
}

export async function revogarConvite(token: string): Promise<Resultado> {
  const { error } = await supabase.from('courier_invites').delete().eq('token', token)
  if (error) return { erro: error.message }
  return { sucesso: true }
}

/** Link do convite — mesma URL do Dashboard ({web}/convite/{token}). */
export function linkConvite(token: string): string {
  const base = (process.env.EXPO_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  return `${base}/convite/${token}`
}

// ————— Ajuda (tickets) —————

export interface Ticket {
  id: string
  assunto: string
  mensagem: string
  prioridade: string
  status: string
  criada_em: string
  atualizada_em: string
}

export async function listarTickets(): Promise<Ticket[]> {
  const { data } = await supabase
    .from('support_tickets')
    .select('id, assunto, mensagem, prioridade, status, criada_em, atualizada_em')
    .order('atualizada_em', { ascending: false })
    .limit(30)
  return (data ?? []) as Ticket[]
}

export async function abrirTicket(
  tenantId: string,
  campos: { assunto: string; mensagem: string }
): Promise<Resultado> {
  const assunto = campos.assunto.trim()
  const mensagem = campos.mensagem.trim()
  if (assunto.length < 3) return { erro: 'Descreva o assunto' }
  if (mensagem.length < 10) return { erro: 'Detalhe um pouco mais o problema' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado' }

  const { error } = await supabase.from('support_tickets').insert({
    tenant_id: tenantId,
    autor_id: user.id,
    assunto,
    mensagem,
  })
  if (error) return { erro: error.message }
  return { sucesso: true }
}

// ————— Conta —————

export async function atualizarDadosPessoais(
  tenantId: string,
  campos: { nome: string; telefone: string }
): Promise<Resultado> {
  const nome = campos.nome.trim()
  if (nome.length < 2) return { erro: 'Nome deve ter ao menos 2 caracteres' }
  const telefone = campos.telefone.trim()
  if (telefone && telefone.replace(/\D/g, '').length < 10) return { erro: 'Telefone inválido' }

  const [{ error: errAuth }, { error: errTenant }] = await Promise.all([
    supabase.auth.updateUser({ data: { nome } }),
    supabase
      .from('tenants')
      .update({ nome_responsavel: nome, ...(telefone ? { telefone } : {}) })
      .eq('id', tenantId),
  ])

  if (errAuth || errTenant) return { erro: 'Erro ao atualizar dados. Tente novamente.' }
  return { sucesso: true }
}

export async function alterarSenha(novaSenha: string, confirmacao: string): Promise<Resultado> {
  if (novaSenha.length < 8) return { erro: 'A senha deve ter ao menos 8 caracteres' }
  if (novaSenha !== confirmacao) return { erro: 'As senhas não coincidem' }

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { erro: 'Erro ao alterar senha. Tente novamente.' }
  return { sucesso: true }
}

export interface ResumoAssinatura {
  billing_status: string
  periodo_fim: string | null
  plano: { nome: string; preco_mensal: number } | null
}

export async function getResumoAssinatura(): Promise<ResumoAssinatura | null> {
  const { data } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status, periodo_fim, plans (nome, preco_mensal)')
    .single()
  if (!data) return null
  return {
    billing_status: data.billing_status,
    periodo_fim: data.periodo_fim,
    plano: (data.plans as { nome: string; preco_mensal: number } | null) ?? null,
  }
}
