import Link from 'next/link'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { BarraProgresso, Sobrelinha, Statement } from './marquise'
import { Folha, SecaoFolha } from './folha'

interface ProximoPasso {
  id: string
  titulo: string
  descricao: string
  href: string
  icone: PartnerIconName
  concluido: boolean
}

interface Props {
  nomeLoja: string
  recebimentosOk: boolean
  temProdutos: boolean
  horariosConfigurados: boolean
  entregaConfigurada: boolean
}

/**
 * Início enquanto a loja não está pronta: a marquise diz quanto falta ("Sua
 * loja, / quase no ar.") e a folha lista os passos — cada um leva direto à
 * tela que o resolve.
 */
export function SetupWizard({
  nomeLoja,
  recebimentosOk,
  temProdutos,
  horariosConfigurados,
  entregaConfigurada,
}: Props) {
  const proximosPassos: ProximoPasso[] = [
    {
      id: 'recebimentos',
      titulo: 'Configurar recebimentos',
      descricao: 'Conclua a verificação Pagar.me para receber os pagamentos online.',
      href: '/configuracoes?aba=recebimentos',
      icone: 'wallet',
      concluido: recebimentosOk,
    },
    {
      id: 'produtos',
      titulo: 'Cadastrar produtos',
      descricao: 'Monte o catálogo que a vitrine vai mostrar.',
      href: '/produtos/novo',
      icone: 'package',
      concluido: temProdutos,
    },
    {
      id: 'horarios',
      titulo: 'Horários de funcionamento',
      descricao: 'Diga quando a loja abre — o shopping mostra se ela está aberta agora.',
      href: '/configuracoes?aba=horarios',
      icone: 'clock',
      concluido: horariosConfigurados,
    },
    {
      id: 'entrega',
      titulo: 'Configurar entrega',
      descricao: 'Defina taxa, raio de atendimento e tempo médio.',
      href: '/configuracoes?aba=entrega',
      icone: 'truck',
      concluido: entregaConfigurada,
    },
  ]

  const concluidos = proximosPassos.filter((p) => p.concluido).length
  const total = proximosPassos.length
  const proximo = proximosPassos.find((p) => !p.concluido)

  return (
    <>
      <section className="sobre-escuro relative px-6 pb-16 pt-8 text-white sm:px-10 sm:pt-10">
        <div className="mx-auto grid max-w-[1280px] gap-10 xl:grid-cols-12 xl:items-end xl:gap-8">
          <div className="entra xl:col-span-7">
            <Sobrelinha aoVivo>Boas-vindas ao balcão · {nomeLoja}</Sobrelinha>
            <Statement
              className="mt-7 text-[clamp(42px,5vw,72px)]"
              linha="Sua loja,"
              acesa={<>quase no{' '}ar.</>}
            />
            <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-[color:var(--m-ink-2)]">
              Faltam {total - concluidos} {total - concluidos === 1 ? 'passo' : 'passos'} para a vitrine abrir e os
              pedidos começarem a chegar.
            </p>
            {proximo && (
              <Link
                href={proximo.href}
                className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-bold shadow-[0_14px_36px_-14px_rgba(193,241,72,0.6)] transition-colors"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                {proximo.titulo}
                <PartnerIcon
                  name="chevron-right"
                  size={16}
                  strokeWidth={2.4}
                  className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>

          <div className="entra xl:col-span-5" style={{ ['--d' as string]: '0.12s' }}>
            <div className="rounded-[22px] bg-[color:var(--m-glass)] p-6 ring-1 ring-inset ring-[color:var(--m-line)]">
              <p className="micro text-[color:var(--m-ink-3)]">Configuração da loja</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-[56px] font-bold leading-none tracking-[-0.05em] tabular-nums">{concluidos}</span>
                <span className="text-[20px] font-semibold text-[color:var(--m-ink-2)]">de {total} passos</span>
              </p>
              <BarraProgresso fracao={concluidos / total} className="mt-5" />
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {proximosPassos.map((passo) => (
                  <li key={passo.id} className="flex items-center gap-2.5 text-[13px]">
                    <span
                      aria-hidden
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: passo.concluido ? 'var(--brick)' : 'var(--m-glass-2)',
                        color: 'var(--brick-ink)',
                      }}
                    >
                      {passo.concluido && <PartnerIcon name="check" size={11} strokeWidth={3} />}
                    </span>
                    <span className={passo.concluido ? 'text-white' : 'text-[color:var(--m-ink-2)]'}>
                      {passo.titulo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Folha>
        <div className="mx-auto max-w-[1280px] px-6 pt-10 sm:px-10 sm:pt-12">
          <SecaoFolha sobrelinha="Próximos passos" titulo="Deixe a loja pronta para vender">
            <ol className="grid gap-4 sm:grid-cols-2">
              {proximosPassos.map((passo, index) => (
                <li key={passo.id}>
                  <Link
                    href={passo.href}
                    className={`cartao group flex h-full items-start gap-4 p-5 transition-[box-shadow,transform] duration-300 ease-entrada hover:-translate-y-px hover:shadow-md ${
                      passo.concluido ? 'opacity-75 hover:opacity-100' : ''
                    }`}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full"
                      style={
                        passo.concluido
                          ? { background: 'var(--brick)', color: 'var(--brick-ink)' }
                          : { background: 'var(--bg-2)', color: 'var(--ink)' }
                      }
                    >
                      <PartnerIcon
                        name={passo.concluido ? 'check' : passo.icone}
                        size={19}
                        strokeWidth={passo.concluido ? 2.6 : 1.9}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-3">{String(index + 1).padStart(2, '0')}</span>
                        <span className="text-[15px] font-semibold leading-tight text-ink">{passo.titulo}</span>
                        {passo.concluido && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                            style={{ background: 'var(--ok-lt)', color: 'var(--ok)' }}
                          >
                            Feito
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block text-[13.5px] leading-relaxed text-ink-3">{passo.descricao}</span>
                    </span>
                    <PartnerIcon
                      name="chevron-right"
                      size={17}
                      strokeWidth={2.2}
                      className="mt-0.5 shrink-0 text-ink-3 transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </SecaoFolha>
        </div>
      </Folha>
    </>
  )
}
