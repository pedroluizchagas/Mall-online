/**
 * O PostgREST devolve no máximo 1000 linhas por requisição (`max_rows` do
 * Supabase) e corta o resto SEM avisar: uma soma de GMV feita sobre um
 * select puro para de contar no milésimo pedido do mês. Aqui a consulta é
 * refeita por faixas (`range`) até a última página.
 *
 * A consulta precisa de ordem estável (`.order('id')`), senão as faixas se
 * sobrepõem. Quando o volume crescer, as somas viram RPC de agregação no
 * banco — por ora o shopping cabe em poucas páginas.
 *
 * O formato da linha (`T`) é declarado por quem consulta: o cliente não é
 * tipado pelo schema, e o parser do supabase-js tipa todo embed como lista —
 * mesmo os "para um" (`plans`, `tenants`), que chegam como objeto.
 */
export async function buscarTodas<T>(
  faixa: (de: number, ate: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  tamanho = 1000,
): Promise<T[]> {
  const linhas: T[] = []
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await faixa(de, de + tamanho - 1)
    if (error) throw new Error(error.message)
    const pagina = (Array.isArray(data) ? data : []) as T[]
    linhas.push(...pagina)
    if (pagina.length < tamanho) return linhas
  }
}
