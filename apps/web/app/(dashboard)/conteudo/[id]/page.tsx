import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { badgeDoPost } from '@mallevo/lib'
import { PageHeader } from '@/components/dashboard/page-header'
import { getPost, getProdutoResumo } from '@/lib/actions/conteudo'
import { PostEditor } from '../_components/post-editor'

const COR_BADGE = { success: 'ok', info: 'info', warning: 'warn', danger: 'err' } as const

/**
 * Detalhe/edição de um post — métricas somente leitura; editável: legenda,
 * tags, produto vinculado e visibilidade; remover = soft delete com
 * confirmação dupla. A mídia não se troca (publique outro).
 */
export default async function PaginaPost({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)
  if (!post) notFound()

  const produto = await getProdutoResumo(post.product_id)
  const badge = badgeDoPost(post)

  return (
    <div className="p-9 space-y-5 slide-up">
      <Link
        href="/conteudo"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Conteúdo
      </Link>

      <PageHeader
        titulo={post.tipo === 'video' ? 'Vídeo' : 'Foto'}
        subtitulo={
          post.publicado_em
            ? `Publicado em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(post.publicado_em))}`
            : 'Ainda não publicado'
        }
        badgeCabecalho={{ texto: badge.rotulo, cor: COR_BADGE[badge.corKey] }}
      />

      <PostEditor post={post} produtoInicial={produto} />
    </div>
  )
}
