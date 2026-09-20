'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'
import Link from 'next/link'
import { CloudUpload, Film, Images, X } from 'lucide-react'
import { LIMITES_POST, formatarDuracaoSeg } from '@mallevo/lib'
import { Card } from '@/components/ui/card'
import { showToast } from '@/components/ui/toast'
import { criarPost, type ProdutoResumo } from '@/lib/actions/conteudo'
import { analisarArquivo, enviarMidia, type EstadoUpload, type MidiaLocal } from '@/lib/upload-cliente'
import { CampoTags } from './campo-tags'
import { SeletorProduto } from './seletor-produto'

/**
 * Publicar — escolher (arrastar ou clicar; foto ou vídeo) → preview +
 * detalhes (legenda ≤600, tags ≤5, produto opcional) → upload (TUS para
 * vídeo) → publicado. O `publicar.tsx` do Partner App, no navegador.
 */

type Fase = 'escolher' | 'detalhes' | 'enviando' | 'registrando' | 'publicado'

const ACEITA = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'

const TEXTO_ESTADO: Record<EstadoUpload, string> = {
  preparando: 'Preparando a mídia…',
  enviando: 'Enviando…',
  thumb: 'Gerando a capa…',
}

export function PublicarForm({ tenantId, storeId, lojaNome }: { tenantId: string; storeId: string; lojaNome: string }) {
  const [fase, setFase] = useState<Fase>('escolher')
  const [midia, setMidia] = useState<MidiaLocal | null>(null)
  const [descricao, setDescricao] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [produto, setProduto] = useState<ProdutoResumo | null>(null)
  const [estado, setEstado] = useState<EstadoUpload>('preparando')
  const [progresso, setProgresso] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelarRef = useRef<(() => void) | null>(null)

  // Object URL do preview é revogado ao trocar/descartar a mídia.
  useEffect(() => {
    const url = midia?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [midia?.previewUrl])

  async function escolher(arquivo: File | null | undefined) {
    if (!arquivo) return
    const r = await analisarArquivo(arquivo)
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Arquivo não aceito', descricao: r.erro })
      return
    }
    setMidia(r.midia)
    setFase('detalhes')
  }

  function aoSoltar(e: DragEvent<HTMLElement>) {
    e.preventDefault()
    setArrastando(false)
    void escolher(e.dataTransfer.files?.[0])
  }

  function descartar() {
    cancelarRef.current?.()
    cancelarRef.current = null
    setMidia(null)
    setDescricao('')
    setTags([])
    setProduto(null)
    setProgresso(0)
    setPostId(null)
    setFase('escolher')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function publicar() {
    if (!midia || fase !== 'detalhes') return
    setFase('enviando')
    setProgresso(0)

    const controle = enviarMidia({
      tenantId,
      storeId,
      midia,
      onEstado: setEstado,
      onProgresso: setProgresso,
    })
    cancelarRef.current = controle.cancelar
    const r = await controle.promessa
    cancelarRef.current = null

    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível publicar', descricao: r.erro })
      setFase('detalhes')
      return
    }

    setFase('registrando')
    const registro = await criarPost({ ...r.registro, descricao, tags, product_id: produto?.id ?? null })
    if ('erro' in registro) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível publicar', descricao: registro.erro })
      setFase('detalhes')
      return
    }
    setPostId(registro.id)
    setFase('publicado')
  }

  // ── Publicado ──
  if (fase === 'publicado') {
    return (
      <Card>
        <div className="flex flex-col items-center text-center py-10 px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            {midia?.tipo === 'video' ? <Film className="w-7 h-7" /> : <Images className="w-7 h-7" />}
          </div>
          <h2 className="font-display text-[26px] leading-tight">Publicado!</h2>
          <p className="text-sm text-ink-3 mt-1.5 max-w-sm">Seu post já está no Explorar dos clientes, como {lojaNome}.</p>
          <div className="flex items-center gap-2 flex-wrap justify-center mt-6">
            <Link
              href={postId ? `/conteudo/${postId}` : '/conteudo'}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              Ver o post
            </Link>
            <button
              type="button"
              onClick={descartar}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold border"
              style={{ background: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--line)' }}
            >
              Publicar outro
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // ── Escolher ──
  if (fase === 'escolher' || !midia) {
    return (
      <Card>
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          className="flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed px-6 py-14 cursor-pointer transition-colors"
          style={{
            borderColor: arrastando ? 'var(--brick-dk)' : 'var(--line-2)',
            background: arrastando ? 'var(--brick-lt)' : 'var(--bg-2)',
          }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg)' }}>
            <CloudUpload className="w-6 h-6 text-ink-2" strokeWidth={1.75} />
          </div>
          <span className="font-display text-[20px] leading-tight">Arraste uma foto ou um vídeo</span>
          <span className="text-sm text-ink-3 mt-1.5 max-w-md">
            JPEG, PNG ou WebP · MP4 ou MOV de até {LIMITES_POST.duracaoSeg}s e 50 MB. Em retrato fica melhor no Explorar.
          </span>
          <span
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-bold mt-5"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            Escolher arquivo
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACEITA}
            className="sr-only"
            aria-label="Escolher foto ou vídeo"
            onChange={(e) => void escolher(e.target.files?.[0])}
          />
        </label>
      </Card>
    )
  }

  // ── Detalhes / enviando ──
  const ocupado = fase === 'enviando' || fase === 'registrando'
  const textoBotao =
    fase === 'registrando' ? 'Publicando…' : fase === 'enviando' ? TEXTO_ESTADO[estado] : 'Publicar no Explorar'

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="space-y-3">
        <div
          className="relative w-full max-w-[320px] mx-auto lg:mx-0 rounded-lg overflow-hidden bg-bg-2 border border-line"
          style={{ aspectRatio: '9 / 16' }}
        >
          {midia.tipo === 'video' ? (
            <video
              src={midia.previewUrl}
              controls
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={midia.previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!ocupado && (
            <button
              type="button"
              onClick={descartar}
              aria-label="Trocar a mídia"
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(15,15,13,0.62)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {ocupado && (
            <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(to top, rgba(15,15,13,0.7), transparent)' }}>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(progresso * 100)}%`, background: 'var(--brick)' }}
                />
              </div>
              <p className="text-[11px] font-semibold text-white mt-1.5" aria-live="polite">
                {fase === 'registrando' ? 'Publicando…' : TEXTO_ESTADO[estado]}
                {fase === 'enviando' && estado === 'enviando' ? ` ${Math.round(progresso * 100)}%` : ''}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-ink-3 text-center lg:text-left">
          {midia.tipo === 'video' ? `Vídeo · ${formatarDuracaoSeg(midia.duracaoSeg)}` : 'Foto'}
          {midia.largura && midia.altura ? ` · ${midia.largura}×${midia.altura}` : ''}
          {` · ${(midia.arquivo.size / 1024 / 1024).toFixed(1)} MB`}
        </p>
      </div>

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
              placeholder="Conte o que está no post…"
              disabled={ocupado}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
              style={{ borderColor: 'var(--line)' }}
            />
            <p className="text-[11px] text-ink-3 text-right mt-1">
              {descricao.length}/{LIMITES_POST.legenda}
            </p>
          </div>

          <CampoTags tags={tags} onChange={setTags} disabled={ocupado} />

          <SeletorProduto storeId={storeId} produto={produto} onChange={setProduto} disabled={ocupado} />

          <div className="flex items-center justify-end gap-2 pt-1">
            {fase === 'enviando' && (
              <button
                type="button"
                onClick={descartar}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={() => void publicar()}
              disabled={ocupado}
              className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-60 transition-opacity"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              {textoBotao}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
