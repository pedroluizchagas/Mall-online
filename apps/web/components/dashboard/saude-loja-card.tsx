import Link from 'next/link'
import type { AvisoSaude, SeveridadeAviso } from '@/lib/actions/home'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

/**
 * "Saúde da loja" — checklist permanente do Início. Mantém a memória do
 * SetupWizard após a configuração completa e agrega avisos operacionais
 * acionáveis (foto faltando, estoque baixo, avaliação em queda, loja pausada,
 * vitrine sem estilo). O que pede ação vem primeiro e leva o atalho.
 */

const ESTILO_SEVERIDADE: Record<SeveridadeAviso, { icone: PartnerIconName; cor: string; fundo: string }> = {
  ok: { icone: 'check-circle', cor: 'var(--ok)', fundo: 'var(--ok-lt)' },
  info: { icone: 'info', cor: 'var(--sky)', fundo: 'var(--sky-lt)' },
  aviso: { icone: 'info', cor: 'var(--warn)', fundo: 'var(--warn-lt)' },
  erro: { icone: 'close-circle', cor: 'var(--err)', fundo: 'var(--err-lt)' },
}

const PESO: Record<SeveridadeAviso, number> = { erro: 0, aviso: 1, info: 2, ok: 3 }

export function SaudeLojaCard({ avisos }: { avisos: AvisoSaude[] }) {
  if (avisos.length === 0) return null

  const ordenados = [...avisos].sort((a, b) => PESO[a.severidade] - PESO[b.severidade])
  const pendencias = avisos.filter((a) => a.severidade !== 'ok').length

  return (
    <div className="cartao p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ background: pendencias === 0 ? 'var(--ok)' : 'var(--warn)' }}
        />
        {pendencias === 0
          ? 'Tudo certo por aqui.'
          : `${pendencias} ${pendencias === 1 ? 'ponto pede' : 'pontos pedem'} sua atenção.`}
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {ordenados.map((aviso) => {
          const meta = ESTILO_SEVERIDADE[aviso.severidade]
          const conteudo = (
            <>
              <PartnerIcon name={meta.icone} size={15} strokeWidth={2.1} color={meta.cor} className="shrink-0" />
              <span className="text-[12.5px] font-semibold text-ink-2">{aviso.titulo}</span>
              {aviso.cta && (
                <span className="inline-flex items-center gap-0.5 text-[12px] font-bold" style={{ color: meta.cor }}>
                  {aviso.cta.label}
                  <PartnerIcon name="chevron-right" size={13} strokeWidth={2.4} />
                </span>
              )}
            </>
          )

          const classe = 'inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 transition-[filter] duration-200'

          return (
            <li key={aviso.id}>
              {aviso.cta ? (
                <Link
                  href={aviso.cta.href}
                  className={`${classe} hover:brightness-[0.97]`}
                  style={{ background: meta.fundo }}
                >
                  {conteudo}
                </Link>
              ) : (
                <span className={classe} style={{ background: meta.fundo }}>
                  {conteudo}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
