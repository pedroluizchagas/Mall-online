import Constants from 'expo-constants'
import { getInfoAsync } from 'expo-file-system/legacy'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import * as VideoThumbnails from 'expo-video-thumbnails'
import {
  LIMITES_POST,
  caminhosDoPost,
  gerarUuid,
  mensagemErroPost,
} from '@mallevo/lib'
import { supabase } from './supabase'
import { comprimirEUploadImagem, uploadResumavelTUS } from './upload'
import { useUploadStore } from '@/store/useUploadStore'

// Pipeline de publicação do Explorar (docs/partner-app/09):
// preparar (comprimir + thumbnail) → upload (TUS p/ vídeo, simples p/
// foto) → insert store_posts. Moderação default 'approved' (decisão do
// Stage 0) → status nasce 'published'.

export interface MidiaCapturada {
  tipo: 'video' | 'foto'
  uri: string
  duracaoSeg: number | null // só vídeo
  largura: number | null
  altura: number | null
}

export interface MidiaPreparada extends MidiaCapturada {
  /** Uri final a enviar (comprimida quando possível). */
  uriEnvio: string
  /** Thumb local (frame do vídeo; a própria foto redimensionada sai no upload). */
  thumbUri: string
  bytes: number | null
}

function rodandoNoExpoGo(): boolean {
  return Constants.appOwnership === 'expo'
}

/**
 * Comprime vídeo para H.264/AAC ~1080p (react-native-compressor). No Expo
 * Go o módulo nativo não existe → segue com o arquivo original (validação
 * real de compressão/codec exige development build — decisão registrada).
 */
async function comprimirVideo(uri: string, onProgress: (p: number) => void): Promise<string> {
  if (rodandoNoExpoGo()) {
    console.warn('react-native-compressor indisponível no Expo Go — enviando vídeo original.')
    return uri
  }
  try {
    const { Video } = await import('react-native-compressor')
    const saida = await Video.compress(
      uri,
      { compressionMethod: 'manual', maxSize: 1080, bitrate: 8_000_000 },
      (progresso) => onProgress(progresso)
    )
    return saida
  } catch (e) {
    console.warn('Falha na compressão — enviando original:', e)
    return uri
  }
}

/** Prepara a mídia: compressão (vídeo) + thumbnail. */
export async function prepararMidia(
  midia: MidiaCapturada,
  onProgressoCompressao: (p: number) => void
): Promise<{ preparada?: MidiaPreparada; erro?: string }> {
  try {
    let uriEnvio = midia.uri
    let thumbUri: string

    if (midia.tipo === 'video') {
      uriEnvio = await comprimirVideo(midia.uri, onProgressoCompressao)
      const thumb = await VideoThumbnails.getThumbnailAsync(uriEnvio, { time: 1000 })
      thumbUri = thumb.uri
    } else {
      // Foto: normaliza para ≤1440px JPEG (o upload da mídia recomprime)
      const norm = await manipulateAsync(midia.uri, [{ resize: { width: 1440 } }], {
        compress: 0.85,
        format: SaveFormat.JPEG,
      })
      uriEnvio = norm.uri
      thumbUri = norm.uri // thumb ~720p gerada no upload
    }

    const info = await getInfoAsync(uriEnvio)
    const bytes = info.exists && 'size' in info ? (info.size ?? null) : null

    if (bytes && bytes > LIMITES_POST.bytes) {
      return {
        erro: `Arquivo de ${(bytes / 1024 / 1024).toFixed(0)} MB excede o limite de 50 MB. Grave um vídeo mais curto.`,
      }
    }

    return { preparada: { ...midia, uriEnvio, thumbUri, bytes } }
  } catch {
    return { erro: 'Falha ao preparar a mídia' }
  }
}

export interface DadosPost {
  descricao: string
  tags: string[]
  productId: string | null
}

/**
 * Publica: sobe mídia (+thumb) em explore-media/{tenant}/{store}/ e cria
 * o registro em store_posts. Dirige o useUploadStore (estado/progresso).
 */
export async function publicarPost(
  tenantId: string,
  storeId: string,
  midia: MidiaCapturada,
  dados: DadosPost
): Promise<{ sucesso?: true; erro?: string }> {
  const store = useUploadStore.getState()
  store.resetar()

  // 1. Preparar (compressão + thumb)
  store.setEstado('comprimindo')
  const { preparada, erro: erroPrep } = await prepararMidia(midia, (p) =>
    store.setProgresso(p * 0.3)
  )
  if (erroPrep || !preparada) {
    store.setErro(erroPrep ?? 'Falha ao preparar')
    return { erro: erroPrep ?? 'Falha ao preparar' }
  }

  // 2. Upload da mídia principal
  store.setEstado('enviando')
  store.setProgresso(0)

  // Caminhos no bucket = contrato compartilhado (@mallevo/lib).
  const id = gerarUuid()
  const { mediaPath, thumbPath } = caminhosDoPost(tenantId, storeId, id, preparada.tipo)

  let mediaUrl: string

  if (preparada.tipo === 'video') {
    // TUS resumível — obrigatório para vídeo (docs/partner-app/09 §5)
    const controle = uploadResumavelTUS(
      preparada.uriEnvio,
      'explore-media',
      mediaPath,
      'video/mp4',
      (p) => store.setProgresso(p)
    )
    store.setCancelarAtual(controle.cancelar)
    const r = await controle.promessa
    store.setCancelarAtual(null)
    if (r.erro || !r.url) {
      store.setErro(r.erro ?? 'Falha no envio do vídeo')
      return { erro: r.erro ?? 'Falha no envio do vídeo' }
    }
    mediaUrl = r.url
  } else {
    const r = await comprimirEUploadImagem(preparada.uriEnvio, 'explore-media', mediaPath, 1440)
    if (r.erro || !r.url) {
      store.setErro(r.erro ?? 'Falha no envio da foto')
      return { erro: r.erro ?? 'Falha no envio da foto' }
    }
    mediaUrl = r.url
    store.setProgresso(1)
  }

  // 3. Thumb (720p) — vídeo e foto
  const rThumb = await comprimirEUploadImagem(preparada.thumbUri, 'explore-media', thumbPath, 720)
  if (rThumb.erro || !rThumb.url) {
    store.setErro(rThumb.erro ?? 'Falha no envio da thumbnail')
    return { erro: rThumb.erro ?? 'Falha no envio da thumbnail' }
  }

  // 4. Registro (RLS store_posts_insert_proprio valida tenant+loja).
  // Falha aqui deixa objeto órfão — o Stage 8 detecta e resolve.
  store.setEstado('criando-registro')
  const { error } = await supabase.from('store_posts').insert({
    store_id: storeId,
    tenant_id: tenantId,
    product_id: dados.productId,
    tipo: preparada.tipo,
    media_path: mediaPath,
    media_url: mediaUrl,
    thumb_path: thumbPath,
    thumb_url: rThumb.url,
    descricao: dados.descricao.trim() || null,
    tags: dados.tags,
    duracao_seg: preparada.tipo === 'video' ? preparada.duracaoSeg : null,
    largura: preparada.largura,
    altura: preparada.altura,
    bytes: preparada.bytes,
    status: 'published', // moderação 'approved' por padrão (Stage 0)
    publicado_em: new Date().toISOString(),
  })

  if (error) {
    const mensagem = mensagemErroPost(error.message)
    store.setErro(mensagem)
    return { erro: mensagem }
  }

  store.setEstado('concluido')
  store.setProgresso(1)
  return { sucesso: true }
}

/** Normalização de tag — contrato compartilhado em @mallevo/lib. */
export { normalizarTag } from '@mallevo/lib'

export interface ProdutoBusca {
  id: string
  nome: string
  preco: number
  foto_url: string | null
}

/** Busca produtos da loja ativa para vincular ao post (RLS filtra o tenant). */
export async function buscarProdutosLoja(storeId: string, termo: string): Promise<ProdutoBusca[]> {
  let query = supabase
    .from('products')
    .select('id, nome, preco, foto_url')
    .eq('store_id', storeId)
    .eq('disponivel', true)
    .order('nome')
    .limit(12)

  if (termo.trim()) query = query.ilike('nome', `%${termo.trim()}%`)

  const { data } = await query
  return (data ?? []) as ProdutoBusca[]
}
