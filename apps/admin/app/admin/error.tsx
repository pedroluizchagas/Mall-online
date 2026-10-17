'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * A tela quebrou ao montar — uma consulta falhou (banco fora, RLS, rede) ou
 * um pedaço da página não carregou. Antes o erro de consulta virava lista
 * vazia ("nenhum lojista") e escondia o problema; agora a tela diz que não
 * carregou e oferece tentar de novo. A moldura continua de pé.
 */
export default function ErroNaAdministracao({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [tentando, iniciar] = useTransition()

  // O erro veio do servidor: sem o refresh, o reset só redesenharia o mesmo erro.
  function tentarDeNovo() {
    iniciar(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="vidro-fosco flex min-h-full items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
          <PartnerIcon name="alert" size={22} strokeWidth={1.9} />
        </span>
        <h1 className="mt-6 text-[34px] font-semibold leading-[1] tracking-[-0.04em] text-ink">
          Esta tela
          <span className="mt-1 block italic">
            <span className="marca-texto">não carregou.</span>
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">
          Algo falhou no caminho até aqui. Tente de novo; se continuar, o código abaixo ajuda a achar o motivo nos logs.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[12px] text-ink-3">Código {error.digest}</p>}
        <button
          type="button"
          onClick={tentarDeNovo}
          disabled={tentando}
          className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-brick px-6 text-[15px] font-bold text-brick-ink transition-colors hover:bg-brick-dk disabled:opacity-70"
        >
          <PartnerIcon name="undo" size={16} strokeWidth={2.2} />
          {tentando ? 'Carregando…' : 'Tentar de novo'}
        </button>
      </div>
    </div>
  )
}
