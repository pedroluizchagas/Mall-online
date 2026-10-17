import { intervaloDoMes, mesAtual, mesDoInstante, somarMeses, type Mes } from './hoje'

/**
 * Contas da administração, puras (sem banco) para poderem ser testadas.
 * Dinheiro entra e sai em CENTAVOS.
 */

export interface PedidoContavel {
  total: number | null
  platform_fee_amount: number | null
}

export interface Resumo {
  pedidos: number
  /** Soma de `orders.total` — o volume bruto que passou pelo shopping. */
  gmv: number
  /** Soma de `platform_fee_amount` — o que fica com a plataforma. */
  comissoes: number
  ticketMedio: number
}

export function resumir(pedidos: PedidoContavel[]): Resumo {
  const gmv = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const comissoes = pedidos.reduce((s, p) => s + Number(p.platform_fee_amount ?? 0), 0)
  return {
    pedidos: pedidos.length,
    gmv,
    comissoes,
    ticketMedio: pedidos.length ? Math.round(gmv / pedidos.length) : 0,
  }
}

/**
 * A janela justa de comparação: do início do mês até `agora` contra o MESMO
 * tempo decorrido do mês anterior (dia 17 às 15h contra dia 17 às 15h),
 * cortada no fim dele — 31 de março compara com fevereiro inteiro, não
 * invade março. Instantes em ms; `[inicioAnterior, corteAnterior)`.
 */
export function janelaDeComparacao(agora: Date): { inicioAtual: number; inicioAnterior: number; corteAnterior: number } {
  const atual = mesAtual(agora)
  const inicioAtual = Date.parse(intervaloDoMes(atual).inicio)
  const inicioAnterior = Date.parse(intervaloDoMes(somarMeses(atual, -1)).inicio)
  const corteAnterior = Math.min(inicioAnterior + (agora.getTime() - inicioAtual), inicioAtual)
  return { inicioAtual, inicioAnterior, corteAnterior }
}

/** Variação percentual inteira; sem base (anterior zerado) não há comparação honesta. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}

/** Pedidos agrupados pelo mês (em Divinópolis) em que foram feitos. */
export function serieMensal(
  pedidos: (PedidoContavel & { criado_em: string })[],
  meses: Mes[],
): (Resumo & { mes: Mes })[] {
  const porMes = new Map<Mes, PedidoContavel[]>(meses.map((m) => [m, []]))
  for (const p of pedidos) porMes.get(mesDoInstante(p.criado_em))?.push(p)
  return meses.map((mes) => ({ mes, ...resumir(porMes.get(mes) ?? []) }))
}

/**
 * Um lojista pode ter mais de uma linha em `tenant_subscriptions` (assinou
 * de novo depois de cancelar): vale a mais recente.
 */
export function maisRecente<T extends { criado_em: string }>(linhas: T[] | null | undefined): T | null {
  if (!linhas || linhas.length === 0) return null
  return linhas.reduce((a, b) => (Date.parse(b.criado_em) > Date.parse(a.criado_em) ? b : a))
}

/** Minúsculas e sem acento: "Divinópolis" casa com "divinopolis". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Todos os termos da busca aparecem em algum dos campos. */
export function casaBusca(busca: string, campos: (string | null | undefined)[]): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return true
  const alvo = normalizar(campos.filter(Boolean).join(' '))
  return termos.every((t) => alvo.includes(t))
}

/** Quantos itens caem em cada valor de `chave` ("ativa" → 12…). */
export function contarPor<T>(itens: T[], chave: (item: T) => string | null | undefined): Record<string, number> {
  const contagem: Record<string, number> = {}
  for (const item of itens) {
    const valor = chave(item) ?? ''
    contagem[valor] = (contagem[valor] ?? 0) + 1
  }
  return contagem
}
