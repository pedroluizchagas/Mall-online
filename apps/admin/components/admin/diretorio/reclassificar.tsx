'use client'

import { useId, useState, useTransition } from 'react'
import { CATEGORIA_SLUG_TO_TEMPLATE, TEMPLATES, type TemplateCodigo } from '@mallevo/lib'
import { reclassificarLoja } from '@/lib/actions/reclassificar'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { Botao, Dialogo } from '../dialogo'

type CategoriaOpcao = { id: string; slug: string | null; nome: string }

const MINIMO = 10
const MAXIMO = 500

const CLASSE_CAMPO =
  'w-full rounded-[14px] bg-bg text-[14.5px] text-ink outline-none focus-visible:outline-none ring-1 ring-inset ring-line-2 transition-shadow placeholder:text-ink-4 focus:ring-2 focus:ring-ink'

/**
 * Levar uma loja de "Outros" para o nicho certo. A troca é de super-admin (a
 * categoria é imutável em auto-serviço) e fica registrada com o motivo em
 * `store_categoria_changes`. O diálogo mostra o template que a loja vai
 * ganhar — é isso que muda no painel do lojista.
 */
export function Reclassificar({
  storeId,
  storeNome,
  categorias,
}: {
  storeId: string
  storeNome: string
  categorias: CategoriaOpcao[]
}) {
  const [aberto, setAberto] = useState(false)
  const [categoriaId, setCategoriaId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const idCategoria = useId()
  const idMotivo = useId()

  const categoria = categorias.find((c) => c.id === categoriaId)
  const codigo = categoria?.slug
    ? (CATEGORIA_SLUG_TO_TEMPLATE as Record<string, TemplateCodigo>)[categoria.slug] ?? 'generic'
    : null

  function fechar() {
    if (pendente) return
    setAberto(false)
    setErro(null)
    setCategoriaId('')
    setMotivo('')
  }

  function enviar() {
    setErro(null)
    if (!categoriaId) return setErro('Escolha o nicho da loja.')
    if (motivo.trim().length < MINIMO) return setErro(`Conte o motivo em pelo menos ${MINIMO} caracteres.`)

    const fd = new FormData()
    fd.set('store_id', storeId)
    fd.set('categoria_nova_id', categoriaId)
    fd.set('motivo', motivo.trim())

    iniciar(async () => {
      const res = await reclassificarLoja(fd)
      if (res?.erro) {
        setErro(res.erro)
        return
      }
      showToast({ tipo: 'sucesso', titulo: `${storeNome} foi para ${categoria?.nome ?? 'o novo nicho'}` })
      setAberto(false)
      setCategoriaId('')
      setMotivo('')
    })
  }

  return (
    <>
      <Botao tamanho="sm" variante="neutro" onClick={() => setAberto(true)}>
        <PartnerIcon name="tag" size={14} strokeWidth={2.1} />
        Reclassificar
      </Botao>

      <Dialogo
        aberto={aberto}
        aoFechar={fechar}
        sobrelinha="Reclassificar loja"
        titulo={storeNome}
        largura="max-w-lg"
        rodape={
          <>
            <Botao variante="fantasma" onClick={fechar} disabled={pendente}>
              Cancelar
            </Botao>
            <Botao variante="acao" carregando={pendente} onClick={enviar}>
              Levar para o nicho
            </Botao>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-3">
          A loja sai de “Outros” e ganha o template do nicho escolhido. A troca fica registrada com o motivo.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          <div>
            <label htmlFor={idCategoria} className="mb-2 block text-[13.5px] font-semibold text-ink-2">
              Nicho
            </label>
            <div className="relative">
              <select
                id={idCategoria}
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value)
                  setErro(null)
                }}
                className={`${CLASSE_CAMPO} h-11 appearance-none pl-4 pr-10`}
              >
                <option value="">Escolha o nicho…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <PartnerIcon
                name="chevron-down"
                size={16}
                strokeWidth={2.2}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3"
              />
            </div>
            {codigo && (
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <PartnerIcon name="store" size={13} strokeWidth={2} />
                Template no painel: <span className="font-semibold text-ink">{TEMPLATES[codigo].nome}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor={idMotivo} className="mb-2 block text-[13.5px] font-semibold text-ink-2">
              Motivo
            </label>
            <textarea
              id={idMotivo}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                setErro(null)
              }}
              rows={3}
              maxLength={MAXIMO}
              placeholder="Ex.: falei com o lojista, é um pet shop com banho e tosa"
              className={`${CLASSE_CAMPO} resize-none px-4 py-3 leading-relaxed`}
            />
            <p className="mt-1.5 flex justify-between text-[12px] text-ink-3 tabular-nums">
              <span>Mínimo de {MINIMO} caracteres.</span>
              <span>
                {motivo.length}/{MAXIMO}
              </span>
            </p>
          </div>

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
        </div>
      </Dialogo>
    </>
  )
}
