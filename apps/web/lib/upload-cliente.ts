'use client'

import {
  LIMITES_POST,
  caminhosDoPost,
  criarUploadTUS,
  gerarUuid,
  tipoDoArquivo,
  urlPublicaDoObjeto,
  type NovoPost,
  type TipoPost,
} from '@mallevo/lib'
import { createSupabaseClient } from '@/lib/supabase/client'
import { lerVideo, redimensionarImagem } from '@/lib/midia-cliente'

/**
 * Pipeline de publicação no navegador (o `publicarPost` do Partner App):
 * analisar → preparar (foto redimensionada / frame do vídeo) → upload no
 * bucket `explore-media` (foto simples; vídeo por TUS resumível, retomando
 * do offset se a aba cair) → o registro em `store_posts` é da server action
 * `criarPost`. O objeto órfão de uma falha entre upload e registro aparece
 * no card de órfãos da página de conteúdo.
 */

const BUCKET = 'explore-media'

export interface MidiaLocal {
  arquivo: File
  tipo: TipoPost
  /** Object URL para o preview — revogar ao descartar. */
  previewUrl: string
  duracaoSeg: number | null
  largura: number | null
  altura: number | null
  /** Frame do vídeo já capturado (foto: gerado no upload). */
  thumb: Blob | null
}

/** Valida e lê o arquivo escolhido; erro em texto para o lojista. */
export async function analisarArquivo(arquivo: File): Promise<{ midia: MidiaLocal } | { erro: string }> {
  const tipo = tipoDoArquivo(arquivo.type)
  if (!tipo) return { erro: 'Use uma foto (JPEG, PNG, WebP) ou um vídeo (MP4, MOV).' }
  if (arquivo.size > LIMITES_POST.bytes) {
    return { erro: `Arquivo de ${(arquivo.size / 1024 / 1024).toFixed(0)} MB excede o limite de 50 MB.` }
  }

  const previewUrl = URL.createObjectURL(arquivo)
  if (tipo === 'foto') {
    return { midia: { arquivo, tipo, previewUrl, duracaoSeg: null, largura: null, altura: null, thumb: null } }
  }

  try {
    const v = await lerVideo(arquivo, LIMITES_POST.thumbLargura)
    if (v.duracaoSeg > LIMITES_POST.duracaoSeg + 1) {
      URL.revokeObjectURL(previewUrl)
      return { erro: `Vídeo de ${v.duracaoSeg}s — o limite do Explorar é ${LIMITES_POST.duracaoSeg} segundos.` }
    }
    return {
      midia: {
        arquivo,
        tipo,
        previewUrl,
        duracaoSeg: Math.min(LIMITES_POST.duracaoSeg, v.duracaoSeg),
        largura: v.largura,
        altura: v.altura,
        thumb: v.thumb,
      },
    }
  } catch (e) {
    URL.revokeObjectURL(previewUrl)
    return { erro: e instanceof Error ? e.message : 'Não foi possível ler o vídeo.' }
  }
}

export type EstadoUpload = 'preparando' | 'enviando' | 'thumb'

/** Tudo que `criarPost` precisa além de legenda/tags/produto. */
export type RegistroMidia = Omit<NovoPost, 'descricao' | 'tags' | 'product_id'>

export interface ControlePublicacao {
  promessa: Promise<{ registro: RegistroMidia } | { erro: string }>
  cancelar: () => void
}

/** Sobe mídia + thumb no bucket; devolve o registro para a server action. */
export function enviarMidia(opcoes: {
  tenantId: string
  storeId: string
  midia: MidiaLocal
  onEstado: (estado: EstadoUpload) => void
  onProgresso: (fracao: number) => void
}): ControlePublicacao {
  const { tenantId, storeId, midia, onEstado, onProgresso } = opcoes
  let cancelarTus: (() => void) | null = null
  let cancelado = false

  const promessa = (async (): Promise<{ registro: RegistroMidia } | { erro: string }> => {
    const supabase = createSupabaseClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const id = gerarUuid()
    const { mediaPath, thumbPath } = caminhosDoPost(tenantId, storeId, id, midia.tipo, midia.arquivo.type)

    let largura = midia.largura
    let altura = midia.altura
    let bytes: number
    let thumbBlob: Blob

    onEstado('preparando')
    if (midia.tipo === 'foto') {
      // Foto: mídia ≤1440px e thumb ≤720px, as duas em JPEG.
      const principal = await redimensionarImagem(midia.arquivo, LIMITES_POST.fotoLargura)
      const thumb = await redimensionarImagem(principal.blob, LIMITES_POST.thumbLargura, 0.82)
      largura = principal.largura
      altura = principal.altura
      bytes = principal.blob.size
      thumbBlob = thumb.blob
      if (cancelado) return { erro: 'Publicação cancelada' }

      onEstado('enviando')
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(mediaPath, principal.blob, { contentType: 'image/jpeg', upsert: false })
      if (error) return { erro: `Falha no envio da foto: ${error.message}` }
      onProgresso(1)
    } else {
      bytes = midia.arquivo.size
      thumbBlob = midia.thumb ?? new Blob()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return { erro: 'Sessão expirada — entre novamente.' }

      onEstado('enviando')
      const controle = criarUploadTUS({
        supabaseUrl,
        accessToken: session.access_token,
        bucket: BUCKET,
        caminho: mediaPath,
        contentType: midia.arquivo.type || 'video/mp4',
        arquivo: midia.arquivo,
        fingerprint: `web-${BUCKET}-${mediaPath}`,
        onProgress: onProgresso,
      })
      cancelarTus = controle.cancelar
      const r = await controle.promessa
      cancelarTus = null
      if (r.erro || !r.url) return { erro: r.erro ?? 'Falha no envio do vídeo' }
    }

    if (cancelado) return { erro: 'Publicação cancelada' }
    onEstado('thumb')
    const { error: erroThumb } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: false })
    if (erroThumb) return { erro: `Falha no envio da thumbnail: ${erroThumb.message}` }

    return {
      registro: {
        store_id: storeId,
        tipo: midia.tipo,
        media_path: mediaPath,
        media_url: urlPublicaDoObjeto(supabaseUrl, BUCKET, mediaPath),
        thumb_path: thumbPath,
        thumb_url: urlPublicaDoObjeto(supabaseUrl, BUCKET, thumbPath),
        duracao_seg: midia.tipo === 'video' ? midia.duracaoSeg : null,
        largura,
        altura,
        bytes,
      },
    }
  })()

  return {
    promessa,
    cancelar: () => {
      cancelado = true
      cancelarTus?.()
    },
  }
}
