import Image from 'next/image'
import Link from 'next/link'
import { Sobrelinha, Statement } from '@/components/dashboard/marquise'
import { PartnerIcon } from '@/components/ui/partner-icon'

/** Endereço que não existe no painel — a fachada, como no Entrar. */
export default function NaoEncontrado() {
  return (
    <div className="sobre-escuro grao relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-marquee px-5 text-white md:px-8">
      <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />
      <header className="flex h-16 items-center md:h-[76px]">
        <Link href="/" aria-label="Mallevo" className="block h-6 w-[152px] md:h-7 md:w-[177px]">
          <Image
            src="/brand/mallevo-logo-white.png"
            alt="Mallevo"
            width={669}
            height={106}
            unoptimized
            className="h-full w-auto"
          />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center pb-24">
        <Sobrelinha aoVivo>Erro 404</Sobrelinha>
        <Statement className="mt-7 text-[clamp(44px,7vw,96px)]" linha="Essa porta" acesa={<>não existe.</>} />
        <p className="mt-7 max-w-[480px] text-[17px] leading-[1.6] text-[color:var(--m-ink-2)]">
          O endereço pode ter mudado. O balcão continua aberto no lugar de sempre.
        </p>
        <Link
          href="/"
          className="group mt-9 inline-flex h-[52px] w-fit items-center gap-2 rounded-full px-6 text-[15px] font-bold shadow-[0_14px_36px_-14px_rgba(193,241,72,0.6)] transition-colors bg-brick text-brick-ink hover:bg-brick-dk"
        >
          Ir para o painel
          <PartnerIcon
            name="chevron-right"
            size={17}
            strokeWidth={2.4}
            className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
          />
        </Link>
      </main>
    </div>
  )
}
