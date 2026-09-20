import * as tus from 'tus-js-client'

import { urlPublicaDoObjeto } from './posts'

/**
 * Upload resumível (TUS) para o Storage do Supabase — obrigatório para os
 * vídeos do Explorar (docs/partner-app/09 §5). Portado de
 * apps/mobile-partner/lib/upload.ts: a mesma mecânica (endpoint
 * `/storage/v1/upload/resumable`, chunk de 6 MB, retomada por fingerprint)
 * serve ao web (`File`) e ao React Native (`{ uri }`), mudando só a fonte do
 * arquivo e, opcionalmente, onde os offsets são persistidos (`urlStorage`:
 * AsyncStorage no app; no navegador o tus usa `localStorage` sozinho).
 */

export type ArquivoTUS = ConstructorParameters<typeof tus.Upload>[0]

export interface OpcoesUploadTUS {
  supabaseUrl: string
  /** `session.access_token` do usuário autenticado. */
  accessToken: string
  bucket: string
  caminho: string
  contentType: string
  arquivo: ArquivoTUS
  onProgress?: (fracao: number) => void
  /** Persistência dos offsets (RN: AsyncStorage). Omitido: o padrão do tus. */
  urlStorage?: tus.UrlStorage
  /** Identidade do upload para retomada; padrão `<bucket>/<caminho>`. */
  fingerprint?: string
  cacheControl?: string
}

export interface ControleUpload {
  promessa: Promise<{ url?: string; erro?: string }>
  cancelar: () => void
}

/** Exigido pelo endpoint resumable do Storage. */
export const CHUNK_TUS_BYTES = 6 * 1024 * 1024

export function criarUploadTUS(opcoes: OpcoesUploadTUS): ControleUpload {
  let uploadRef: tus.Upload | null = null
  let cancelado = false
  const fp = opcoes.fingerprint ?? `${opcoes.bucket}/${opcoes.caminho}`

  const promessa = new Promise<{ url?: string; erro?: string }>((resolve) => {
    const upload = new tus.Upload(opcoes.arquivo, {
      endpoint: `${opcoes.supabaseUrl.replace(/\/+$/, '')}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: CHUNK_TUS_BYTES,
      headers: {
        authorization: `Bearer ${opcoes.accessToken}`,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: opcoes.bucket,
        objectName: opcoes.caminho,
        contentType: opcoes.contentType,
        cacheControl: opcoes.cacheControl ?? '3600',
      },
      ...(opcoes.urlStorage ? { urlStorage: opcoes.urlStorage } : {}),
      storeFingerprintForResuming: true,
      fingerprint: async () => fp,
      removeFingerprintOnSuccess: true,
      onError: (err) => {
        if (cancelado) resolve({ erro: 'Upload cancelado' })
        else resolve({ erro: `Falha no envio: ${err.message ?? 'erro de rede'}` })
      },
      onProgress: (enviado, total) => {
        if (total > 0) opcoes.onProgress?.(Math.min(1, enviado / total))
      },
      onSuccess: () => {
        resolve({ url: urlPublicaDoObjeto(opcoes.supabaseUrl, opcoes.bucket, opcoes.caminho) })
      },
    })

    uploadRef = upload

    // Retoma do offset se já houver upload anterior deste fingerprint.
    void upload
      .findPreviousUploads()
      .then((anteriores) => {
        if (anteriores.length > 0) upload.resumeFromPreviousUpload(anteriores[0])
        upload.start()
      })
      .catch(() => upload.start())
  })

  return {
    promessa,
    cancelar: () => {
      cancelado = true
      void uploadRef?.abort()
    },
  }
}
