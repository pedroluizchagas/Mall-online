import Link from 'next/link'
import { Clapperboard, Plus } from 'lucide-react'
import { badgeDoPost, type Post } from '@mallevo/lib'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { detectarOrfaosConteudo, getContextoConteudo, listarPosts } from '@/lib/actions/conteudo'
import { GatePublicacao } from './_components/gate-publicacao'
import { MetricasConteudo } from './_components/metricas-conteudo'
import { FiltrosConteudo, type EstadoFiltro, type TipoFiltro } from './_components/filtros-conteudo'
import { PostCard } from './_components/post-card'
import { OrfaosCard } from './_components/orfaos-card'
import { UsoPostsBarra } from './_components/uso-posts-barra'

/**
 * Conteúdo — o que a loja publicou no Explorar do shopping (plano de
 * convergência, Fase 1c). Espelha "Meu conteúdo" do Partner App: métricas,
 * filtros por tipo e estado, grade de cartazes e o aviso de uploads órfãos.
 */

interface SearchParams {
  tipo?: string
  estado?: string
}

const TIPOS: TipoFiltro[] = ['todos', 'video', 'foto']
const ESTADOS: EstadoFiltro[] = ['todos', 'publicados', 'ocultos', 'analise', 'sinalizados']

function casaEstado(post: Post, estado: EstadoFiltro): boolean {
  if (estado === 'todos') return true
  const rotulo = badgeDoPost(post).rotulo
  return (
    (estado === 'publicados' && rotulo === 'Publicado') ||
    (estado === 'ocultos' && rotulo === 'Oculto') ||
    (estado === 'analise' && rotulo === 'Em análise') ||
    (estado === 'sinalizados' && rotulo === 'Sinalizado')
  )
}

export default async function PaginaConteudo({ searchParams }: { searchParams: SearchParams }) {
  const tipo: TipoFiltro = TIPOS.includes(searchParams.tipo as TipoFiltro) ? (searchParams.tipo as TipoFiltro) : 'todos'
  const estado: EstadoFiltro = ESTADOS.includes(searchParams.estado as EstadoFiltro)
    ? (searchParams.estado as EstadoFiltro)
    : 'todos'

  const ctx = await getContextoConteudo()
  if (!ctx) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Tenant não encontrado.</p>
      </div>
    )
  }

  const [posts, orfaos] = await Promise.all([listarPosts(), detectarOrfaosConteudo()])

  const filtrados = posts.filter((p) => (tipo === 'todos' || p.tipo === tipo) && casaEstado(p, estado))
  const videos = posts.filter((p) => p.tipo === 'video').length
  const fotos = posts.length - videos
  const semFiltro = tipo === 'todos' && estado === 'todos'

  const subtitulo =
    posts.length === 0
      ? 'Fotos e vídeos de até 60s que aparecem no Explorar dos seus clientes.'
      : [
          `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`,
          videos > 0 ? `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}` : null,
          fotos > 0 ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <div className="p-9 space-y-5 slide-up">
      <PageHeader
        titulo="Conteúdo"
        subtitulo={subtitulo}
        acoes={
          ctx.podePublicar && ctx.loja ? (
            <Link
              href="/conteudo/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Publicar
            </Link>
          ) : undefined
        }
      />

      {!ctx.podePublicar && <GatePublicacao contexto="conteudo" />}

      {ctx.maxPosts !== null && <UsoPostsBarra atual={ctx.totalPosts} maximo={ctx.maxPosts} />}

      <MetricasConteudo posts={posts} />

      {orfaos.length > 0 && <OrfaosCard caminhos={orfaos} />}

      <FiltrosConteudo tipoAtivo={tipo} estadoAtivo={estado} />

      {filtrados.length === 0 ? (
        <EmptyState
          icone={Clapperboard}
          titulo={semFiltro ? 'Nenhum post ainda' : 'Nada com esse filtro'}
          descricao={
            semFiltro
              ? 'Publique uma foto ou um vídeo de um produto e ele aparece no Explorar do shopping.'
              : 'Troque o filtro para ver o resto.'
          }
          cta={
            semFiltro && ctx.podePublicar && ctx.loja
              ? { label: 'Publicar primeiro post', href: '/conteudo/novo' }
              : !semFiltro
                ? { label: 'Limpar filtros', href: '/conteudo' }
                : undefined
          }
        />
      ) : (
        <ul
          className="grid gap-3 list-none p-0 m-0"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
          aria-label="Publicações"
        >
          {filtrados.map((p) => (
            <li key={p.id}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
