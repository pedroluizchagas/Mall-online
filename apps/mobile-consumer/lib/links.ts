import { Linking, Alert } from 'react-native'

/**
 * links.ts — endereços institucionais abertos no navegador do sistema.
 *
 * Vêm de env com fallback: as páginas ainda serão publicadas, e ler do env
 * permite corrigir a URL por EAS Update, sem submeter build novo à loja.
 */

export const URL_TERMOS =
  process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://mallevo.com.br/termos'

export const URL_PRIVACIDADE =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://mallevo.com.br/privacidade'

/** Abre a URL, avisando se o aparelho não conseguir. */
export async function abrirLink(url: string) {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Não foi possível abrir', url)
  }
}
