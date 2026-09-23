'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Heart, MessageCircle, Trash2 } from 'lucide-react'
import { LIMITES_POST, badgeDoPost, formatarDuracaoSeg, type Post } from '@mallevo/lib'
import { Card } from '@/components/ui/card'
import { showToast } from '@/components/ui/toast'
import {
  alternarVisibilidadePost,
  atualizarPost,
  removerPost,
  type ProdutoResumo,
} from '@/lib/actions/conteudo'
import { CampoTags } from './campo-tags'
import { SeletorProduto } from './seletor-produto'

const NUMERO = new Intl.NumberFormat('pt-BR')

export function PostEditor({ post, produtoInicial }: { post: Post; produtoInicial: ProdutoResumo | null }) {
  const router = useRouter()
  const [descricao, setDescricao] = useState(post.descricao ?? '')
  const [tags, setTags] = useState<string[]>(post.tags ?? [])
  const [produto, setProduto] = useState<ProdutoResumo | null>(produtoInicial)
  const [oculto, setOculto] = useState(post.status === 'hidden')
  const [salvando, startSalvar] = useTransition()
  const [alternando, startAlternar] = useTransition()
  const [removendo, startRemover] = useTransition()
  const [confirmacao, setConfirmacao] = useState<0 | 1 | 2>(0)

  const sinalizado = post.moderacao === 'flagged' || post.moderacao === 'rejected'
  const badge = badgeDoPost({ status: oculto ? 'hidden' : 'published', moderacao: post.moderacao })

  const sujo =
    descricao.trim() !== (post.descricao ?? '') ||
    tags.join(',') !== (post.tags ?? []).join(',') ||
    (produto?.id ?? null) !== post.product_id

  function salvar() {
    startSalvar(() => {
      void (async () => {
        const r = await atualizarPost(post.id, { descricao, tags, product_id: produto?.id ?? null })
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Alterações salvas' })
        router.refresh()
      })()
    })
  }

  function alternar(novoOculto: boolean) {
    const anterior = oculto
    setOculto(novoOculto)
    startAlternar(() => {
      void (async () => {
        const r = await alternarVisibilidadePost(post.id, novoOculto)
        if ('erro' in r) {
          setOculto(anterior)
          showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: novoOculto ? 'Post oculto do Explorar' : 'Post de volta ao Explorar' })
        router.refresh()
      })()
    })
  }

  function remover() {
    startRemover(() => {
      void (async () => {
        const r = await removerPost(post.id)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível remover', descricao: r.erro })
          setConfirmacao(0)
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Post removido' })
        router.push('/conteudo')
        router.refresh()
      })()
    })
  }

  const ocupado = salvando || alternando || removendo

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
      {/* ── Mídia + métricas ── */}
      <div className="space-y-4">
        <div
          className="relative w-full max-w-[320px] mx-auto lg:mx-0 rounded-lg overflow-hidden bg-bg-2 border border-line"
          style={{ aspectRatio: '9 / 16' }}
        >
          {post.tipo === 'video' ? (
            <video
              src={post.media_url}
              poster={post.thumb_url ?? undefined}
              controls
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2" aria-label="Métricas do post">
          <Metrica icone={Eye} rotulo="Views" valor={post.views} />
          <Metrica icone={Heart} rotulo="Curtidas" valor={post.curtidas} />
          <Metrica icone={MessageCircle} rotulo="Comentários" valor={post.comentarios} />
        </div>
        <p className="text-xs text-ink-3 text-center lg:text-left">
          {post.tipo === 'video' && post.duracao_seg ? `${formatarDuracaoSeg(post.duracao_seg)} · ` : ''}
          {post.largura && post.altura ? `${post.largura}×${post.altura}` : ''}
        </p>
      </div>

      {/* ── Edição ── */}
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">Visível no Explorar</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {sinalizado
                  ? 'Este post está sinalizado pela moderação e não aparece no feed.'
                  : 'Ocultar tira do feed na hora, sem apagar.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!oculto}
              aria-label="Visível no Explorar"
              disabled={ocupado || sinalizado}
              onClick={() => alternar(!oculto)}
              className="relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 shrink-0"
              style={{ background: !oculto ? 'var(--brick)' : 'var(--bg-3)' }}
            >
              <span
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center"
                style={{ transform: !oculto ? 'translateX(22px)' : 'translateX(2px)', color: 'var(--ink-2)' }}
                aria-hidden
              >
                {!oculto ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </span>
            </button>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-ink-3">Estado: {badge.rotulo}</p>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <label htmlFor="legenda" className="block text-sm font-medium text-ink-2 mb-1">
                Legenda
              </label>
              <textarea
                id="legenda"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.slice(0, LIMITES_POST.legenda))}
                rows={4}
                maxLength={LIMITES_POST.legenda}
                placeholder="Sem legenda"
                disabled={ocupado}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
                style={{ borderColor: 'var(--line)' }}
              />
              <p className="text-[11px] text-ink-3 text-right mt-1">
                {descricao.length}/{LIMITES_POST.legenda}
              </p>
            </div>

            <CampoTags tags={tags} onChange={setTags} disabled={ocupado} />

            <SeletorProduto storeId={post.store_id} produto={produto} onChange={setProduto} disabled={ocupado} />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={salvar}
                disabled={ocupado || !sujo}
                className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </Card>

        {/* ── Remover: confirmação dupla, como no app ── */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">Remover post</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {confirmacao === 0
                  ? 'Ele some do Explorar imediatamente e não volta.'
                  : confirmacao === 1
                    ? 'Tem certeza? Essa ação não pode ser desfeita.'
                    : 'Última confirmação: remover de vez.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {confirmacao > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmacao(0)}
                  disabled={removendo}
                  className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                  style={{ color: 'var(--ink-2)' }}
                >
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => (confirmacao >= 2 ? remover() : setConfirmacao((c) => (c + 1) as 1 | 2))}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-colors disabled:opacity-50"
                style={
                  confirmacao >= 2
                    ? { background: 'var(--err)', color: 'var(--on-color)', borderColor: 'var(--err)' }
                    : { borderColor: 'var(--err-line)', color: 'var(--err)' }
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removendo ? 'Removendo…' : confirmacao === 0 ? 'Remover' : confirmacao === 1 ? 'Continuar' : 'Remover de vez'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Metrica({ icone: Icone, rotulo, valor }: { icone: typeof Eye; rotulo: string; valor: number }) {
  return (
    <div className="rounded-md border border-line bg-bg p-3 flex flex-col items-center gap-1">
      <Icone className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
      <span className="font-display text-[22px] leading-none text-ink">{NUMERO.format(valor)}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">{rotulo}</span>
    </div>
  )
}
