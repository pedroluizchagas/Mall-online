import type { CSSProperties, ReactNode } from 'react'
import { VITRINES, type MoldeBarra, type VitrineCodigo } from '@mallevo/lib'

/**
 * Shell do app Mallevo em volta da vitrine — a moldura "App Mallevo" do
 * preview de Minha Loja (`/preview?app=1`).
 *
 * As vitrines web são portes 1:1 das do consumer; o que muda entre "a loja
 * no navegador do celular" e "a loja dentro do app" é o CHROME do app, que os
 * portes deliberadamente deixaram de fora (ver o cabeçalho de cada
 * `VitrineX.tsx`): a status bar do sistema, o botão de voltar (a loja é uma
 * tela empilhada sobre o shopping) e a barra de menu inferior
 * Início/Explorar/Pedidos/Perfil, que toda loja mostra sem exceção de
 * arquétipo. Este componente devolve esses três, e só eles — nada é
 * redesenhado da vitrine.
 *
 * A barra segue o molde da tabela `VITRINES` da lib (a mesma que o app lê):
 * `fixa` = colada na base com fio (`BarraMenuPadrao` e irmãs); `pilula` =
 * flutuante, com as cores de DNA de cada vitrine (`BarraMenuForno`,
 * `BarraMenuSmash`, `BarraMenuRitual`). Medidas de um iPhone com notch
 * (status bar 47px, home indicator 34px), que é a moldura do preview.
 *
 * O chrome de topo de cada vitrine (botão da casa, sacola, header) desce a
 * altura da status bar, como o `insets.top` faz no app. O shell publica isso
 * como `--inset-top` no wrapper e as vitrines leem a var em
 * `top-[var(--inset-top,0px)]` e nas âncoras
 * (`scroll-mt-[calc(var(--inset-top,0px)+Xpx)]`) — antes era uma regra CSS
 * global casada com a classe literal do Tailwind, que deslocava o chrome mas não
 * as âncoras, e o salto de seção parava DEBAIXO dele (A-15). Fora da moldura
 * a var não existe e o fallback `0px` vale.
 *
 * O voltar do shell só entra no layout padrão: as vitrines já têm o botão da
 * casa no canto esquerdo (no app é o chevron; no web, leva ao topo).
 *
 * Inerte de propósito: os itens do menu e o voltar levam ao shopping, que não
 * existe no storefront — em preview, tocar neles não faz nada.
 */

/** Altura útil da barra de menu (sem o inset), igual à do consumer. */
const ALTURA_BARRA = 58
const STATUS_BAR = 47
const HOME_INDICATOR = 34

const ITENS = [
  { rotulo: 'Início', icone: 'home', ativo: true },
  { rotulo: 'Explorar', icone: 'reels' },
  { rotulo: 'Pedidos', icone: 'orders' },
  { rotulo: 'Perfil', icone: 'user' },
] as const

type Icone = (typeof ITENS)[number]['icone']

/** Cores da barra: `fixa` lê a pele; `pilula` é DNA da vitrine. */
interface CoresBarra {
  fundo: string
  fio: string
  ativo: string
  inativo: string
  /** Só o Forno espaça as letras do rótulo. */
  espacamento?: number
}

const PILULAS: Partial<Record<VitrineCodigo, CoresBarra>> = {
  // LojaForno: preto de forno, ouro no ativo, creme fixo apagado no inativo.
  forno: {
    fundo: '#1A150F',
    fio: 'rgba(246, 239, 222, 0.14)',
    ativo: '#F2A31B',
    inativo: 'rgba(246, 239, 222, 0.62)',
    espacamento: 0.6,
  },
  // LojaSmash: canvas da pele com fio, accent no ativo.
  smash: {
    fundo: 'var(--bg)',
    fio: 'var(--line)',
    ativo: 'var(--accent)',
    inativo: 'var(--ink-muted)',
  },
  // LojaRitual: creme fixo, rosa do menu (cheio no ativo, 55% no inativo).
  ritual: {
    fundo: '#FBF3DC',
    fio: 'color-mix(in srgb, var(--accent-ink) 12%, transparent)',
    ativo: '#B93A72',
    inativo: 'rgba(185, 58, 114, 0.55)',
  },
}

function coresDaBarra(molde: MoldeBarra, vitrine: VitrineCodigo | null, temTema: boolean): CoresBarra {
  if (molde === 'pilula') {
    return (vitrine && PILULAS[vitrine]) ?? PILULAS.smash!
  }
  // BarraMenuPadrao: accent só quando a loja veste uma pele; sem pele, o ativo é a tinta.
  return {
    fundo: 'var(--surface)',
    fio: 'var(--line)',
    ativo: temTema ? 'var(--accent)' : 'var(--ink)',
    inativo: 'var(--ink-muted)',
  }
}

export function ShellApp({
  vitrine,
  temTema,
  children,
}: {
  /** Vitrine que a loja veste (decide o molde da barra); `null` = layout padrão. */
  vitrine: VitrineCodigo | null
  /** A loja tem preset explícito (pele resolvida no `:root`). */
  temTema: boolean
  children: ReactNode
}) {
  const molde: MoldeBarra = vitrine ? VITRINES[vitrine].barra : 'fixa'
  const cores = coresDaBarra(molde, vitrine, temTema)
  // Quanto a barra cobre no pé da tela — o conteúdo rola até ficar todo visível.
  const ocupacao =
    molde === 'pilula' ? HOME_INDICATOR + ALTURA_BARRA + 12 : 10 + 21 + 4 + 12 + HOME_INDICATOR

  return (
    <div data-shell-app className="relative" style={{ '--inset-top': `${STATUS_BAR}px` } as CSSProperties}>
      <StatusBar />
      {vitrine === null && <BotaoVoltar />}

      <div style={{ paddingBottom: ocupacao }}>{children}</div>

      <nav
        aria-label="Menu do app"
        style={molde === 'pilula' ? estiloPilula(cores) : estiloFixa(cores)}
      >
        {ITENS.map((item) => {
          const ativo = 'ativo' in item && item.ativo
          const cor = ativo ? cores.ativo : cores.inativo
          return (
            <span
              key={item.rotulo}
              aria-current={ativo ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: molde === 'pilula' ? 3 : 4,
                color: cor,
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: ativo ? 700 : 500,
                letterSpacing: cores.espacamento,
                lineHeight: 1.2,
              }}
            >
              <IconeMenu nome={item.icone} tamanho={molde === 'pilula' ? 20 : 21} grosso={ativo} />
              {item.rotulo}
            </span>
          )
        })}
      </nav>
    </div>
  )
}

function estiloFixa(cores: CoresBarra): CSSProperties {
  return {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    margin: '0 auto',
    maxWidth: 480,
    display: 'flex',
    background: cores.fundo,
    borderTop: `1px solid ${cores.fio}`,
    padding: `10px 0 ${Math.max(HOME_INDICATOR, 12)}px`,
  }
}

function estiloPilula(cores: CoresBarra): CSSProperties {
  return {
    position: 'fixed',
    left: '50%',
    bottom: Math.max(HOME_INDICATOR, 12),
    zIndex: 40,
    transform: 'translateX(-50%)',
    width: 'min(100% - 28px, 452px)',
    height: ALTURA_BARRA,
    display: 'flex',
    alignItems: 'center',
    background: cores.fundo,
    border: `1px solid ${cores.fio}`,
    borderRadius: 999,
    // consumerDesign.shadow.floating
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
  }
}

/**
 * Status bar do sistema por cima do hero. Branca em `difference`: vira preta
 * sobre fundo claro e fica branca sobre o escuro — a mesma virada que a
 * vitrine faz no app com `<StatusBar style>`, sem precisar saber a cor.
 */
function StatusBar() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        margin: '0 auto',
        maxWidth: 480,
        height: STATUS_BAR,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 30px 8px',
        pointerEvents: 'none',
        color: '#fff',
        mixBlendMode: 'difference',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: -0.2,
      }}
    >
      <span>9:41</span>
      <svg width="66" height="12" viewBox="0 0 66 12" fill="currentColor">
        {/* sinal */}
        <rect x="0" y="8" width="3" height="4" rx="0.8" />
        <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8" />
        <rect x="9" y="3" width="3" height="9" rx="0.8" />
        <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" />
        {/* wi-fi */}
        <path d="M23 4.2a9 9 0 0 1 12 0l-1.5 1.6a6.8 6.8 0 0 0-9 0zM25.7 7a5.2 5.2 0 0 1 6.6 0l-1.5 1.6a3 3 0 0 0-3.6 0zM29 10.2l1.6 1.6-1.6 1.6-1.6-1.6z" />
        {/* bateria */}
        <rect x="41" y="0.75" width="22" height="10.5" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
        <rect x="42.5" y="2.25" width="19" height="7.5" rx="1.8" />
        <path d="M64.2 4.3v3.4a1.8 1.8 0 0 0 0-3.4z" fillOpacity="0.5" />
      </svg>
    </div>
  )
}

/** `BotaoCircular` do consumer: círculo na surface com sombra suave e o chevron na tinta. */
function BotaoVoltar() {
  return (
    <span
      aria-hidden
      style={{
        position: 'fixed',
        top: STATUS_BAR + 6,
        left: 'max(16px, calc(50% - 240px + 16px))',
        zIndex: 45,
        width: 40,
        height: 40,
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        color: 'var(--ink)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.75 5.5L8.25 12l6.5 6.5" />
      </svg>
    </span>
  )
}

/** Os quatro ícones de linha da `ConsumerIcon` do consumer (mesmos paths). */
function IconeMenu({ nome, tamanho, grosso }: { nome: Icone; tamanho: number; grosso: boolean }) {
  const comum = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: grosso ? 2.1 : 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" {...comum}>
      {nome === 'home' && <path d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 0 1-1 1h-4.5v-5.5h-6V20.5H4.5a1 1 0 0 1-1-1v-9z" />}
      {nome === 'reels' && (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3 9.5h18M7.5 5.5L9.5 9.5M12 5.5L14 9.5M16.5 5.5L18.5 9.5" />
        </>
      )}
      {nome === 'orders' && (
        <>
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 3.5h6v3H9zM9 11h6M9 15h6M9 19h4" />
        </>
      )}
      {nome === 'user' && (
        <>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </>
      )}
    </svg>
  )
}
