import { LojaNaoEncontrada } from '@/app/loja-nao-encontrada/loja-nao-encontrada'

export const metadata = {
  title: 'Loja não encontrada · Mallevo',
}

/**
 * Rota acessível diretamente (`/loja-nao-encontrada`). O mesmo conteúdo é
 * renderizado por `app/not-found.tsx` quando `getStore()` chama `notFound()`
 * (loja inexistente/inativa ou slug ausente). Roteamento host-based (D1):
 * NÃO existe segmento `/loja/` de catálogo aqui.
 */
export default function LojaNaoEncontradaPage() {
  return <LojaNaoEncontrada />
}
