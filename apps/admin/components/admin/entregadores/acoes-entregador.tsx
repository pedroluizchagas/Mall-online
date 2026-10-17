'use client'

import { useState, useTransition } from 'react'
import { atualizarStatusEntregador } from '@/lib/actions/admin'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { Botao, Dialogo } from '../dialogo'

type Destino = 'aprovado' | 'reprovado' | 'suspenso'

const DECISOES: Record<
  Destino,
  { verbo: string; icone: PartnerIconName; variante: 'acao' | 'perigo'; texto: string; feito: string }
> = {
  aprovado: {
    verbo: 'Aprovar',
    icone: 'check',
    variante: 'acao',
    texto: 'Ele passa a poder ficar online no app e receber entregas.',
    feito: 'aprovado',
  },
  reprovado: {
    verbo: 'Reprovar',
    icone: 'close',
    variante: 'perigo',
    texto: 'O cadastro fica reprovado e ele não recebe entregas. Dá para reativar depois.',
    feito: 'reprovado',
  },
  suspenso: {
    verbo: 'Suspender',
    icone: 'pause',
    variante: 'perigo',
    texto: 'Ele deixa de receber entregas até ser reativado.',
    feito: 'suspenso',
  },
}

/**
 * As decisões sobre um entregador, conforme o status atual: pendente →
 * aprovar ou reprovar; aprovado → suspender; reprovado/suspenso → reativar.
 * Toda decisão passa por confirmação e responde com um toast.
 */
export function AcoesEntregador({ id, nome, status }: { id: string; nome: string; status: string }) {
  const [destino, setDestino] = useState<Destino | null>(null)
  const [pendente, iniciar] = useTransition()
  const reativar = status === 'reprovado' || status === 'suspenso'

  function confirmar() {
    if (!destino) return
    iniciar(async () => {
      const resultado = await atualizarStatusEntregador(id, destino)
      if ('erro' in resultado) {
        showToast({ tipo: 'erro', titulo: 'Não deu para atualizar o entregador', descricao: resultado.erro })
        return
      }
      showToast({
        tipo: 'sucesso',
        titulo: `${nome} foi ${reativar && destino === 'aprovado' ? 'reativado' : DECISOES[destino].feito}`,
      })
      setDestino(null)
    })
  }

  const def = destino ? DECISOES[destino] : null
  const verboConfirmar = def ? (reativar && destino === 'aprovado' ? 'Reativar' : def.verbo) : ''

  return (
    <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
      {status === 'pendente' && (
        <>
          <Botao tamanho="sm" variante="neutro" onClick={() => setDestino('reprovado')}>
            Reprovar
          </Botao>
          <Botao tamanho="sm" variante="acao" onClick={() => setDestino('aprovado')}>
            <PartnerIcon name="check" size={14} strokeWidth={2.4} />
            Aprovar
          </Botao>
        </>
      )}
      {status === 'aprovado' && (
        <Botao tamanho="sm" variante="neutro" onClick={() => setDestino('suspenso')}>
          <PartnerIcon name="pause" size={14} strokeWidth={2.2} />
          Suspender
        </Botao>
      )}
      {reativar && (
        <Botao tamanho="sm" variante="neutro" onClick={() => setDestino('aprovado')}>
          <PartnerIcon name="play" size={14} strokeWidth={2.2} />
          Reativar
        </Botao>
      )}

      <Dialogo
        aberto={destino !== null}
        aoFechar={() => !pendente && setDestino(null)}
        sobrelinha="Entregador"
        titulo={`${verboConfirmar} ${nome}?`}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setDestino(null)} disabled={pendente}>
              Cancelar
            </Botao>
            <Botao variante={def?.variante ?? 'acao'} carregando={pendente} onClick={confirmar}>
              {verboConfirmar} entregador
            </Botao>
          </>
        }
      >
        <p className="text-[14.5px] leading-relaxed text-ink-3">
          {destino === 'aprovado' && reativar ? 'Ele volta a poder ficar online e receber entregas.' : def?.texto}
        </p>
      </Dialogo>
    </div>
  )
}
