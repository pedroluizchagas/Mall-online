import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { supabase } from './supabase'

// Pipeline de foto do catálogo (docs/partner-app/06-stage-4-catalogo.md):
// câmera/galeria → redimensionar/comprimir no cliente → upload no MESMO
// bucket e path-pattern do Dashboard (product-images/{tenant_id}/{ts}.jpg).

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
 * Comprime (≤1080px, JPEG q0.8) e sobe a imagem para um bucket público.
 * Retorna a URL pública — mesmo resultado do upload do Dashboard.
 */
export async function comprimirEUploadImagem(
  uriLocal: string,
  bucket: string,
  caminho: string
): Promise<{ url?: string; erro?: string }> {
  try {
    const manipulada = await manipulateAsync(uriLocal, [{ resize: { width: 1080 } }], {
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
