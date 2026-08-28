import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'

/**
 * avatar.ts — foto de perfil do consumidor.
 *
 * Mesmo desenho do app do entregador (mobile-courier/app/(tabs)/perfil.tsx):
 * bucket público, um arquivo por usuário em `{uid}/perfil.jpg`, sempre
 * upsert. Um caminho fixo significa que trocar a foto não deixa lixo no
 * bucket e que não existe estado a reconciliar entre storage e tabela.
 *
 * O upload vai por `fetch` + FormData na API REST do storage, e não pelo
 * `supabase.storage.upload()`: no React Native o SDK precisa de um
 * ArrayBuffer (o Blob do RN não carrega o tamanho), o que obrigaria a ler o
 * arquivo inteiro na memória do JS. O FormData com `{ uri }` deixa a ponte
 * nativa fazer o streaming.
 */

const BUCKET = 'consumer-avatars'

/** Opções comuns às duas origens: quadrado, com recorte, comprimido. */
const OPCOES = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 0.8,
}

export type OrigemFoto = 'camera' | 'galeria'

export class ErroPermissao extends Error {}

/**
 * Abre a câmera ou a galeria e devolve o URI local escolhido.
 * `null` = usuário cancelou. Lança `ErroPermissao` se negou o acesso.
 */
export async function escolherFoto(origem: OrigemFoto): Promise<string | null> {
  const permissao =
    origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permissao.granted) {
    throw new ErroPermissao(
      origem === 'camera'
        ? 'Permita o acesso à câmera para tirar uma foto.'
        : 'Permita o acesso à galeria para escolher uma foto.'
    )
  }

  const resultado =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(OPCOES)
      : await ImagePicker.launchImageLibraryAsync(OPCOES)

  if (resultado.canceled || !resultado.assets?.[0]) return null
  return resultado.assets[0].uri
}

/**
 * Envia a imagem e devolve a URL pública já com cache-bust.
 *
 * O `?t=` é o que faz a troca aparecer: o caminho é sempre o mesmo, então
 * sem query nova o RN serve a imagem antiga do cache.
 */
export async function enviarAvatar(uri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada. Faça login novamente.')

  const caminho = `${session.user.id}/perfil.jpg`

  const formData = new FormData()
  formData.append('file', {
    uri,
    name: 'perfil.jpg',
    type: 'image/jpeg',
  } as unknown as Blob)

  const resposta = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
      },
      body: formData,
    }
  )

  if (!resposta.ok) throw new Error('Upload falhou')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
  return `${data.publicUrl}?t=${Date.now()}`
}

/**
 * Remove o arquivo do bucket. Falha aqui é ignorada de propósito: quem
 * manda na UI é `consumers.foto_url`, e um arquivo órfão no bucket é menos
 * grave que o botão "Remover foto" não funcionar.
 */
export async function apagarAvatar(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return

  try {
    await supabase.storage.from(BUCKET).remove([`${session.user.id}/perfil.jpg`])
  } catch {
    // Silencioso — ver comentário acima.
  }
}
