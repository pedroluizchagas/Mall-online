import { LojaNaoEncontrada } from '@/app/loja-nao-encontrada/loja-nao-encontrada'

/**
 * Destino de `notFound()` (chamado em lib/tenant.ts quando o slug está
 * ausente ou a loja não existe/está inativa na view pública). Renderiza a
 * mesma UI de `/loja-nao-encontrada`.
 */
export default function NotFound() {
  return <LojaNaoEncontrada />
}
