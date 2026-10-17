/**
 * Formatação da administração. Todo valor em dinheiro do banco é INTEIRO EM
 * CENTAVOS (orders.total, platform_fee_amount, payouts.valor_liquido,
 * plans.preco_mensal) — o mesmo contrato do `formatarReais` da @mallevo/lib,
 * que é quem formata o "R$".
 */

const NUMERO_2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const NUMERO = new Intl.NumberFormat('pt-BR')

/**
 * O valor partido para o número grande da casa: o inteiro em destaque e os
 * centavos menores ("1.234" + ",56"). Sem o "R$" — quem desenha decide.
 */
export function partesDoValor(centavos: number): { inteiro: string; decimal: string } {
  const [inteiro, decimal = '00'] = NUMERO_2.format((Number.isFinite(centavos) ? centavos : 0) / 100).split(',')
  return { inteiro, decimal: `,${decimal}` }
}

/**
 * O preço como alguém digita ("49,90", "49.90", "1.234,56") em centavos.
 * Vazio ou texto vira NaN — quem valida (o zod da ação) recusa.
 */
export function centavosDoTexto(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')
  if (!limpo) return Number.NaN
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  return Math.round(Number(normalizado) * 100)
}

/** "1.248" — contagem com separador de milhar. */
export function numero(n: number): string {
  return NUMERO.format(Number.isFinite(n) ? n : 0)
}

/** "1 lojista" / "3 lojistas" — o número e a palavra concordando. */
export function contagem(n: number, singular: string, plural: string): string {
  return `${numero(n)} ${n === 1 ? singular : plural}`
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora de Divinópolis. */
export function saudacao(hora: number): string {
  if (hora < 5) return 'Boa noite'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * "agora", "12 min", "3 h", "5 d", "2 sem", "12 jun." — o tempoRelativo do
 * app. Data no futuro cai em "agora".
 */
export function tempoRelativo(iso: string, agora = Date.now()): string {
  const instante = Date.parse(iso)
  if (!Number.isFinite(instante)) return ''
  const minutos = Math.floor((agora - instante) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `${dias} d`
  if (dias < 30) return `${Math.floor(dias / 7)} sem`
  return new Date(instante).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })
}

/**
 * O tempo relativo já com a preposição certa, para "Cadastro ___":
 * "agora", "há 3 d", "em 14 de set." (passado de 30 dias vira data).
 */
export function quando(iso: string, agora = Date.now()): string {
  const rel = tempoRelativo(iso, agora)
  if (!rel || rel === 'agora') return rel
  return /^\d+ (min|h|d|sem)$/.test(rel) ? `há ${rel}` : `em ${rel}`
}

/** "12/10/2026" no fuso de Divinópolis. */
export function dataCurta(iso: string): string {
  const instante = Date.parse(iso)
  if (!Number.isFinite(instante)) return '—'
  return new Date(instante).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

/** "26/10" — dia e mês, para o que cabe numa linha (fim do teste). */
export function diaEMes(iso: string): string {
  const instante = Date.parse(iso)
  if (!Number.isFinite(instante)) return '—'
  return new Date(instante).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
}

/** As iniciais de um nome ("Forno Demo" → "FD"), para o tijolo sem foto. */
export function iniciais(nome: string | null | undefined): string {
  return (nome ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
