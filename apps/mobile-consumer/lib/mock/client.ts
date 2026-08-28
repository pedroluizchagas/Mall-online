/**
 * Client Supabase falso para o modo demonstração.
 *
 * Implementa só o subconjunto da API supabase-js que o app consome
 * (query builder encadeável + auth + channel), respondendo a partir
 * do dataset em memória (./dataset). É um drop-in: nenhuma tela muda.
 *
 * Ligado por `EXPO_PUBLIC_USE_MOCK=true` em lib/supabase.ts.
 */

import { criarDB, MOCK_USER, MOCK_SESSION, type MockDB } from './dataset'
import { EXPLORE_FEED } from './feed'

type Resultado<T = any> = { data: T; error: null | { message: string; code?: string } }

const ok = <T,>(data: T): Resultado<T> => ({ data, error: null })

let idSeq = 1
const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}-${idSeq++}`

/**
 * Views só-leitura: não fazem parte do MockDB mutável, mas o app lê delas
 * como leria de uma tabela. Fallback — se o dataset já expõe a chave, ela
 * ganha. Nada aqui é alvo de insert/update.
 */
const TABELAS_VIRTUAIS: Record<string, any[]> = {
  public_explore_feed: EXPLORE_FEED,
}

const ISO_DATA = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/

/**
 * Ordem total entre dois valores de coluna, para os operadores de
 * comparação e para o order(). Número compara como número; timestamp ISO
 * compara como instante (não quebra se um vier com fuso e outro em UTC);
 * string numérica ("42") compara como número; o resto, lexicograficamente.
 * `null`/`undefined` ficam de fora — é o que o Postgres faz com NULL.
 */
function comparar(a: unknown, b: unknown): number | null {
  if (a == null || b == null) return null
  if (typeof a === 'number' && typeof b === 'number') return a - b

  const sa = String(a)
  const sb = String(b)

  if (ISO_DATA.test(sa) && ISO_DATA.test(sb)) {
    const ta = Date.parse(sa)
    const tb = Date.parse(sb)
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb
  }

  const na = Number(sa)
  const nb = Number(sb)
  if (
    sa.trim() !== '' &&
    sb.trim() !== '' &&
    Number.isFinite(na) &&
    Number.isFinite(nb)
  ) {
    return na - nb
  }

  return sa < sb ? -1 : sa > sb ? 1 : 0
}

type OperadorOrdem = 'lt' | 'lte' | 'gt' | 'gte'

const SATISFAZ: Record<OperadorOrdem, (delta: number) => boolean> = {
  lt: (d) => d < 0,
  lte: (d) => d <= 0,
  gt: (d) => d > 0,
  gte: (d) => d >= 0,
}

/**
 * Builder encadeável e "thenable" — espelha o PostgREST no que o app usa:
 * select/insert/update/upsert/delete + eq/neq/in/ilike/lt/lte/gt/gte +
 * order/limit/single. Os comparadores existem sobretudo pela paginação
 * keyset do Explorar (`.lt('publicado_em', ultima)`).
 * Filtros com coluna aninhada (ex.: "stores.ativo") são ignorados de
 * propósito: os embeds já vêm resolvidos no dataset.
 */
class MockQuery implements PromiseLike<Resultado> {
  private filtros: { col: string; val: unknown }[] = []
  private diferentes: { col: string; val: unknown }[] = []
  private conjuntos: { col: string; vals: readonly unknown[] }[] = []
  private ordens: { col: string; op: OperadorOrdem; val: unknown }[] = []
  private likes: { col: string; termo: string }[] = []
  private ordenar: { col: string; asc: boolean } | null = null
  private limite: number | null = null
  private modo: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private umResultado: 'single' | 'maybe' | null = null
  private payload: any = null

  constructor(private tabela: string, private db: MockDB) {}

  select() {
    return this
  }
  insert(payload: any) {
    this.modo = 'insert'
    this.payload = payload
    return this
  }
  upsert(payload: any) {
    this.modo = 'upsert'
    this.payload = payload
    return this
  }
  update(payload: any) {
    this.modo = 'update'
    this.payload = payload
    return this
  }
  delete() {
    this.modo = 'delete'
    return this
  }
  eq(col: string, val: unknown) {
    this.filtros.push({ col, val })
    return this
  }
  neq(col: string, val: unknown) {
    this.diferentes.push({ col, val })
    return this
  }
  in(col: string, vals: readonly unknown[]) {
    this.conjuntos.push({ col, vals })
    return this
  }
  lt(col: string, val: unknown) {
    return this.comparacao(col, 'lt', val)
  }
  lte(col: string, val: unknown) {
    return this.comparacao(col, 'lte', val)
  }
  gt(col: string, val: unknown) {
    return this.comparacao(col, 'gt', val)
  }
  gte(col: string, val: unknown) {
    return this.comparacao(col, 'gte', val)
  }
  private comparacao(col: string, op: OperadorOrdem, val: unknown) {
    this.ordens.push({ col, op, val })
    return this
  }
  ilike(col: string, termo: string) {
    this.likes.push({ col, termo })
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.ordenar = { col, asc: opts?.ascending !== false }
    return this
  }
  limit(n: number) {
    this.limite = n
    return this
  }
  single() {
    this.umResultado = 'single'
    return this
  }
  maybeSingle() {
    this.umResultado = 'maybe'
    return this
  }

  private linhas(): any[] {
    return (this.db as any)[this.tabela] ?? TABELAS_VIRTUAIS[this.tabela] ?? []
  }

  /** Garante embeds (loja, itens, entrega) num pedido recém-criado. */
  private enriquecerPedido(pedido: any): any {
    if (pedido?.stores && pedido?.order_items) return pedido
    const loja = this.db.stores.find((s) => s.id === pedido.store_id)
    const itens = this.db.order_items
      .filter((i) => i.order_id === pedido.id)
      .map((i) => ({
        id: i.id ?? `oi-${i.product_id}`,
        nome: i.nome,
        quantidade: i.quantidade,
        preco_unit: i.preco_unit,
        subtotal: i.subtotal,
        observacoes: i.observacoes ?? null,
        modifiers: i.modifiers ?? null,
        variant_id: i.variant_id ?? null,
        product_variants: null,
      }))
    return {
      criado_em: pedido.criado_em ?? new Date().toISOString(),
      tipo: 'entrega',
      agendamento_inicio_at: null,
      agendamento_fim_at: null,
      staff_id: null,
      service_staff: null,
      motivo_cancelamento: null,
      pagarme_qr_code: null,
      pagarme_qr_code_url: null,
      pagarme_qr_code_expires_at: null,
      ...pedido,
      order_items: pedido.order_items ?? itens,
      delivery_assignments: pedido.delivery_assignments ?? [],
      stores: pedido.stores ?? {
        id: loja?.id ?? pedido.store_id,
        nome: loja?.nome ?? 'Loja',
        telefone: loja?.telefone ?? '',
        slug: loja?.slug ?? '',
      },
    }
  }

  private aplicarLeitura(): any[] {
    let rows = [...this.linhas()]

    for (const { col, val } of this.filtros) {
      if (col.includes('.')) continue // filtro sobre embed — já resolvido
      rows = rows.filter((r) => r?.[col] === val)
    }
    for (const { col, val } of this.diferentes) {
      if (col.includes('.')) continue
      rows = rows.filter((r) => r?.[col] !== val)
    }
    for (const { col, vals } of this.conjuntos) {
      if (col.includes('.')) continue
      rows = rows.filter((r) => vals.includes(r?.[col]))
    }
    for (const { col, op, val } of this.ordens) {
      if (col.includes('.')) continue
      rows = rows.filter((r) => {
        const delta = comparar(r?.[col], val)
        return delta === null ? false : SATISFAZ[op](delta)
      })
    }
    for (const { col, termo } of this.likes) {
      const alvo = termo.replace(/%/g, '').toLowerCase()
      rows = rows.filter((r) =>
        String(r?.[col] ?? '').toLowerCase().includes(alvo)
      )
    }
    if (this.ordenar) {
      const { col, asc } = this.ordenar
      rows.sort((a, b) => {
        const delta = comparar(a?.[col], b?.[col])
        if (delta === null) return 0
        return asc ? Math.sign(delta) : -Math.sign(delta)
      })
    }
    if (this.limite != null) rows = rows.slice(0, this.limite)
    return rows
  }

  private executar(): Resultado {
    if (this.modo === 'select') {
      let rows = this.aplicarLeitura()
      // Pedidos criados no checkout (insert) ainda não têm os embeds
      // que as telas de pedido esperam — resolvemos na leitura.
      if (this.tabela === 'orders') rows = rows.map((r) => this.enriquecerPedido(r))
      if (this.umResultado) return ok(rows[0] ?? null)
      return ok(rows)
    }

    if (this.modo === 'insert' || this.modo === 'upsert') {
      const lista = Array.isArray(this.payload) ? this.payload : [this.payload]
      const tabela = this.linhas()
      const inseridos = lista.map((registro: any) => {
        const linha = {
          id: registro?.id ?? novoId(this.tabela),
          criado_em: new Date().toISOString(),
          ...registro,
        }
        tabela.push(linha)
        return linha
      })
      const data = this.umResultado ? inseridos[0] : inseridos
      return ok(data)
    }

    if (this.modo === 'update') {
      // Aplica de verdade nas linhas casadas e DEVOLVE as afetadas: o app
      // usa `.select()` depois do update para distinguir "gravou" de
      // "não casou nenhuma linha" (perfil e endereços dependem disso).
      const afetadas = this.aplicarLeitura()
      for (const linha of afetadas) Object.assign(linha, this.payload)
      if (this.umResultado) return ok(afetadas[0] ?? null)
      return ok(afetadas)
    }

    // upsert-conflito / delete — no-op silencioso suficiente para o fluxo
    // de demonstração (ex.: push_tokens).
    if (this.umResultado) return ok(null)
    return ok([])
  }

  then<R1 = Resultado, R2 = never>(
    resolve?: ((v: Resultado) => R1 | PromiseLike<R1>) | null,
    reject?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    try {
      return Promise.resolve(this.executar()).then(resolve, reject)
    } catch (e) {
      return Promise.reject(e).then(resolve, reject) as PromiseLike<R1 | R2>
    }
  }
}

// ── Canal realtime: stub inerte (rastreio usa fallback do select) ──
function canalFake() {
  const canal = {
    on: () => canal,
    subscribe: () => canal,
    unsubscribe: () => {},
  }
  return canal
}

export function criarSupabaseMock() {
  const db = criarDB()
  const listeners: ((event: string, session: typeof MOCK_SESSION) => void)[] = []

  return {
    from(tabela: string) {
      return new MockQuery(tabela, db)
    },

    auth: {
      onAuthStateChange(
        cb: (event: string, session: typeof MOCK_SESSION) => void
      ) {
        listeners.push(cb)
        // supabase-js dispara INITIAL_SESSION logo na inscrição
        setTimeout(() => cb('INITIAL_SESSION', MOCK_SESSION), 0)
        return {
          data: {
            subscription: {
              unsubscribe() {
                const i = listeners.indexOf(cb)
                if (i >= 0) listeners.splice(i, 1)
              },
            },
          },
        }
      },
      async getUser() {
        return ok({ user: MOCK_USER })
      },
      async getSession() {
        return ok({ session: MOCK_SESSION })
      },
      async signInWithPassword() {
        return ok({ user: MOCK_USER, session: MOCK_SESSION })
      },
      async signUp() {
        return ok({ user: MOCK_USER, session: MOCK_SESSION })
      },
      async signInWithOtp() {
        return ok({ user: null, session: null })
      },
      async verifyOtp() {
        return ok({ user: MOCK_USER, session: MOCK_SESSION })
      },
      async signOut() {
        return { error: null }
      },
    },

    /**
     * Storage de mentira: no modo demonstração não há bucket para escrever.
     * `getPublicUrl` devolve uma URL plausível e `remove` é no-op — o que a
     * tela de perfil precisa para o fluxo de foto não quebrar na demo.
     * O upload em si nem chega aqui: vai por `fetch` direto (lib/avatar.ts).
     */
    storage: {
      from(bucket: string) {
        return {
          getPublicUrl(caminho: string) {
            return {
              data: {
                publicUrl: `https://mock.mallevo.local/${bucket}/${caminho}`,
              },
            }
          },
          async remove(_caminhos: string[]) {
            return ok(null)
          },
        }
      },
    },

    channel: canalFake,
    removeChannel: () => {},
    /**
     * Toda RPC vira no-op bem-sucedido. Aceita nome e argumentos porque as
     * telas chamam com payload (ex.: `increment_post_view` no Explorar) e o
     * retorno é ignorado — o contador só existe no backend real.
     */
    async rpc(_fn?: string, _args?: Record<string, unknown>) {
      return ok(null)
    },
  }
}
