import Link from 'next/link'
import { TEMPLATES, type TemplateCodigo } from '@mallevo/lib'
import { getAdocao } from '@/lib/consultas'
import { contagem, dataCurta, numero } from '@/lib/format'
import { cx } from '@/lib/cx'
import { PageHeader } from '@/components/admin/page-header'
import { SecaoFolha } from '@/components/admin/folha'
import { KPI } from '@/components/admin/kpi'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

/** O traço da casa para cada template (os ícones de piso do app). */
const TEMPLATES_EM_ORDEM: { codigo: TemplateCodigo; icone: PartnerIconName }[] = [
  { codigo: 'food', icone: 'utensils' },
  { codigo: 'fashion', icone: 'hanger' },
  { codigo: 'pharmacy', icone: 'pulse' },
  { codigo: 'pet', icone: 'paw' },
  { codigo: 'services', icone: 'scissors' },
  { codigo: 'generic', icone: 'box' },
]

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0)

export default async function PaginaAdocao() {
  const { totalLojas, semCategoria, linhas, porTemplate, trocas } = await getAdocao()
  const emOutros = linhas.find((l) => l.slug === 'outros')?.total ?? 0
  const categorias = [...linhas].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
  const maior = Math.max(1, ...categorias.map((c) => c.total))

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Diretório"
        titulo="Adoção de templates"
        subtitulo="Como as lojas se distribuem pelos nichos — e o template de painel que cada nicho dá ao lojista."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI rotulo="Lojas no shopping" valor={numero(totalLojas)} />
        <KPI rotulo="Em “Outros”" valor={numero(emOutros)} sub={`${pct(emOutros, totalLojas)}% do total — sem nicho definido`} />
        <KPI rotulo="Sem categoria" valor={numero(semCategoria)} sub="Caem no template genérico" />
        <KPI rotulo="Trocas de nicho" valor={numero(trocas.length)} sub="Nos últimos 30 dias" />
      </div>

      <div className="mt-12 flex flex-col gap-12">
        <SecaoFolha id="templates" sobrelinha="Nicho derivado da categoria" titulo="Por template">
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES_EM_ORDEM.map(({ codigo, icone }) => {
              const total = porTemplate[codigo] ?? 0
              const fatia = pct(total, totalLojas)
              return (
                <li key={codigo} className="cartao flex list-none items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink">
                    <PartnerIcon name={icone} size={20} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{TEMPLATES[codigo].nome}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-2">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${total > 0 ? Math.max(fatia, 2) : 0}%` }} />
                    </div>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block text-[22px] font-bold leading-none tracking-[-0.03em] text-ink tabular-nums">
                      {numero(total)}
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold text-ink-3 tabular-nums">{fatia}%</span>
                  </p>
                </li>
              )
            })}
          </ul>
        </SecaoFolha>

        <div className="grid gap-x-6 gap-y-12 xl:grid-cols-12">
          <SecaoFolha id="categorias" className="xl:col-span-7" sobrelinha={contagem(linhas.length, 'categoria global', 'categorias globais')} titulo="Por categoria">
            <div className="cartao p-5 sm:p-6">
              {categorias.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-ink-3">Nenhuma categoria global no banco.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {categorias.map((c) => {
                    const outros = c.slug === 'outros'
                    return (
                      <li key={c.id} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3rem]">
                        <span className={cx('truncate text-[13px]', outros ? 'font-semibold text-ink' : 'text-ink-2')}>
                          {outros ? (
                            <Link href="/admin/lojas-outros" className="sublinha">
                              {c.nome}
                            </Link>
                          ) : (
                            c.nome
                          )}
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-bg-2">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${c.total > 0 ? Math.max((c.total / maior) * 100, 2) : 0}%`,
                              background: outros ? 'var(--ink-4)' : 'var(--ink)',
                            }}
                          />
                        </span>
                        <span className="text-right text-[13px] font-bold text-ink tabular-nums">{numero(c.total)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </SecaoFolha>

          <SecaoFolha id="trocas" className="xl:col-span-5" sobrelinha="Últimos 30 dias" titulo="Trocas de nicho">
            <div className="cartao p-2">
              {trocas.length === 0 ? (
                <p className="px-4 py-10 text-center text-[14px] text-ink-3">Nenhuma loja trocou de nicho nos últimos 30 dias.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                  {trocas.map((t, i) => (
                    <li key={t.id} className={cx('px-3 py-3.5', i > 0 && 'border-t border-line')}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-semibold text-ink">{t.loja ?? 'Loja removida'}</span>
                        <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">{dataCurta(t.quando)}</span>
                      </div>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
                        <span className="truncate">{t.de ?? 'Sem categoria'}</span>
                        <PartnerIcon name="arrow-right" size={13} strokeWidth={2.2} className="shrink-0 text-ink-3" />
                        <span className="truncate font-semibold text-ink">{t.para ?? '—'}</span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-3">{t.motivo}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SecaoFolha>
        </div>
      </div>
    </div>
  )
}
