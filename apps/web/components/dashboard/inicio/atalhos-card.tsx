import Link from 'next/link'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

interface Atalho {
  href: string
  icone: PartnerIconName
  rotulo: string
  descricao: string
}

/**
 * Atalhos da loja — a lista do app ("Publicar no Explorar", "Relatórios",
 * "Minha loja"): moeda monocromática, rótulo, descrição e a seta.
 */
export function AtalhosCard({ atalhos, avaliacao }: { atalhos: Atalho[]; avaliacao: number | null }) {
  return (
    <div className="cartao flex flex-1 flex-col p-2">
      <ul className="flex flex-col">
        {atalhos.map((a, i) => (
          <li key={a.href} className={i > 0 ? 'border-t border-line' : undefined}>
            <Link
              href={a.href}
              className="group flex items-center gap-3.5 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-2"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink transition-colors group-hover:bg-bg">
                <PartnerIcon name={a.icone} size={18} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{a.rotulo}</span>
                <span className="block truncate text-[12.5px] text-ink-3">{a.descricao}</span>
              </span>
              <PartnerIcon
                name="chevron-right"
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-ink-3 transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/avaliacoes"
        className="mx-1 mb-1 mt-auto flex items-center justify-between gap-3 rounded-[14px] bg-bg-2 px-4 py-3 transition-colors hover:bg-bg-3"
      >
        <span className="micro text-ink-3">Avaliação média</span>
        <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink tabular-nums">
          <PartnerIcon name="star" size={15} strokeWidth={2.1} />
          {avaliacao !== null ? avaliacao.toFixed(1).replace('.', ',') : 'Sem notas'}
        </span>
      </Link>
    </div>
  )
}
