import { formatarHorario, horarioDeHoje, relogioDaLoja } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'
import { StatusAberto } from './StatusAberto'

/**
 * Fecho da página da loja: nome, horário de hoje (de `stores.horarios`),
 * telefone e a assinatura do shopping. Toda vitrine termina num fecho — este
 * é o do layout padrão.
 */
export function FechoLoja({ store }: { store: Store }) {
  const hoje = horarioDeHoje(store.horarios, relogioDaLoja())

  return (
    <footer className="mt-12 border-t border-line bg-surface px-screen-x py-8">
      <p className="font-display text-display-md font-extrabold tracking-tight text-ink">
        {store.nome}
      </p>

      <dl className="mt-4 flex flex-col gap-2 text-sm text-ink-muted">
        {hoje ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="font-semibold">Hoje</dt>
            <dd className="flex items-center gap-3 font-semibold text-ink">
              {formatarHorario(hoje)}
              <StatusAberto horarios={store.horarios} className="text-[13px] font-semibold text-ink-muted" />
            </dd>
          </div>
        ) : null}
        {store.telefone ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="font-semibold">Contato</dt>
            <dd>
              <a href={`tel:${store.telefone}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                {store.telefone}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-ink-muted">
        <a href="https://mallevo.com.br" className="font-bold hover:text-ink">
          Uma loja do Mallevo · Divinópolis
        </a>
        <span className="flex gap-4">
          <a href="/termos" className="hover:text-ink">Termos</a>
          <a href="/privacidade" className="hover:text-ink">Privacidade</a>
        </span>
      </div>
    </footer>
  )
}
