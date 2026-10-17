import Image from 'next/image'
import { Sobrelinha, Statement } from '@/components/admin/marquise'
import { FormularioEntrar } from '@/components/admin/entrar/formulario-entrar'
import { Portaria } from '@/components/admin/entrar/portaria'
import { PartnerIcon } from '@/components/ui/partner-icon'

const CONTATO = 'contato@mallevo.com.br'
const PAINEL_DO_LOJISTA = 'https://app.mallevo.com.br/entrar'

/**
 * Entrar — quem ainda não entrou está "fora", na fachada: a marquise inteira
 * (zinco, neon, grão, as cruzes de alinhamento da landing) com a portaria da
 * cidade no topo, o statement da porta e a folha clara com o formulário — o
 * mesmo desenho do Entrar do painel do lojista. Nenhum número inventado.
 */
export default function PaginaEntrar({ searchParams }: { searchParams: { erro?: string } }) {
  const aviso = searchParams.erro === 'acesso-negado' ? 'Esta conta não tem acesso à administração.' : null

  return (
    <div className="sobre-escuro grao relative isolate min-h-[100dvh] overflow-hidden bg-marquee text-white">
      <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />
      <Cruzes />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1320px] flex-col px-5 md:px-8">
        <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[76px]">
          <Portaria />
          <span className="col-start-1 block h-6 w-[152px] md:col-start-2 md:h-7 md:w-[177px]">
            <Image
              src="/brand/mallevo-logo-white.png"
              alt="Mallevo"
              width={669}
              height={106}
              priority
              unoptimized
              className="h-full w-auto"
            />
          </span>
          <div className="col-start-3 flex justify-end">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[color:var(--m-glass)] px-4 text-[13px] font-bold text-[color:var(--m-ink-2)] ring-1 ring-inset ring-[color:var(--m-line)]">
              <PartnerIcon name="lock" size={14} strokeWidth={2.1} />
              <span className="hidden sm:inline">Acesso restrito</span>
            </span>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="entra">
              <Sobrelinha aoVivo>Administração · Divinópolis</Sobrelinha>
            </div>
            <div className="entra" style={{ ['--d' as string]: '0.06s' }}>
              <Statement className="mt-7 text-[clamp(46px,7vw,96px)]" linha="Os bastidores" acesa={<>do shopping.</>} />
            </div>
            <p
              className="entra mt-7 max-w-[500px] text-[clamp(16px,1.25vw,18px)] leading-[1.6] text-[color:var(--m-ink-2)]"
              style={{ ['--d' as string]: '0.16s' }}
            >
              Lojistas, entregadores, planos e o dinheiro que passa pelo shopping — tudo o que mantém as luzes acesas.
            </p>
          </div>

          <div className="entra lg:col-span-6 xl:col-span-5" style={{ ['--d' as string]: '0.24s' }}>
            <div className="sobre-claro vidro-fosco relative mx-auto w-full max-w-[460px] rounded-[30px] p-7 text-ink shadow-[0_50px_100px_-40px_rgba(0,0,0,0.85)] sm:p-9 lg:ml-auto lg:mr-0">
              <p className="micro text-ink-3">Equipe Mallevo</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.04em]">Entre na administração.</h2>

              <FormularioEntrar avisoInicial={aviso} />

              <p className="mt-7 border-t border-line pt-6 text-center text-[14px] leading-relaxed text-ink-3">
                Tem uma loja no shopping?{' '}
                <a href={PAINEL_DO_LOJISTA} className="sublinha font-bold text-ink">
                  Entre pelo painel do lojista
                </a>
              </p>
            </div>
          </div>
        </main>

        <footer className="flex flex-col gap-2 border-t border-[color:var(--m-line)] py-5 text-[12.5px] text-[color:var(--m-ink-3)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mallevo · O shopping digital de Divinópolis</p>
          <a href={`mailto:${CONTATO}`} className="sublinha self-start transition-colors hover:text-white sm:self-auto">
            {CONTATO}
          </a>
        </footer>
      </div>
    </div>
  )
}

/** As cruzes de alinhamento da fachada (o grid que a landing deixa à mostra). */
function Cruzes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto max-w-[1320px] px-5 md:px-8">
      <div className="relative h-full">
        {[
          ['0%', '22%'],
          ['50%', '22%'],
          ['100%', '22%'],
          ['0%', '80%'],
          ['100%', '80%'],
        ].map(([x, y]) => (
          <span
            key={`${x}-${y}`}
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 text-white/[0.16]"
            style={{ left: x, top: y }}
          >
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
          </span>
        ))}
      </div>
    </div>
  )
}
