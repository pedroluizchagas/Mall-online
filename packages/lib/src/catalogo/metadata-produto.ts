/**
 * `products.metadata` (JSONB) — o contrato ÚNICO entre quem grava (dashboard
 * web, por template de nicho) e quem lê (vitrines do consumer e do storefront).
 *
 * Era um schema local de `apps/web/lib/actions/produtos.ts` só com os campos
 * dos templates; as vitrines liam `galeria`, `recorte`, `especificacoes` e
 * `unidade` que ninguém gravava (só o mock do consumer produzia). Aqui os dois
 * lados leem a mesma definição.
 *
 * Decisão (plano de convergência, Fase 0): `metadata.estoque` NÃO existe —
 * estoque é a coluna real `products.stock_quantity`.
 *
 * `.passthrough()` mantém chaves desconhecidas: templates podem crescer sem
 * quebrar leitura antiga.
 */
import { z } from 'zod'

/** Unidades de venda sugeridas ao lojista (a Feira mostra "R$ 8,90 /kg"). */
export const UNIDADES_VENDA = ['un', 'kg', 'g', 'L', 'ml', 'dz', 'pct', 'cx', 'fatia', 'porção'] as const

export const metadataProdutoSchema = z
  .object({
    // ---- vitrines (lidos por Produto*.tsx e Loja*.tsx) ----
    /** Fotos extras do PDP; a primeira dá lugar ao `foto_url` no full-bleed. */
    galeria: z.array(z.string().url()).max(10).optional(),
    /** PNG de fundo transparente — palco "produto solto" (Torra, Smash, Horta, Ritual). */
    recorte: z.string().url().optional(),
    /** Ficha técnica em pares [rótulo, valor] (Artesã, Feira). */
    especificacoes: z
      .array(z.tuple([z.string().trim().min(1).max(40), z.string().trim().min(1).max(120)]))
      .max(12)
      .optional(),
    /** Unidade de venda exibida junto ao preço ("/kg"). */
    unidade: z.string().trim().min(1).max(12).optional(),

    // ---- food ----
    tempo_preparo_min: z.number().int().min(1).max(180).optional(),
    serve_pessoas: z.number().int().min(1).max(20).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),

    // ---- pharmacy ----
    registro_anvisa: z
      .string()
      .regex(/^\d\.\d{4}\.\d{4}\.\d{3}-\d$/, 'Formato esperado: 1.0123.0456.001-2')
      .optional(),
    principio_ativo: z.string().max(120).optional(),
    categoria_regulatoria: z.enum(['MIP', 'Lista A', 'Lista B', 'Lista C']).optional(),
    exige_receita: z.boolean().optional(),
    bula_url: z.string().url().optional(),
    tipo_medicamento: z.enum(['Genérico', 'Similar', 'Referência']).optional(),

    // ---- pet ----
    especie: z
      .array(z.enum(['Cães', 'Gatos', 'Aves', 'Peixes', 'Roedores', 'Outros']))
      .optional(),
    faixa_peso_kg: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
    tipo_oferta: z.enum(['Produto físico', 'Serviço (banho/tosa)']).optional(),

    // ---- services ----
    /** Duração do serviço agendável (layoutPdp `agendamento`). */
    duracao_min: z.number().int().min(5).max(600).optional(),

    // ---- generic ----
    garantia_meses: z.number().int().min(0).max(120).optional(),
    marca: z.string().max(80).optional(),
    modelo: z.string().max(80).optional(),
    peso_g: z.number().int().min(0).optional(),
    dimensoes_cm: z.string().max(40).optional(),
  })
  .partial()
  .passthrough()

export type MetadataProduto = z.infer<typeof metadataProdutoSchema>

/**
 * Leitura defensiva para as vitrines: campo a campo, um valor corrompido não
 * apaga os outros e nada lança. Chaves desconhecidas são preservadas.
 */
export function lerMetadataProduto(raw: unknown): MetadataProduto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const inteiro = metadataProdutoSchema.safeParse(raw)
  if (inteiro.success) return inteiro.data

  const obj = raw as Record<string, unknown>
  const out: Record<string, unknown> = { ...obj }
  for (const [chave, schema] of Object.entries(metadataProdutoSchema.shape)) {
    if (!(chave in obj)) continue
    const r = (schema as z.ZodTypeAny).safeParse(obj[chave])
    if (r.success) out[chave] = r.data
    else delete out[chave]
  }
  return out as MetadataProduto
}
