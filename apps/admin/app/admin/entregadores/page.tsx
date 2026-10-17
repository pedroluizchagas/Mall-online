import { getEntregadores, LIMITE_LISTA } from '@/lib/consultas'
import { contagem } from '@/lib/format'
import { GRUPOS_RECEBIMENTOS } from '@/lib/status'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { FiltroChips, hrefComFiltros } from '@/components/admin/filtros'
import { CampoBusca } from '@/components/admin/campo-busca'
import { ListaEntregadores } from '@/components/admin/entregadores/lista-entregadores'

export const dynamic = 'force-dynamic'

const BASE = '/admin/entregadores'

/** A tela abre na fila de aprovação — é o trabalho do dia a dia aqui. */
const OPCOES_STATUS = [
  { valor: 'pendente', label: 'Aguardando aprovação' },
  { valor: 'aprovado', label: 'Aprovados' },
  { valor: 'reprovado', label: 'Reprovados' },
  { valor: 'suspenso', label: 'Suspensos' },
  { valor: 'todos', label: 'Todos' },
]

const OPCOES_RECEBIMENTOS = [
  { valor: '', label: 'Todos' },
  ...Object.entries(GRUPOS_RECEBIMENTOS).map(([valor, g]) => ({ valor, label: g.rotulo })),
]

const VAZIO: Record<string, { titulo: string; descricao: string }> = {
  pendente: {
    titulo: 'Ninguém aguardando aprovação',
    descricao: 'Quando um entregador terminar o cadastro no app, ele entra nesta fila com a foto da CNH.',
  },
  aprovado: { titulo: 'Nenhum entregador aprovado', descricao: 'Os aprovados aparecem aqui, com quem está online agora.' },
  reprovado: { titulo: 'Nenhum cadastro reprovado', descricao: 'Cadastros reprovados ficam aqui e podem ser reativados.' },
  suspenso: { titulo: 'Nenhum entregador suspenso', descricao: 'Suspensos ficam aqui e podem ser reativados.' },
  todos: { titulo: 'Nenhum entregador ainda', descricao: 'Os cadastros feitos pelo app do entregador aparecem aqui.' },
}

export default async function PaginaEntregadores({
  searchParams,
}: {
  searchParams: { status?: string; recebimentos?: string; busca?: string }
}) {
  const status = OPCOES_STATUS.some((o) => o.valor === searchParams.status) ? searchParams.status! : 'pendente'
  const recebimentos = OPCOES_RECEBIMENTOS.some((o) => o.valor && o.valor === searchParams.recebimentos)
    ? searchParams.recebimentos
    : undefined
  const busca = (searchParams.busca ?? '').slice(0, 80)
  const atuais = { status: status === 'pendente' ? undefined : status, recebimentos, busca: busca || undefined }

  const { entregadores, total, totalGeral, contagens } = await getEntregadores({
    status: status === 'todos' ? undefined : status,
    recebimentos,
    busca,
  })
  const somaDe = (c: Record<string, number>) => Object.values(c).reduce((s, n) => s + n, 0)
  const filtrando = Boolean(recebimentos || busca)
  const vazio = filtrando
    ? { titulo: 'Nenhum entregador com esses filtros', descricao: 'Confira a busca ou limpe o filtro de recebimentos.' }
    : VAZIO[status]

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Operar"
        titulo="Entregadores"
        subtitulo={`${contagem(totalGeral, 'cadastro', 'cadastros')} feitos pelo app do entregador — confira a CNH antes de aprovar.`}
        acoes={
          <CampoBusca
            valorInicial={busca}
            parametros={{ status: atuais.status, recebimentos }}
            placeholder="Buscar nome, telefone, placa ou loja"
            rotulo="Buscar entregador"
          />
        }
      />

      <div className="mb-6 flex flex-col gap-2">
        <FiltroChips
          rotulo="Cadastro"
          opcoes={OPCOES_STATUS.map((o) => ({
            label: o.label,
            href: hrefComFiltros(BASE, atuais, { status: o.valor === 'pendente' ? undefined : o.valor }),
            ativa: status === o.valor,
            contagem: o.valor === 'todos' ? somaDe(contagens.status) : contagens.status[o.valor] ?? 0,
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

      {entregadores.length === 0 ? (
        <div className="cartao">
          <EmptyState
            icone={filtrando ? 'search' : 'bike'}
            titulo={vazio.titulo}
            descricao={vazio.descricao}
            cta={status !== 'todos' || filtrando ? { label: 'Ver todos os entregadores', href: `${BASE}?status=todos` } : undefined}
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-ink-3" aria-live="polite">
            {total > LIMITE_LISTA
              ? `Mostrando ${LIMITE_LISTA} de ${total} — refine a busca para achar o resto.`
              : status === 'pendente'
                ? `${contagem(total, 'cadastro', 'cadastros')} na fila — o mais antigo primeiro.`
                : contagem(total, 'entregador', 'entregadores')}
          </p>
          <ListaEntregadores entregadores={entregadores} />
        </>
      )}
    </div>
  )
}
