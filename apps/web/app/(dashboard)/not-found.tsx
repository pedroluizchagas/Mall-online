import Link from 'next/link'
import { PartnerIcon } from '@/components/ui/partner-icon'

/** Item ou página que não existe mais, dentro do painel (a folha vem do layout). */
export default function NaoEncontradoNoPainel() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
          <PartnerIcon name="search" size={22} strokeWidth={1.9} />
        </span>
        <p className="micro mt-6 text-ink-3">Erro 404</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1] tracking-[-0.04em] text-ink">
          Isso não está
          <span className="mt-1 block italic">
            <span className="marca-texto">no balcão.</span>
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
          O endereço pode ter mudado, ou o item foi removido. Pela busca (Ctrl K) você chega em qualquer tela.
        </p>
        <Link
          href="/"
          className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors bg-brick text-brick-ink hover:bg-brick-dk"
        >
          Voltar ao Início
          <PartnerIcon
            name="chevron-right"
            size={16}
            strokeWidth={2.4}
            className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  )
}
