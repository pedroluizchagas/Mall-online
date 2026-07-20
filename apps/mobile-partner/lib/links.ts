import * as WebBrowser from 'expo-web-browser'

/**
 * Abre uma rota do Dashboard web (onboarding, regularização de assinatura,
 * fluxos web-only). O app NUNCA reimplementa esses fluxos —
 * docs/partner-app/04-stage-2-auth-gate.md.
 */
export function abrirNoDashboard(caminho: string = '/') {
  const base = process.env.EXPO_PUBLIC_APP_URL
  if (!base) {
    console.warn('EXPO_PUBLIC_APP_URL ausente — configure no .env.local')
    return
  }
  const url = `${base.replace(/\/$/, '')}${caminho.startsWith('/') ? caminho : `/${caminho}`}`
  WebBrowser.openBrowserAsync(url).catch(() => {})
}
