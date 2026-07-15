'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Comando } from './comandos'

/**
 * Atalhos de teclado globais (dashboard-redesign Fase 5 §2). Sequência estilo
 * Linear/GitHub: tecla `g` seguida de uma letra navega. `?` abre a folha de
 * ajuda. Respeita os módulos do nicho (só navega para destinos que existem em
 * `comandos`) e ignora quando o foco está num campo de texto ou num diálogo
 * (ex.: command palette aberto).
 *
 * Mapa letra → id de comando. O href real vem de `comandos`, garantindo que
 * um atalho para um módulo desativado simplesmente não faça nada.
 */
const MAPA: Record<string, string> = {
  i: 'inicio',
  p: 'pedidos',
  c: 'produtos',
  e: 'estoque',
  f: 'financeiro',
  r: 'relatorios',
  m: 'mensagens',
  a: 'avaliacoes',
  l: 'vitrine',
  s: 'configuracoes',
}

/** Rótulos exibidos na folha de ajuda (só os que existem para o nicho). */
const ROTULOS: Record<string, string> = {
  i: 'Início',
  p: 'Pedidos',
  c: 'Catálogo',
  e: 'Estoque',
  f: 'Financeiro',
  r: 'Relatórios',
  m: 'Mensagens',
  a: 'Avaliações',
  l: 'Vitrine da loja',
  s: 'Configurações',
}

function digitandoEm(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  )
}

export function AtalhosTeclado({ comandos }: { comandos: Comando[] }) {
  const router = useRouter()
  const [ajudaAberta, setAjudaAberta] = useState(false)

  useEffect(() => {
    const hrefPorId = new Map(comandos.map((c) => [c.id, c.href]))
    // Só oferecemos atalhos cujo destino existe para este nicho.
    const disponiveis = Object.entries(MAPA).filter(([, id]) => hrefPorId.has(id))
    const mapaDisponivel = new Map(disponiveis.map(([letra, id]) => [letra, hrefPorId.get(id)!]))

    let prefixoG = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function limparPrefixo() {
      prefixoG = false
      if (timer) clearTimeout(timer)
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (digitandoEm(e.target)) return

      // `?` (Shift + /) → folha de ajuda.
      if (e.key === '?') {
        e.preventDefault()
        setAjudaAberta((a) => !a)
        return
      }

      if (e.key === 'Escape') {
        setAjudaAberta(false)
        limparPrefixo()
        return
      }

      // Inicia a sequência com `g`.
      if (!prefixoG && e.key.toLowerCase() === 'g') {
        prefixoG = true
        timer = setTimeout(limparPrefixo, 1200)
        return
      }

      // Segunda tecla da sequência.
      if (prefixoG) {
        const destino = mapaDisponivel.get(e.key.toLowerCase())
        limparPrefixo()
        if (destino) {
          e.preventDefault()
          router.push(destino)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer) clearTimeout(timer)
    }
  }, [comandos, router])

  if (!ajudaAberta) return null

  const hrefPorId = new Set(comandos.map((c) => c.id))
  const linhas = Object.entries(MAPA).filter(([, id]) => hrefPorId.has(id))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,13,0.5)' }}
      onMouseDown={() => setAjudaAberta(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atalhos de teclado"
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl slide-up"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="text-sm font-bold m-0" style={{ color: 'var(--ink)' }}>
            Atalhos de teclado
          </h2>
        </div>
        <div className="p-3">
          <Linha atalho="⌘ / Ctrl + K" descricao="Buscar (command palette)" />
          {linhas.map(([letra]) => (
            <Linha key={letra} atalho={`g  ${letra}`} descricao={ROTULOS[letra]} />
          ))}
          <Linha atalho="?" descricao="Mostrar esta ajuda" />
        </div>
      </div>
    </div>
  )
}

function Linha({ atalho, descricao }: { atalho: string; descricao: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
        {descricao}
      </span>
      <kbd
        className="text-[11px] font-mono px-2 py-0.5 rounded"
        style={{ background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
      >
        {atalho}
      </kbd>
    </div>
  )
}
