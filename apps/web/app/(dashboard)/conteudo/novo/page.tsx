import { PageHeader } from '@/components/dashboard/page-header'
import { getContextoConteudo } from '@/lib/actions/conteudo'
import { GatePublicacao } from '../_components/gate-publicacao'
import { PublicarForm } from '../_components/publicar-form'

/** Publicar no Explorar — captura (foto/vídeo) → detalhes → upload → publicado. */
export default async function PaginaPublicar() {
  const ctx = await getContextoConteudo()
  if (!ctx || !ctx.loja) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Nenhuma loja encontrada.</p>
      </div>
    )
  }

  const limiteAtingido = ctx.maxPosts !== null && ctx.totalPosts >= ctx.maxPosts

  return (
    <div className="p-9 space-y-5 slide-up">
      <PageHeader
        titulo="Publicar no Explorar"
        subtitulo={`Uma foto ou um vídeo de até 60 segundos, publicado na hora como ${ctx.loja.nome}.`}
      />

      {!ctx.podePublicar ? (
        <GatePublicacao contexto="publicar" />
      ) : limiteAtingido ? (
        <div
          className="rounded-lg p-5 border"
          style={{ background: 'var(--warn-lt)', borderColor: 'var(--warn-line)' }}
        >
          <p className="text-sm font-semibold text-ink">Limite de posts do seu plano atingido</p>
          <p className="text-xs text-ink-2 mt-1">
            Seu plano permite {ctx.maxPosts} posts. Remova um post antigo ou{' '}
            <a href="/minha-conta?aba=assinatura" className="underline">
              faça upgrade
            </a>
            .
          </p>
        </div>
      ) : (
        <PublicarForm tenantId={ctx.tenantId} storeId={ctx.loja.id} lojaNome={ctx.loja.nome} />
      )}
    </div>
  )
}
