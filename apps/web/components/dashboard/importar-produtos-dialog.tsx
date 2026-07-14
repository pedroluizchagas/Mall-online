'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Upload, X } from 'lucide-react'
import {
  importarProdutosCsv,
  type LinhaImportacaoProduto,
} from '@/lib/actions/produtos'
import { showToast } from '@/components/ui/toast'
import { baixarCsv } from '@/lib/baixar-csv'
import { gerarCsv, parseCsv, precoParaCentavos } from '@/lib/csv'

/**
 * Importação de produtos via CSV (dashboard-redesign Fase 3 §2).
 *
 * Fluxo: escolher arquivo → parse/validação no CLIENT (erros com nº da
 * linha) → preview do que será importado → server action (revalida limite
 * do plano e cria categorias faltantes).
 *
 * Colunas: nome, descricao, preco, preco_promocional, categoria, disponivel.
 * Preço em reais ("12.90" ou "12,90"); disponivel = sim/nao (default sim).
 */

const COLUNAS_MODELO = [
  'nome',
  'descricao',
  'preco',
  'preco_promocional',
  'categoria',
  'disponivel',
]

const LINHAS_MODELO = [
  ['Pão de queijo (6 un)', 'Assado na hora, receita mineira', '12.90', '', 'Padaria', 'sim'],
  ['Café coado 300ml', 'Grãos da Mantiqueira', '8.00', '6.50', 'Bebidas', 'sim'],
]

type ErroLinha = { linha: number; motivo: string }

type Preview = {
  nomeArquivo: string
  validas: LinhaImportacaoProduto[]
  erros: ErroLinha[]
}

/** Normaliza cabeçalho: minúsculas, sem acentos/espaços. */
function normalizarCabecalho(s: string): string {
  return s
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function parseDisponivel(s: string | undefined): boolean {
  const v = (s ?? '').trim().toLowerCase()
  if (['nao', 'não', 'false', '0', 'n'].includes(v)) return false
  return true
}

/** Converte o texto do arquivo em linhas validadas + erros por linha. */
function analisarArquivo(texto: string, nomeArquivo: string): Preview | { erro: string } {
  const linhas = parseCsv(texto)
  if (linhas.length < 2) {
    return { erro: 'Arquivo vazio ou sem linhas de produto (só o cabeçalho?).' }
  }

  const cab = linhas[0].map(normalizarCabecalho)
  const col = (nome: string) => cab.indexOf(nome)
  if (col('nome') === -1 || col('preco') === -1) {
    return {
      erro: 'Cabeçalho inválido: as colunas "nome" e "preco" são obrigatórias. Baixe o modelo para ver o formato.',
    }
  }

  const validas: LinhaImportacaoProduto[] = []
  const erros: ErroLinha[] = []

  linhas.slice(1).forEach((l, i) => {
    const numeroLinha = i + 2 // 1-based + cabeçalho
    const nome = (l[col('nome')] ?? '').trim()
    if (nome.length < 2) {
      erros.push({ linha: numeroLinha, motivo: 'nome ausente ou muito curto' })
      return
    }

    const preco = precoParaCentavos(l[col('preco')] ?? '')
    if (preco === null) {
      erros.push({ linha: numeroLinha, motivo: `preço inválido ("${l[col('preco')] ?? ''}")` })
      return
    }

    const promoBruto = col('preco_promocional') >= 0 ? (l[col('preco_promocional')] ?? '').trim() : ''
    let preco_promocional: number | null = null
    if (promoBruto) {
      preco_promocional = precoParaCentavos(promoBruto)
      if (preco_promocional === null) {
        erros.push({ linha: numeroLinha, motivo: `preço promocional inválido ("${promoBruto}")` })
        return
      }
      if (preco_promocional >= preco) {
        erros.push({ linha: numeroLinha, motivo: 'preço promocional deve ser menor que o preço' })
        return
      }
    }

    validas.push({
      nome,
      descricao: col('descricao') >= 0 ? (l[col('descricao')] ?? '').trim() || null : null,
      preco,
      preco_promocional,
      categoria: col('categoria') >= 0 ? (l[col('categoria')] ?? '').trim() || null : null,
      disponivel: parseDisponivel(col('disponivel') >= 0 ? l[col('disponivel')] : undefined),
    })
  })

  return { nomeArquivo, validas, erros }
}

export function ImportarProdutosDialog({ storeId }: { storeId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function fechar() {
    if (pending) return
    setAberto(false)
    setPreview(null)
    setErroArquivo(null)
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErroArquivo(null)
    const resultado = analisarArquivo(await arquivo.text(), arquivo.name)
    if ('erro' in resultado) {
      setPreview(null)
      setErroArquivo(resultado.erro)
      return
    }
    setPreview(resultado)
  }

  function importar() {
    if (!preview || preview.validas.length === 0) return
    startTransition(() => {
      void (async () => {
        const r = await importarProdutosCsv(storeId, preview.validas)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Falha na importação', descricao: r.erro })
          return
        }
        showToast({
          tipo: 'sucesso',
          titulo: `${r.criados} produto${r.criados === 1 ? '' : 's'} importado${r.criados === 1 ? '' : 's'}`,
        })
        setAberto(false)
        setPreview(null)
        router.refresh()
      })()
    })
  }

  function baixarModelo() {
    baixarCsv(gerarCsv(COLUNAS_MODELO, LINHAS_MODELO), 'modelo-catalogo.csv')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" /> Importar CSV
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="importar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,13,0.45)' }}
          onClick={fechar}
        >
          <div
            className="rounded-2xl shadow-xl max-w-lg w-full p-5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="importar-titulo" className="font-semibold text-ink text-base">
                Importar produtos por CSV
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={fechar}
                className="p-1 rounded-full hover:bg-bg-2 transition-colors"
              >
                <X className="w-4 h-4 text-ink-3" />
              </button>
            </div>

            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Colunas: <code>nome</code> e <code>preco</code> (obrigatórias),{' '}
              <code>descricao</code>, <code>preco_promocional</code>, <code>categoria</code>{' '}
              (criada se não existir) e <code>disponivel</code> (sim/nao). Preço em reais —
              &quot;12.90&quot; ou &quot;12,90&quot;.{' '}
              <button
                type="button"
                onClick={baixarModelo}
                className="underline font-semibold"
                style={{ color: 'var(--brick-dk)' }}
              >
                Baixar modelo
              </button>
            </p>

            {/* Escolha do arquivo */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 w-full rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center gap-2 hover:bg-bg-2 transition-colors"
              style={{ borderColor: 'var(--line-2)' }}
            >
              <FileUp className="w-5 h-5 text-ink-3" />
              <span className="text-xs font-semibold text-ink-2">
                {preview ? preview.nomeArquivo : 'Escolher arquivo .csv'}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleArquivo}
            />

            {erroArquivo && (
              <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--danger, #C0392B)' }}>
                {erroArquivo}
              </p>
            )}

            {/* Preview */}
            {preview && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-ink">
                  <strong>{preview.validas.length}</strong> produto
                  {preview.validas.length === 1 ? '' : 's'} pronto
                  {preview.validas.length === 1 ? '' : 's'} para importar
                  {preview.erros.length > 0 && (
                    <span className="text-ink-3">
                      {' '}
                      · {preview.erros.length} linha{preview.erros.length === 1 ? '' : 's'} com erro
                      (ignorada{preview.erros.length === 1 ? '' : 's'})
                    </span>
                  )}
                </p>
                {preview.erros.length > 0 && (
                  <ul
                    className="text-[11px] rounded-xl p-3 space-y-1 max-h-28 overflow-y-auto"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
                  >
                    {preview.erros.slice(0, 8).map((e) => (
                      <li key={e.linha}>
                        Linha {e.linha}: {e.motivo}
                      </li>
                    ))}
                    {preview.erros.length > 8 && (
                      <li>… e mais {preview.erros.length - 8}</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={fechar}
                disabled={pending}
                className="px-4 py-2 rounded-full text-xs font-semibold hover:bg-bg-2 transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={importar}
                disabled={pending || !preview || preview.validas.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-opacity disabled:opacity-50"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                <Upload className="w-3.5 h-3.5" />
                {pending
                  ? 'Importando…'
                  : `Importar${preview ? ` ${preview.validas.length}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
