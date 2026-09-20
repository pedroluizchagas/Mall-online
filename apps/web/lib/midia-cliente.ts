'use client'

/**
 * Preparo de mídia no navegador para os posts do Explorar — o papel que
 * `expo-image-manipulator` e `expo-video-thumbnails` fazem no Partner App:
 * redimensionar foto para JPEG, ler dimensões/duração de vídeo e capturar
 * um frame para a thumb. Só Canvas e elementos de mídia, sem dependências.
 */

export interface ImagemPreparada {
  blob: Blob
  largura: number
  altura: number
}

function canvasParaJpeg(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/jpeg', qualidade)
  })
}

async function decodificarImagem(fonte: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(fonte, { imageOrientation: 'from-image' })
    } catch {
      /* cai para o <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fonte)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagem inválida'))
    }
    img.src = url
  })
}

/** Redimensiona para até `larguraMax` (mantendo proporção) e recomprime em JPEG. */
export async function redimensionarImagem(fonte: Blob, larguraMax: number, qualidade = 0.85): Promise<ImagemPreparada> {
  const img = await decodificarImagem(fonte)
  const largura0 = 'naturalWidth' in img ? img.naturalWidth : img.width
  const altura0 = 'naturalHeight' in img ? img.naturalHeight : img.height
  const fator = Math.min(1, larguraMax / Math.max(1, largura0))
  const largura = Math.max(1, Math.round(largura0 * fator))
  const altura = Math.max(1, Math.round(altura0 * fator))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  // Fundo branco: PNG/WebP com transparência viram JPEG sem preto.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, largura, altura)
  ctx.drawImage(img, 0, 0, largura, altura)
  if ('close' in img) img.close()

  const blob = await canvasParaJpeg(canvas, qualidade)
  return { blob, largura, altura }
}

export interface VideoLido {
  duracaoSeg: number
  largura: number
  altura: number
  /** Frame em ~1s, JPEG, até `thumbLargura` px. */
  thumb: Blob
}

/** Lê duração/dimensões e captura um frame do vídeo para a thumb. */
export function lerVideo(arquivo: File, thumbLargura: number): Promise<VideoLido> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    const limpar = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }
    const falhar = (msg: string) => {
      limpar()
      reject(new Error(msg))
    }

    video.onerror = () => falhar('Não foi possível ler o vídeo. Use MP4 (H.264) ou MOV.')

    video.onloadedmetadata = () => {
      const duracao = Number.isFinite(video.duration) ? video.duration : 0
      if (!duracao) return falhar('Vídeo sem duração legível.')
      // Frame de 1s (ou o meio, em vídeos mais curtos) — como no app.
      video.currentTime = Math.min(1, duracao / 2)
    }

    video.onseeked = async () => {
      try {
        const largura0 = video.videoWidth
        const altura0 = video.videoHeight
        const fator = Math.min(1, thumbLargura / Math.max(1, largura0))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(largura0 * fator))
        canvas.height = Math.max(1, Math.round(altura0 * fator))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas indisponível')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumb = await canvasParaJpeg(canvas, 0.82)
        const duracaoSeg = Math.max(1, Math.round(video.duration))
        limpar()
        resolve({ duracaoSeg, largura: largura0, altura: altura0, thumb })
      } catch (e) {
        falhar(e instanceof Error ? e.message : 'Falha ao capturar a thumb do vídeo')
      }
    }
  })
}
