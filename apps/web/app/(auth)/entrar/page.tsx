'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { relogioDaLoja } from '@mallevo/lib'
import { login } from '@/lib/actions/auth'
import { cx } from '@/lib/cx'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { Sobrelinha, Statement } from '@/components/dashboard/marquise'
import { useAgora } from '@/components/dashboard/hooks/use-agora'

const CONTATO = 'contato@mallevo.com.br'

/**
 * Entrar — quem ainda não entrou está "fora", na fachada: a marquise inteira
 * (zinco, neon, grão, as cruzes de alinhamento da landing) com a portaria da
 * cidade no topo, o statement da porta e a folha clara com o formulário.
 * Nenhum número inventado: o painel mostra os da loja depois de entrar.
 */
export default function PaginaEntrar() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await login(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setEnviando(false)
    }
  }

  return (
    <div className="sobre-escuro grao relative isolate min-h-[100dvh] overflow-hidden bg-marquee text-white">
      <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />
      <Cruzes />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1320px] flex-col px-5 md:px-8">
        <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[76px]">
          <Portaria />
          <Link href="/entrar" aria-label="Mallevo" className="col-start-1 block h-6 w-[152px] md:col-start-2 md:h-7 md:w-[177px]">
            <Image
              src="/brand/mallevo-logo-white.png"
              alt="Mallevo"
              width={669}
              height={106}
              priority
              unoptimized
              className="h-full w-auto"
            />
          </Link>
          <div className="col-start-3 flex justify-end">
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[color:var(--m-glass)] px-4 text-[13.5px] font-bold text-white ring-1 ring-inset ring-[color:var(--m-line)] transition-colors hover:bg-[color:var(--m-glass-2)]"
            >
              <span className="hidden sm:inline">Cadastrar minha loja</span>
              <span className="sm:hidden">Cadastrar</span>
            </Link>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="entra">
              <Sobrelinha aoVivo>Painel do lojista · Divinópolis</Sobrelinha>
            </div>
            <div className="entra" style={{ ['--d' as string]: '0.06s' }}>
              <Statement
                className="mt-7 text-[clamp(46px,7vw,96px)]"
                linha="Abra a porta"
                acesa={<>da sua{' '}loja.</>}
              />
            </div>
            <p
              className="entra mt-7 max-w-[500px] text-[clamp(16px,1.25vw,18px)] leading-[1.6] text-[color:var(--m-ink-2)]"
              style={{ ['--d' as string]: '0.16s' }}
            >
              Pedidos ao vivo, catálogo, vitrine e o dinheiro do dia — o mesmo balcão do app, na tela grande.
            </p>
          </div>

          <div className="entra lg:col-span-6 xl:col-span-5" style={{ ['--d' as string]: '0.24s' }}>
            <div className="sobre-claro vidro-fosco relative mx-auto w-full max-w-[460px] rounded-[30px] p-7 text-ink shadow-[0_50px_100px_-40px_rgba(0,0,0,0.85)] sm:p-9 lg:ml-auto lg:mr-0">
              <p className="micro text-ink-3">Já tenho loja no Mallevo</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.04em]">Entre no seu balcão.</h2>

              <form action={handleSubmit} className="mt-8 space-y-5">
                <Campo
                  id="email"
                  rotulo="E-mail"
                  icone="mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@sualoja.com.br"
                />
                <Campo
                  id="senha"
                  rotulo="Senha"
                  icone="lock"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  extra={
                    <a
                      href={`mailto:${CONTATO}?subject=${encodeURIComponent('Recuperar acesso ao painel Mallevo')}`}
                      className="text-[13px] font-semibold text-ink-3 transition-colors hover:text-ink"
                    >
                      Esqueceu a senha?
                    </a>
                  }
                />

                {erro && (
                  <p
                    role="alert"
                    className="flex items-center gap-2 rounded-[14px] px-3.5 py-3 text-[13.5px] font-semibold"
                    style={{ background: 'var(--err-lt)', color: 'var(--err)' }}
                  >
                    <PartnerIcon name="close-circle" size={16} strokeWidth={2.1} className="shrink-0" />
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold transition-[background-color,transform] duration-300 ease-entrada bg-brick text-brick-ink hover:bg-brick-dk active:scale-[0.98] disabled:opacity-70"
                >
                  {enviando ? (
                    <>
                      <span
                        aria-hidden
                        className="size-4 animate-spin rounded-full border-2 border-[color:var(--brick-ink)] border-t-transparent"
                      />
                      Abrindo o balcão…
                    </>
                  ) : (
                    <>
                      Entrar no painel
                      <PartnerIcon
                        name="chevron-right"
                        size={17}
                        strokeWidth={2.4}
                        className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 border-t border-line pt-6 text-center text-[14px] text-ink-3">
                Ainda não tem loja no shopping?{' '}
                <Link href="/onboarding" className="sublinha font-bold text-ink">
                  Cadastrar minha loja
                </Link>
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

function Campo({
  id,
  rotulo,
  icone,
  extra,
  ...input
}: {
  id: string
  rotulo: string
  icone: 'mail' | 'lock'
  extra?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-[13.5px] font-semibold text-ink-2">
          {rotulo}
        </label>
        {extra}
      </div>
      <div className="relative">
        <PartnerIcon
          name={icone}
          size={17}
          strokeWidth={1.9}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4"
        />
        <input
          id={id}
          required
          className={cx(
            'h-[52px] w-full rounded-[16px] bg-bg pl-11 pr-4 text-[15px] text-ink outline-none ring-1 ring-inset ring-line-2 transition-[box-shadow] duration-200 placeholder:text-ink-4',
            'focus:ring-2 focus:ring-ink',
          )}
          {...input}
        />
      </div>
    </div>
  )
}

/** A cidade e a hora dela — a portaria da landing. */
function Portaria() {
  const agora = useAgora(15_000)
  const r = agora ? relogioDaLoja(agora) : null
  return (
    <p className="hidden items-center gap-2.5 text-[12px] font-semibold text-[color:var(--m-ink-2)] md:flex">
      <PartnerIcon name="pin" size={15} strokeWidth={2.2} className="text-[color:var(--brick)]" />
      Divinópolis, MG
      <span className="font-mono tabular-nums text-white" suppressHydrationWarning>
        {r ? `${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}` : '--:--'}
      </span>
    </p>
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
