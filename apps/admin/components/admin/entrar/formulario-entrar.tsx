'use client'

import { useState, useTransition } from 'react'
import { loginAdmin } from '@/lib/actions/auth'
import { cx } from '@/lib/cx'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * O formulário da porta: e-mail, senha e o CTA aceso. O erro de acesso
 * (conta sem papel de admin) chega do servidor por `avisoInicial`.
 */
export function FormularioEntrar({ avisoInicial }: { avisoInicial: string | null }) {
  const [erro, setErro] = useState<string | null>(avisoInicial)
  const [enviando, iniciar] = useTransition()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setErro(null)
    iniciar(async () => {
      const resultado = await loginAdmin(formData)
      if (resultado?.erro) setErro(resultado.erro)
    })
  }

  return (
    <form onSubmit={enviar} className="mt-8 space-y-5">
      <Campo id="email" rotulo="E-mail" icone="mail" name="email" type="email" autoComplete="email" placeholder="voce@mallevo.com.br" />
      <Campo
        id="senha"
        rotulo="Senha"
        icone="lock"
        name="senha"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
      />

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[13.5px] font-semibold"
          style={{ background: 'var(--err-lt)', color: 'var(--err)' }}
        >
          <PartnerIcon name="close-circle" size={16} strokeWidth={2.1} className="mt-px shrink-0" />
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brick text-[15px] font-bold text-brick-ink transition-[background-color,transform] duration-300 ease-entrada hover:bg-brick-dk active:scale-[0.98] disabled:opacity-70"
      >
        {enviando ? (
          <>
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-[color:var(--brick-ink)] border-t-transparent" />
            Abrindo os bastidores…
          </>
        ) : (
          <>
            Entrar na administração
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
  )
}

function Campo({
  id,
  rotulo,
  icone,
  ...input
}: {
  id: string
  rotulo: string
  icone: 'mail' | 'lock'
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-semibold text-ink-2">
        {rotulo}
      </label>
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
            'h-[52px] w-full rounded-[16px] bg-bg pl-11 pr-4 text-[15px] text-ink outline-none focus-visible:outline-none ring-1 ring-inset ring-line-2 transition-[box-shadow] duration-200 placeholder:text-ink-4',
            'focus:ring-2 focus:ring-ink',
          )}
          {...input}
        />
      </div>
    </div>
  )
}
