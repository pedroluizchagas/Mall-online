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

type Resultado<T = any> = { data: T; error: null | { message: string; code?: string } }

const ok = <T,>(data: T): Resultado<T> => ({ data, error: null })

let idSeq = 1
const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}-${idSeq++}`

/**
 * Builder encadeável e "thenable" — espelha o PostgREST no que o app usa:
 * select/insert/update/upsert/delete + eq/ilike/order/limit/single.
 * Filtros com coluna aninhada (ex.: "stores.ativo") são ignorados de
 * propósito: os embeds já vêm resolvidos no dataset.
 */
class MockQuery implements PromiseLike<Resultado> {
  private filtros: { col: string; val: unknown }[] = []
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
    return (this.db as any)[this.tabela] ?? []
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
    for (const { col, termo } of this.likes) {
      const alvo = termo.replace(/%/g, '').toLowerCase()
      rows = rows.filter((r) =>
        String(r?.[col] ?? '').toLowerCase().includes(alvo)
      )
    }
    if (this.ordenar) {
      const { col, asc } = this.ordenar
      rows.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1
        if (a[col] > b[col]) return asc ? 1 : -1
        return 0
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

    // update / upsert-conflito / delete — no-op silencioso suficiente
    // para o fluxo de demonstração (ex.: push_tokens).
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

    channel: canalFake,
    removeChannel: () => {},
    async rpc() {
      return ok(null)
    },
  }
}
