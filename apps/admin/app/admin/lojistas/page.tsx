import { getLojistas, LIMITE_LISTA } from '@/lib/consultas'
import { contagem } from '@/lib/format'
import { GRUPOS_RECEBIMENTOS, STATUS_ASSINATURA } from '@/lib/status'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { FiltroChips, hrefComFiltros } from '@/components/admin/filtros'
import { CampoBusca } from '@/components/admin/campo-busca'
import { ListaLojistas } from '@/components/admin/lojistas/lista-lojistas'

export const dynamic = 'force-dynamic'

const BASE = '/admin/lojistas'

const OPCOES_ASSINATURA = [
  { valor: '', label: 'Todas' },
  ...['ativa', 'trial', 'em_atraso', 'cancelada', 'suspensa'].map((s) => ({ valor: s, label: STATUS_ASSINATURA[s].rotulo })),
  { valor: 'sem', label: 'Sem assinatura' },
]

const OPCOES_RECEBIMENTOS = [
  { valor: '', label: 'Todos' },
  ...Object.entries(GRUPOS_RECEBIMENTOS).map(([valor, g]) => ({ valor, label: g.rotulo })),
]

/** Valor de filtro vindo da URL: só o que existe nas opções passa. */
function opcaoValida(valor: string | undefined, opcoes: { valor: string }[]): string | undefined {
  return valor && opcoes.some((o) => o.valor === valor) ? valor : undefined
}

export default async function PaginaLojistas({
  searchParams,
}: {
  searchParams: { assinatura?: string; recebimentos?: string; busca?: string }
}) {
  const assinatura = opcaoValida(searchParams.assinatura, OPCOES_ASSINATURA)
  const recebimentos = opcaoValida(searchParams.recebimentos, OPCOES_RECEBIMENTOS)
  const busca = (searchParams.busca ?? '').slice(0, 80)
  const atuais = { assinatura, recebimentos, busca: busca || undefined }

  const { lojistas, total, totalGeral, contagens } = await getLojistas({ assinatura, recebimentos, busca })
  const somaDe = (c: Record<string, number>) => Object.values(c).reduce((s, n) => s + n, 0)
  const filtrando = Boolean(assinatura || recebimentos || busca)

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Operar"
        titulo="Lojistas"
        subtitulo={`${contagem(totalGeral, 'lojista cadastrado', 'lojistas cadastrados')} — a assinatura vem do Stripe; os recebimentos, do Pagar.me.`}
        acoes={
          <CampoBusca
            valorInicial={busca}
            parametros={{ assinatura, recebimentos }}
            placeholder="Buscar loja, nome, e-mail ou telefone"
            rotulo="Buscar lojista"
          />
        }
      />

      <div className="mb-6 flex flex-col gap-2">
        <FiltroChips
          rotulo="Assinatura"
          opcoes={OPCOES_ASSINATURA.map((o) => ({
            label: o.label,
            href: hrefComFiltros(BASE, atuais, { assinatura: o.valor || undefined }),
            ativa: (assinatura ?? '') === o.valor,
            contagem: o.valor ? contagens.assinatura[o.valor] ?? 0 : somaDe(contagens.assinatura),
          }))}
        />
        <FiltroChips
          rotulo="Recebimentos"
          opcoes={OPCOES_RECEBIMENTOS.map((o) => ({
            label: o.label,
            href: hrefComFiltros(BASE, atuais, { recebimentos: o.valor || undefined }),
            ativa: (recebimentos ?? '') === o.valor,
            contagem: o.valor ? contagens.recebimentos[o.valor] ?? 0 : somaDe(contagens.recebimentos),
          }))}
        />
      </div>

      {lojistas.length === 0 ? (
        <div className="cartao">
          <EmptyState
            icone={filtrando ? 'search' : 'store'}
            titulo={filtrando ? 'Nenhum lojista com esses filtros' : 'Nenhum lojista ainda'}
            descricao={
              filtrando
                ? 'Confira a busca ou volte para todos os lojistas.'
                : 'Quando uma loja se cadastrar pelo painel, ela aparece aqui.'
            }
            cta={filtrando ? { label: 'Ver todos os lojistas', href: BASE } : undefined}
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-ink-3" aria-live="polite">
            {total > LIMITE_LISTA
              ? `Mostrando ${LIMITE_LISTA} de ${total} — refine a busca para achar o resto.`
              : contagem(total, 'lojista', 'lojistas')}
          </p>
          <ListaLojistas lojistas={lojistas} />
        </>
      )}
    </div>
  )
}
