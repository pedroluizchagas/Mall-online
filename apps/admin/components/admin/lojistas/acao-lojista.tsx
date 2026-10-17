'use client'

import { useState, useTransition } from 'react'
import { atualizarStatusTenant } from '@/lib/actions/admin'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { Botao, Dialogo } from '../dialogo'

/** Suspender ou reativar um lojista — sempre com confirmação e com resposta. */
export function AcaoLojista({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [pendente, iniciar] = useTransition()

  function confirmar() {
    iniciar(async () => {
      const resultado = await atualizarStatusTenant(id, !ativo)
      if ('erro' in resultado) {
        showToast({ tipo: 'erro', titulo: 'Não deu para atualizar o lojista', descricao: resultado.erro })
        return
      }
      setAberto(false)
      showToast({ tipo: 'sucesso', titulo: ativo ? `${nome} foi suspenso` : `${nome} foi reativado` })
    })
  }

  return (
    <>
      <Botao tamanho="sm" variante={ativo ? 'neutro' : 'acao'} onClick={() => setAberto(true)}>
        <PartnerIcon name={ativo ? 'pause' : 'play'} size={14} strokeWidth={2.2} />
        {ativo ? 'Suspender' : 'Reativar'}
      </Botao>
      <Dialogo
        aberto={aberto}
        aoFechar={() => !pendente && setAberto(false)}
        sobrelinha="Lojista"
        titulo={ativo ? `Suspender ${nome}?` : `Reativar ${nome}?`}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Botao>
            <Botao variante={ativo ? 'perigo' : 'acao'} carregando={pendente} onClick={confirmar}>
              {ativo ? 'Suspender lojista' : 'Reativar lojista'}
            </Botao>
          </>
        }
      >
        <p className="text-[14.5px] leading-relaxed text-ink-3">
          {ativo
            ? 'A conta fica marcada como suspensa aqui na administração e sai da contagem de lojistas ativos.'
            : 'A conta volta a contar entre os lojistas ativos da plataforma.'}
        </p>
      </Dialogo>
    </>
  )
}
