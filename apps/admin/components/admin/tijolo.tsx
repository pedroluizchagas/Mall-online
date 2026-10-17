import { cx } from '@/lib/cx'
import { iniciais } from '@/lib/format'

/**
 * Tijolo de identidade nas listas da folha: a logo da loja (ou a foto do
 * entregador) e, sem imagem, as iniciais em moeda monocromática — sem cor por
 * tipo, que é cara de app genérico. Loja é quadrada de canto 12; pessoa é
 * redonda.
 */
export function Tijolo({
  nome,
  foto,
  forma = 'loja',
  className,
}: {
  nome: string
  foto?: string | null
  forma?: 'loja' | 'pessoa'
  className?: string
}) {
  const classe = cx('size-11 shrink-0', forma === 'pessoa' ? 'rounded-full' : 'rounded-[12px]', className)
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" loading="lazy" className={cx(classe, 'bg-bg-2 object-cover')} />
  }
  return (
    <span
      aria-hidden
      className={cx(classe, 'flex items-center justify-center bg-bg-3 text-[14px] font-extrabold tracking-[-0.02em] text-ink')}
    >
      {iniciais(nome) || '·'}
    </span>
  )
}
