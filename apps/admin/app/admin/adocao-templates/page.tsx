import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  CATEGORIA_SLUG_TO_TEMPLATE,
  TEMPLATES,
  type TemplateCodigo,
} from '@mallora/lib'

export const dynamic = 'force-dynamic'

type LinhaCategoria = {
  id: string
  slug: string | null
  nome: string
  ordem: number | null
  total: number
}

type Troca = {
  id: string
  changed_at: string
  motivo: string
  categoria_anterior: string | null
  categoria_nova: string
  store_id: string
  loja_nome?: string | null
  cat_anterior_nome?: string | null
  cat_nova_nome?: string | null
}

const TEMPLATE_CODIGOS: TemplateCodigo[] = [
  'food',
  'fashion',
  'pharmacy',
  'pet',
  'services',
  'generic',
]

function agruparPorTemplate(
  linhas: LinhaCategoria[],
): Record<TemplateCodigo, number> {
  const out: Record<TemplateCodigo, number> = {
    food: 0,
    fashion: 0,
    pharmacy: 0,
    pet: 0,
    services: 0,
    generic: 0,
  }
  for (const l of linhas) {
    const slug = (l.slug ?? '') as keyof typeof CATEGORIA_SLUG_TO_TEMPLATE
    const tpl = (CATEGORIA_SLUG_TO_TEMPLATE[slug] ?? 'generic') as TemplateCodigo
    out[tpl] += l.total
  }
  return out
}

export default async function PaginaAdocaoTemplates() {
  const supabase = createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  if (user.user_metadata?.role !== 'admin') redirect('/entrar?erro=acesso-negado')

  // Categorias globais
  const { data: categorias } = (await supabase
    .from('categories')
    .select('id, slug, nome, ordem')
    .is('tenant_id', null)
    .order('ordem')) as { data: Omit<LinhaCategoria, 'total'>[] | null }

  const linhas: LinhaCategoria[] = []
  for (const c of categorias ?? []) {
    const { count } = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', c.id)
    linhas.push({ ...c, total: count ?? 0 })
  }

  const totalLojas = linhas.reduce((acc, l) => acc + l.total, 0)
  const lojasOutros =
    linhas.find((l) => l.slug === 'outros')?.total ?? 0
  const pctOutros =
    totalLojas > 0 ? Math.round((lojasOutros / totalLojas) * 100) : 0

  const porTemplate = agruparPorTemplate(linhas)
  const maiorPorCategoria = Math.max(1, ...linhas.map((l) => l.total))

  // Trocas dos últimos 30 dias
  const desde = new Date()
  desde.setDate(desde.getDate() - 30)

  const { data: trocasRaw } = (await supabase
    .from('store_categoria_changes')
    .select(
      'id, changed_at, motivo, categoria_anterior, categoria_nova, store_id',
    )
    .gte('changed_at', desde.toISOString())
    .order('changed_at', { ascending: false })
    .limit(50)) as { data: Troca[] | null }

  const trocas = trocasRaw ?? []

  // Hidratar nomes (loja + categorias) — pequeno volume, queries paralelas
  const idsLojas = Array.from(new Set(trocas.map((t) => t.store_id)))
  const idsCats = Array.from(
    new Set(
      trocas
        .flatMap((t) => [t.categoria_anterior, t.categoria_nova])
        .filter((x): x is string => Boolean(x)),
    ),
  )

  const [resLojas, resCats] = await Promise.all([
    idsLojas.length > 0
      ? supabase.from('stores').select('id, nome').in('id', idsLojas)
      : Promise.resolve({ data: [] as { id: string; nome: string | null }[] }),
    idsCats.length > 0
      ? supabase.from('categories').select('id, nome').in('id', idsCats)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ])

  const lojasMap = new Map(
    (resLojas.data ?? []).map((l: any) => [l.id, l.nome ?? '(sem nome)']),
  )
  const catsMap = new Map(
    (resCats.data ?? []).map((c: any) => [c.id, c.nome]),
  )

  for (const t of trocas) {
    t.loja_nome = lojasMap.get(t.store_id) ?? null
    t.cat_anterior_nome = t.categoria_anterior
      ? catsMap.get(t.categoria_anterior) ?? null
      : null
    t.cat_nova_nome = catsMap.get(t.categoria_nova) ?? null
  }

  return (
    <div className="p-9 space-y-6 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brick/10 flex items-center justify-center">
          <BarChart3 size={17} className="text-brick-dk" />
        </div>
        <div>
          <h1 className="font-bold text-[17px] tracking-tight text-ink">
            Adoção de templates
          </h1>
          <p className="text-[13px] text-ink-3">
            Distribuição de lojas por categoria e nicho derivado.
          </p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Total de lojas" valor={totalLojas.toString()} />
        <Card
          label='Lojas em "Outros"'
          valor={lojasOutros.toString()}
          sub={`${pctOutros}% do total`}
        />
        <Card label="Trocas (30 dias)" valor={trocas.length.toString()} />
      </div>

      {/* Distribuição por template */}
      <Section titulo="Por template (nicho derivado)">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEMPLATE_CODIGOS.map((codigo) => {
              const t = TEMPLATES[codigo]
              const total = porTemplate[codigo]
              const pct =
                totalLojas > 0
                  ? Math.round((total / totalLojas) * 100)
                  : 0
              return (
                <div
                  key={codigo}
                  className="rounded-xl px-3 py-3"
                  style={{ background: 'var(--bg)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true">{t.icone}</span>
                    <p className="text-[12px] font-semibold text-ink-2">
                      {t.nome}
                    </p>
                  </div>
                  <p className="font-bold text-[20px] text-ink leading-none">
                    {total}
                  </p>
                  <p className="text-[11px] text-ink-3 mt-0.5">{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Distribuição por categoria (barras horizontais) */}
      <Section titulo="Por categoria">
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          {linhas.map((l) => {
            const pctRel = Math.round((l.total / maiorPorCategoria) * 100)
            return (
              <div key={l.id} className="flex items-center gap-3">
                <div className="w-44 flex-shrink-0 text-[12px] text-ink-2 truncate">
                  {l.nome}
                </div>
                <div
                  className="flex-1 h-5 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pctRel}%`,
                      background:
                        l.slug === 'outros'
                          ? 'var(--ink-3)'
                          : 'var(--brick)',
                    }}
                  />
                </div>
                <div className="w-12 text-right text-[12px] font-semibold text-ink">
                  {l.total}
                </div>
              </div>
            )
          })}
          {linhas.length === 0 && (
            <p className="text-[13px] text-ink-3 text-center py-4">
              Nenhuma categoria encontrada.
            </p>
          )}
        </div>
      </Section>

      {/* Trocas recentes */}
      <Section titulo="Trocas recentes (30 dias)">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          {trocas.length === 0 && (
            <p className="text-[13px] text-ink-3 text-center py-8 px-5">
              Nenhuma troca de categoria nos últimos 30 dias.
            </p>
          )}
          {trocas.length > 0 && (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="text-left px-4 py-3 font-semibold text-ink-2">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-2">
                    Loja
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-2">
                    Mudança
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-2">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody>
                {trocas.map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <td className="px-4 py-3 text-ink-3 whitespace-nowrap">
                      {new Date(t.changed_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-ink font-medium">
                      {t.loja_nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {(t.cat_anterior_nome ?? '—') +
                        ' → ' +
                        (t.cat_nova_nome ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-ink-3">
                      <span className="line-clamp-2">{t.motivo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  )
}

function Card({
  label,
  valor,
  sub,
}: {
  label: string
  valor: string
  sub?: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
        {label}
      </p>
      <p className="font-bold text-[28px] text-ink leading-none mt-2">
        {valor}
      </p>
      {sub && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

function Section({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-ink-2 mb-2">{titulo}</h2>
      {children}
    </div>
  )
}
