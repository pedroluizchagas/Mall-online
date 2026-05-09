import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import { ReclassificarModal } from '@/components/admin/reclassificar-modal'

export const dynamic = 'force-dynamic'

type LojaOutros = {
  id: string
  nome: string | null
  criado_em: string
  tenant_id: string | null
  categoria_id: string
}

type CategoriaOpcao = { id: string; slug: string | null; nome: string }

export default async function PaginaLojasOutros() {
  const supabase = createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  if (user.user_metadata?.role !== 'admin') redirect('/entrar?erro=acesso-negado')

  // Categoria 'outros' é única globalmente (tenant_id IS NULL).
  const { data: catOutros } = (await supabase
    .from('categories')
    .select('id, slug, nome')
    .eq('slug', 'outros')
    .is('tenant_id', null)
    .single()) as { data: CategoriaOpcao | null }

  const lojas: LojaOutros[] = []
  if (catOutros) {
    const { data } = (await supabase
      .from('stores')
      .select('id, nome, criado_em, tenant_id, categoria_id')
      .eq('categoria_id', catOutros.id)
      .order('criado_em', { ascending: false })
      .limit(200)) as { data: LojaOutros[] | null }
    if (data) lojas.push(...data)
  }

  // Categorias para o seletor (todas globais menos 'outros')
  const { data: categoriasRaw } = (await supabase
    .from('categories')
    .select('id, slug, nome, ordem')
    .is('tenant_id', null)
    .order('ordem')) as { data: (CategoriaOpcao & { ordem: number | null })[] | null }

  const categoriasDisponiveis = (categoriasRaw ?? []).filter(
    (c) => c.slug !== 'outros',
  )

  return (
    <div className="p-9 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brick/10 flex items-center justify-center">
            <Inbox size={17} className="text-brick-dk" />
          </div>
          <div>
            <h1 className="font-bold text-[17px] tracking-tight text-ink">
              Lojas em "Outros"
            </h1>
            <p className="text-[13px] text-ink-3">
              {lojas.length} loja(s) aguardando reclassificação para um nicho
              específico.
            </p>
          </div>
        </div>
      </div>

      {!catOutros && (
        <div
          className="rounded-2xl px-5 py-4 text-[13px]"
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
          }}
        >
          Categoria <code>outros</code> não foi encontrada no seed. Aplique o
          seed antes de usar este painel.
        </div>
      )}

      {catOutros && lojas.length === 0 && (
        <div
          className="rounded-2xl px-5 py-10 text-center"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <p className="text-[14px] font-medium text-ink mb-1">
            Nenhuma loja em "Outros" no momento
          </p>
          <p className="text-[12px] text-ink-3">
            Quando lojistas escolherem a categoria genérica no onboarding, elas
            aparecem aqui para você reclassificar manualmente.
          </p>
        </div>
      )}

      {catOutros && lojas.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="text-left px-4 py-3 font-semibold text-ink-2">
                  Loja
                </th>
                <th className="text-left px-4 py-3 font-semibold text-ink-2">
                  Cadastrada em
                </th>
                <th className="text-right px-4 py-3 font-semibold text-ink-2">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {lojas.map((loja) => (
                <tr
                  key={loja.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <td className="px-4 py-3 text-ink font-medium">
                    {loja.nome ?? '(sem nome)'}
                  </td>
                  <td className="px-4 py-3 text-ink-3">
                    {new Date(loja.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReclassificarModal
                      storeId={loja.id}
                      storeNome={loja.nome ?? '(sem nome)'}
                      categorias={categoriasDisponiveis}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
