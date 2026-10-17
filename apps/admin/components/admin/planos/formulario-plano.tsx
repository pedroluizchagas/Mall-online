'use client'

import { useRef, useState, useTransition } from 'react'
import { criarPlano } from '@/lib/actions/admin'
import { cx } from '@/lib/cx'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { Botao } from '../dialogo'

const CLASSE_CAMPO =
  'h-11 w-full rounded-[14px] bg-bg px-4 text-[14.5px] text-ink outline-none focus-visible:outline-none ring-1 ring-inset ring-line-2 transition-shadow placeholder:text-ink-4 focus:ring-2 focus:ring-ink'

const RECURSOS = [
  { name: 'tem_estoque', rotulo: 'Estoque', descricao: 'Controle de estoque por produto' },
  { name: 'tem_relatorios', rotulo: 'Relatórios', descricao: 'Relatórios avançados no painel' },
  { name: 'tem_antecipacao', rotulo: 'Antecipação', descricao: 'Antecipar recebíveis' },
]

/**
 * Novo plano: o produto e o preço nascem no Stripe e só então o plano entra
 * na tabela. Preço em reais com vírgula ("49,90"); a ação guarda centavos.
 */
export function FormularioPlano() {
  const formRef = useRef<HTMLFormElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  // onSubmit (e não `action={fn}`): se o Stripe recusar, o que foi digitado
  // fica no formulário para corrigir.
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setErro(null)
    iniciar(async () => {
      const resultado = await criarPlano(formData)
      if ('erro' in resultado) {
        setErro(resultado.erro)
        return
      }
      formRef.current?.reset()
      showToast({ tipo: 'sucesso', titulo: 'Plano criado', descricao: 'Produto e preço já estão no Stripe.' })
    })
  }

  return (
    <form ref={formRef} onSubmit={enviar} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Campo id="plano-nome" rotulo="Nome do plano">
          <input id="plano-nome" name="nome" required maxLength={60} placeholder="Ex.: Profissional" className={CLASSE_CAMPO} />
        </Campo>
        <Campo id="plano-preco" rotulo="Preço mensal" dica="R$ 0,00 cria o plano sem cobrança.">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14.5px] font-semibold text-ink-3">
              R$
            </span>
            <input
              id="plano-preco"
              name="preco_mensal"
              required
              inputMode="decimal"
              placeholder="49,90"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              title="Use números, com vírgula para os centavos (ex.: 49,90)"
              className={cx(CLASSE_CAMPO, 'pl-11 tabular-nums')}
            />
          </div>
        </Campo>
      </div>

      <Campo id="plano-descricao" rotulo="Descrição" opcional>
        <input
          id="plano-descricao"
          name="descricao"
          maxLength={200}
          placeholder="Para quem é este plano, em uma frase"
          className={CLASSE_CAMPO}
        />
      </Campo>

      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-2">Limites</legend>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'max_lojas', rotulo: 'Lojas', padrao: '1' },
            { name: 'max_produtos', rotulo: 'Produtos', padrao: '30' },
            { name: 'max_entregadores', rotulo: 'Entregadores', padrao: '1' },
          ].map((c) => (
            <label key={c.name} className="block">
              <span className="micro mb-1.5 block text-ink-3">{c.rotulo}</span>
              <input
                name={c.name}
                type="number"
                min={1}
                step={1}
                required
                defaultValue={c.padrao}
                className={cx(CLASSE_CAMPO, 'tabular-nums')}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-2">Recursos incluídos</legend>
        <div className="flex flex-wrap gap-2">
          {RECURSOS.map((r) => (
            <label key={r.name} className="group relative cursor-pointer" title={r.descricao}>
              <input type="checkbox" name={r.name} value="true" className="peer sr-only" />
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-bg px-4 text-[13.5px] font-semibold text-ink-2 ring-1 ring-inset ring-line-2 transition-colors duration-200 hover:bg-bg-2 peer-checked:bg-ink peer-checked:text-bg peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ink)]">
                <PartnerIcon name="plus" size={14} strokeWidth={2.4} className="group-has-[:checked]:hidden" />
                <PartnerIcon name="check" size={14} strokeWidth={2.6} className="hidden group-has-[:checked]:block" />
                {r.rotulo}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

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

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Botao type="submit" variante="acao" carregando={pendente}>
          {pendente ? 'Criando no Stripe…' : 'Criar plano'}
        </Botao>
        <p className="text-[12.5px] text-ink-3">O produto e o preço mensal são criados no Stripe antes de o plano entrar aqui.</p>
      </div>
    </form>
  )
}

function Campo({
  id,
  rotulo,
  dica,
  opcional = false,
  children,
}: {
  id: string
  rotulo: string
  dica?: string
  opcional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline gap-2 text-[13.5px] font-semibold text-ink-2">
        {rotulo}
        {opcional && <span className="text-[12px] font-medium text-ink-3">opcional</span>}
      </label>
      {children}
      {dica && <p className="mt-1.5 text-[12px] text-ink-3">{dica}</p>}
    </div>
  )
}
