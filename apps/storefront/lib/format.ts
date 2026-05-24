/**
 * Helpers de formatação do storefront.
 *
 * Moeda: re-exporta `formatarReais` de @mallevo/lib (single source of truth —
 * a regra de centavos→BRL não pode divergir entre canais).
 * Data: helpers locais com Intl pt-BR (sem coupling extra de locale).
 */
export { formatarReais } from '@mallevo/lib'

/** Data curta: "15 mai 2026". */
export function formatarData(value?: string | number | Date | null): string {
  if (value == null) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/** Data + hora: "15 mai 2026, 14:30". */
export function formatarDataHora(value?: string | number | Date | null): string {
  if (value == null) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Hora curta: "14:30". */
export function formatarHora(value?: string | number | Date | null): string {
  if (value == null) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
