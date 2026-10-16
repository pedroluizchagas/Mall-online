/**
 * Formatação do painel. Todo valor em dinheiro do banco é INTEIRO EM
 * CENTAVOS (products.preco, orders.total/subtotal/taxa_entrega,
 * order_items.subtotal — migration_001), o mesmo contrato do
 * `formatarReais` da @mallevo/lib.
 */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const NUMERO_2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "R$ 24,00" a partir de 2400 centavos. */
export function money(centavos: number): string {
  return BRL.format((Number.isFinite(centavos) ? centavos : 0) / 100)
}

/**
 * O valor partido para o número grande da casa: o inteiro em destaque e os
 * centavos menores ("1.234" + ",56"). Sem o "R$" — quem desenha decide.
 */
export function partesDoValor(centavos: number): { inteiro: string; decimal: string } {
  const [inteiro, decimal = '00'] = NUMERO_2.format((Number.isFinite(centavos) ? centavos : 0) / 100).split(',')
  return { inteiro, decimal: `,${decimal}` }
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora local. */
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
  return new Date(instante).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
}
