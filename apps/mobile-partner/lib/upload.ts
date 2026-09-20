import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type * as tus from 'tus-js-client'
import { criarUploadTUS, type ArquivoTUS, type ControleUpload } from '@mallevo/lib'
import { supabase } from './supabase'

// Pipeline de imagem (docs/partner-app/06) + upload resumível TUS de
// vídeo (docs/partner-app/09 §5): o endpoint resumable do Storage
// (/storage/v1/upload/resumable) com tus-js-client, offsets persistidos
// em AsyncStorage — matar a rede no meio retoma do ponto, não do zero.

/** Abre câmera ou galeria e devolve o URI local da imagem (ou null se cancelou). */
export async function escolherImagem(origem: 'camera' | 'galeria'): Promise<string | null> {
  if (origem === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return null
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
    return r.canceled ? null : r.assets[0]?.uri ?? null
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 })
  return r.canceled ? null : r.assets[0]?.uri ?? null
}

function base64ParaBytes(base64: string): Uint8Array {
  const bin = globalThis.atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * Comprime (≤larguraMax px, JPEG q0.8) e sobe a imagem para um bucket
 * público. Retorna a URL pública — mesmo resultado do upload do Dashboard.
 */
export async function comprimirEUploadImagem(
  uriLocal: string,
  bucket: string,
  caminho: string,
  larguraMax: number = 1080
): Promise<{ url?: string; erro?: string }> {
  try {
    const manipulada = await manipulateAsync(uriLocal, [{ resize: { width: larguraMax } }], {
      compress: 0.8,
      format: SaveFormat.JPEG,
      base64: true,
    })

    if (!manipulada.base64) return { erro: 'Falha ao processar a imagem' }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(caminho, base64ParaBytes(manipulada.base64), {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) return { erro: 'Erro ao fazer upload da foto' }

    const { data } = supabase.storage.from(bucket).getPublicUrl(caminho)
    return { url: data.publicUrl }
  } catch {
    return { erro: 'Erro ao preparar a foto' }
  }
}

// ————— Upload resumível (TUS) — vídeos do Explorar —————

/** urlStorage do tus persistido em AsyncStorage: retomada sobrevive a restart. */
const tusUrlStorage: tus.UrlStorage = {
  async findAllUploads() {
    const chaves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('tus::'))
    const pares = await AsyncStorage.multiGet(chaves)
    return pares
      .map(([, v]) => (v ? (JSON.parse(v) as tus.PreviousUpload) : null))
      .filter((v): v is tus.PreviousUpload => v !== null)
  },
  async findUploadsByFingerprint(fingerprint: string) {
    const v = await AsyncStorage.getItem(`tus::${fingerprint}`)
    return v ? [JSON.parse(v) as tus.PreviousUpload] : []
  },
  async removeUpload(urlStorageKey: string) {
    await AsyncStorage.removeItem(urlStorageKey)
  },
  async addUpload(fingerprint: string, upload: tus.PreviousUpload) {
    const chave = `tus::${fingerprint}`
    await AsyncStorage.setItem(chave, JSON.stringify(upload))
    return chave
  },
}

export type { ControleUpload } from '@mallevo/lib'

/**
 * Sobe um arquivo local (uri) para o bucket via protocolo TUS do Storage.
 * Progresso 0–1 em onProgress; retomada automática por fingerprint
 * (bucket+caminho) mesmo após queda de rede/app. A mecânica vive em
 * `criarUploadTUS` (@mallevo/lib, compartilhada com o dashboard web); aqui
 * entram só a fonte `{ uri }` do React Native e o AsyncStorage dos offsets.
 */
export function uploadResumavelTUS(
  uriLocal: string,
  bucket: string,
  caminho: string,
  contentType: string,
  onProgress: (fracao: number) => void
): ControleUpload {
  let controle: ControleUpload | null = null
  let cancelado = false

  const promessa = (async (): Promise<{ url?: string; erro?: string }> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { erro: 'Sessão expirada — entre novamente' }
    if (cancelado) return { erro: 'Upload cancelado' }

    controle = criarUploadTUS({
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      accessToken: session.access_token,
      bucket,
      caminho,
      contentType,
      // tus-js-client em React Native aceita { uri } como fonte do arquivo
      arquivo: { uri: uriLocal } as unknown as ArquivoTUS,
      urlStorage: tusUrlStorage,
      fingerprint: `partner-${bucket}-${caminho}`,
      onProgress,
    })
    return controle.promessa
  })()

  return {
    promessa,
    cancelar: () => {
      cancelado = true
      controle?.cancelar()
    },
  }
}
