/**
 * Ícones da casa — porte 1:1 de apps/mobile-partner/components/PartnerIcon.tsx
 * para SVG web (o mesmo da landing de parceiros). O painel fala com os
 * traços do app do lojista; Lucide só sobrevive nos módulos ainda não
 * redesenhados.
 *
 * Convenções (as do app):
 * - viewBox 0 0 24 24
 * - stroke-only (fill="none")
 * - strokeLinecap/Linejoin: 'round'
 * - strokeWidth default 1.9
 *
 * Acréscimos do painel, no mesmo traço: `sun` e `moon` (tema), `download`
 * e `upload` (planilhas), `arrow-right`, `mail` e `lock` (entrar) e os
 * dos módulos (`pause`, `user-plus/minus`, `copy`, `undo`, `link`,
 * `archive`, `megaphone`, `flag`, `monitor`, `smartphone`, `alert`,
 * `inbox`, `image-plus`).
 */
export type PartnerIconName =
  // Navegação (tabs)
  | 'home'
  | 'orders'
  | 'plus'
  | 'gallery'
  | 'menu'
  // Gestão (menu e módulos)
  | 'store'
  | 'chart'
  | 'wallet'
  | 'star'
  | 'chat'
  | 'calendar'
  | 'bike'
  | 'gear'
  | 'help'
  | 'box'
  | 'user'
  | 'users'
  | 'camera'
  // Comuns (espelho do consumer/courier)
  | 'back'
  | 'search'
  | 'pin'
  | 'clock'
  | 'package'
  | 'phone'
  | 'check'
  | 'check-double'
  | 'check-circle'
  | 'close'
  | 'close-circle'
  | 'logout'
  | 'shield'
  | 'spark'
  | 'eye'
  | 'eye-off'
  | 'cash'
  | 'trend'
  | 'power'
  | 'route'
  | 'bell'
  | 'truck'
  | 'tag'
  | 'heart'
  | 'comment'
  | 'send'
  | 'play'
  | 'volume'
  | 'volume-off'
  | 'edit'
  | 'trash'
  | 'file'
  | 'info'
  | 'bag'
  | 'chef'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-up'
  | 'minus'
  | 'external'
  // Do consumidor
  | 'reels'
  /** A aba Pedidos do app do consumidor (prancheta; a do lojista é recibo). */
  | 'orders-cliente'
  | 'utensils'
  | 'hanger'
  | 'pulse'
  | 'scissors'
  | 'paw'
  | 'armchair'
  | 'basket'
  | 'wrench'
  | 'gift'
  // Do painel
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'arrow-right'
  | 'mail'
  | 'lock'
  | 'pause'
  | 'user-plus'
  | 'user-minus'
  | 'copy'
  | 'undo'
  | 'link'
  | 'archive'
  | 'archive-restore'
  | 'megaphone'
  | 'flag'
  | 'flag-off'
  | 'monitor'
  | 'smartphone'
  | 'alert'
  | 'inbox'
  | 'image-plus'

interface Props {
  name: PartnerIconName
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
  /** Preenchimento (ex.: estrela de nota cheia). O padrão é só traço. */
  fill?: string
}

export function PartnerIcon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.9,
  className,
  style,
  fill = 'none',
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      {renderIcon(name, color, strokeWidth)}
    </svg>
  )
}

function renderIcon(name: PartnerIconName, color: string, strokeWidth: number) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    // ─────────────────────────────────────────────────────────
    // Navegação (tabs)
    // ─────────────────────────────────────────────────────────
    case 'home':
      return (
        <path
          {...common}
          d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 0 1-1 1h-4.5v-5.5h-6V20.5H4.5a1 1 0 0 1-1-1v-9z"
        />
      )
    case 'orders':
      return (
        <>
          <path
            {...common}
            d="M6 3.5h12v17l-2.4-1.6L13.2 20.5 12 19.4l-1.2 1.1-2.4-1.6L6 20.5v-17z"
          />
          <path {...common} d="M9 8h6M9 11.5h6M9 15h4" />
        </>
      )
    case 'plus':
      return <path {...common} d="M12 5v14M5 12h14" />
    case 'gallery':
      return (
        <>
          <rect {...common} x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect {...common} x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect {...common} x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <path {...common} d="M15.5 15.2v3.6l3-1.8-3-1.8z" />
        </>
      )
    case 'menu':
      return <path {...common} d="M4 6.5h16M4 12h16M4 17.5h10" />

    // ─────────────────────────────────────────────────────────
    // Gestão
    // ─────────────────────────────────────────────────────────
    case 'store':
      return (
        <>
          <path {...common} d="M4.5 9.5L6 4.5h12l1.5 5" />
          <path
            {...common}
            d="M4.5 9.5a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0"
          />
          <path {...common} d="M5.5 12v7.5h13V12" />
          <path {...common} d="M9.5 19.5v-5h5v5" />
        </>
      )
    case 'chart':
      return (
        <>
          <path {...common} d="M4 20V4M4 20h16" />
          <path {...common} d="M8 16v-5M12.5 16V7.5M17 16v-3" />
        </>
      )
    case 'wallet':
      return (
        <>
          <rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <path {...common} d="M15 11.5h5.5v4H15a2 2 0 1 1 0-4z" />
        </>
      )
    case 'star':
      return (
        <path
          {...common}
          d="M12 3.75l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 17.03l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L12 3.75z"
        />
      )
    case 'chat':
      return (
        <>
          <path {...common} d="M4.5 5.5h15v10.5h-8l-4 3.5v-3.5h-3V5.5z" />
          <path {...common} d="M8.5 9.5h7M8.5 12.5h4.5" />
        </>
      )
    case 'calendar':
      return (
        <>
          <rect {...common} x="4" y="5.5" width="16" height="14" rx="2" />
          <path {...common} d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" />
        </>
      )
    case 'bike':
      return (
        <>
          <circle {...common} cx="5.5" cy="17" r="3.25" />
          <circle {...common} cx="18.5" cy="17" r="3.25" />
          <path
            {...common}
            d="M5.5 17l3.5-7h5l3.5 7M9 10l-1.5-3.5H5M14 10l1-3.5h2.5"
          />
        </>
      )
    case 'gear':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="3" />
          <path
            {...common}
            d="M12 3.5v2.5M12 18v2.5M20.5 12H18M6 12H3.5M18 6l-1.8 1.8M7.8 16.2L6 18M18 18l-1.8-1.8M7.8 7.8L6 6"
          />
        </>
      )
    case 'help':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.5" />
          <path {...common} d="M9.75 9.3a2.4 2.4 0 0 1 4.65.8c0 1.5-2.4 1.9-2.4 3.4" />
          <path {...common} d="M12 16.6v.1" />
        </>
      )
    case 'box':
      return (
        <>
          <path {...common} d="M4 8l8-4.5L20 8v8l-8 4.5L4 16V8z" />
          <path {...common} d="M4 8l8 4.5L20 8M12 12.5v8" />
        </>
      )
    case 'user':
      return (
        <>
          <circle {...common} cx="12" cy="8" r="3.25" />
          <path {...common} d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </>
      )
    case 'users':
      return (
        <>
          <circle {...common} cx="9.5" cy="8.5" r="3.25" />
          <path {...common} d="M3.5 19.5a6 6 0 0 1 12 0" />
          <path {...common} d="M16.25 5.9a3.25 3.25 0 0 1 0 5.2" />
          <path {...common} d="M17.75 14.4a6 6 0 0 1 2.75 5.1" />
        </>
      )
    case 'camera':
      return (
        <>
          <path
            {...common}
            d="M4.5 7.5h3l1.5-2h6l1.5 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"
          />
          <circle {...common} cx="12" cy="13" r="3.25" />
        </>
      )

    // ─────────────────────────────────────────────────────────
    // Comuns (espelho do consumer/courier)
    // ─────────────────────────────────────────────────────────
    case 'back':
      return <path {...common} d="M14.75 5.5L8.25 12l6.5 6.5" />
    case 'search':
      return (
        <>
          <circle {...common} cx="10.5" cy="10.5" r="5.75" />
          <path {...common} d="M15 15l4.5 4.5" />
        </>
      )
    case 'pin':
      return (
        <>
          <path
            {...common}
            d="M12 20.25s5.25-4.75 5.25-9a5.25 5.25 0 1 0-10.5 0c0 4.25 5.25 9 5.25 9z"
          />
          <circle {...common} cx="12" cy="11.25" r="1.9" />
        </>
      )
    case 'clock':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.25" />
          <path {...common} d="M12 7.75v4.75l3.5 2" />
        </>
      )
    case 'package':
      return (
        <>
          <path {...common} d="M12 3.75l7 3.75v9L12 20.25 5 16.5v-9l7-3.75z" />
          <path {...common} d="M12 20.25V12" />
          <path {...common} d="M5.25 7.75L12 12l6.75-4.25" />
        </>
      )
    case 'phone':
      return (
        <path
          {...common}
          d="M8.2 5.5h2.6l1.1 3.2-1.6 1.45a13 13 0 0 0 3.7 3.7l1.45-1.6 3.2 1.1v2.6a1.6 1.6 0 0 1-1.6 1.6c-6.35 0-11.5-5.15-11.5-11.5A1.6 1.6 0 0 1 8.2 5.5z"
        />
      )
    case 'check':
      return <path {...common} d="M5.5 12.5l4 4 9-9" />
    case 'check-double':
      return (
        <>
          <path {...common} d="M3 12.5l4 4 9-9" />
          <path {...common} d="M9 16.5l4 4 9-9" />
        </>
      )
    case 'check-circle':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.25" />
          <path {...common} d="M8.5 12.5l3 3 4-5" />
        </>
      )
    case 'close':
      return <path {...common} d="M5 5l14 14M19 5L5 19" />
    case 'close-circle':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.25" />
          <path {...common} d="M9 9l6 6M15 9l-6 6" />
        </>
      )
    case 'logout':
      return (
        <>
          <path
            {...common}
            d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"
          />
          <path {...common} d="M13.5 8.5l4 3.5-4 3.5" />
          <path {...common} d="M9 12h8" />
        </>
      )
    case 'shield':
      return (
        <>
          <path
            {...common}
            d="M12 3.75l6 2.25v5.25c0 4-2.55 6.75-6 9-3.45-2.25-6-5-6-9V6l6-2.25z"
          />
          <path {...common} d="M9.5 12.25l1.75 1.75 3.5-4" />
        </>
      )
    case 'spark':
      return (
        <>
          <path
            {...common}
            d="M12 3.5l1.2 4.3 4.3 1.2-4.3 1.2L12 14.5l-1.2-4.3-4.3-1.2 4.3-1.2L12 3.5z"
          />
          <path
            {...common}
            d="M18 14.5l.65 2.35L21 17.5l-2.35.65L18 20.5l-.65-2.35L15 17.5l2.35-.65L18 14.5z"
          />
        </>
      )
    case 'eye':
      return (
        <>
          <path {...common} d="M2 12s3.5-7.5 10-7.5S22 12 22 12s-3.5 7.5-10 7.5S2 12 2 12z" />
          <circle {...common} cx="12" cy="12" r="3" />
        </>
      )
    case 'eye-off':
      return (
        <>
          <path
            {...common}
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
          />
          <path {...common} d="M1 1l22 22" />
        </>
      )
    case 'cash':
      return (
        <>
          <rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <circle {...common} cx="12" cy="12" r="2.5" />
          <path {...common} d="M7 10v0M17 14v0" />
        </>
      )
    case 'trend':
      return (
        <>
          <path {...common} d="M4.5 17.5l5.5-5.5 3.5 3.5 6-7" />
          <path {...common} d="M15.5 5h4.5v4.5" />
        </>
      )
    case 'power':
      return (
        <>
          <path {...common} d="M12 3.5v7" />
          <path {...common} d="M7.25 6.75a6.5 6.5 0 1 0 9.5 0" />
        </>
      )
    case 'route':
      return (
        <>
          <circle {...common} cx="6" cy="18" r="2.25" />
          <circle {...common} cx="18" cy="6" r="2.25" />
          <path {...common} d="M8.5 17.5h3a4 4 0 0 0 4-4v-3" />
          <path {...common} d="M14.25 8H18V4.25" />
        </>
      )
    case 'bell':
      return (
        <>
          <path
            {...common}
            d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z"
          />
          <path {...common} d="M10 19.5a2 2 0 0 0 4 0" />
        </>
      )
    case 'truck':
      return (
        <>
          <rect {...common} x="2.5" y="7.5" width="11" height="9" rx="1.5" />
          <path {...common} d="M13.5 10.5h4l3 3.5v2.5h-7" />
          <circle {...common} cx="7" cy="17" r="2" />
          <circle {...common} cx="17" cy="17" r="2" />
        </>
      )
    case 'tag':
      return (
        <>
          <path {...common} d="M3.5 11.5V4.5h7L20.5 14.5l-6 6L3.5 11.5z" />
          <circle {...common} cx="8" cy="8" r="1.25" />
        </>
      )
    case 'heart':
      return (
        <path
          {...common}
          d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
        />
      )
    case 'comment':
      return (
        <path
          {...common}
          d="M20.5 12c0 4.5-3.5 7.5-8.5 7.5a10 10 0 0 1-3.5-.6L4 20.5l1.6-4.4A8 8 0 0 1 3.5 12c0-4.5 3.5-7.5 8.5-7.5s8.5 3 8.5 7.5z"
        />
      )
    case 'send':
      return (
        <>
          <path {...common} d="M21 3.5L3 11l7.5 2 2 7.5L21 3.5z" />
          <path {...common} d="M10.5 13L21 3.5" />
        </>
      )
    case 'play':
      return <path {...common} d="M7 4.5v15l13-7.5L7 4.5z" />
    case 'volume':
      return (
        <>
          <path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
          <path {...common} d="M16 8.5a5 5 0 0 1 0 7M18.5 5.5a8.5 8.5 0 0 1 0 13" />
        </>
      )
    case 'volume-off':
      return (
        <>
          <path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
          <path {...common} d="M17 9l5 5M22 9l-5 5" />
        </>
      )
    case 'edit':
      return (
        <>
          <path {...common} d="M4 20l1-4 11-11 3 3-11 11-4 1z" />
          <path {...common} d="M14 7l3 3" />
        </>
      )
    case 'trash':
      return (
        <>
          <path {...common} d="M4.5 6.5h15" />
          <path {...common} d="M9.5 6.5V4.75h5V6.5" />
          <path {...common} d="M6.5 6.5l.9 13a1 1 0 0 0 1 .95h7.2a1 1 0 0 0 1-.95l.9-13" />
          <path {...common} d="M10.5 10.5v6M13.5 10.5v6" />
        </>
      )
    case 'file':
      return (
        <>
          <path {...common} d="M6 3.5h7l5 5v12H6v-17z" />
          <path {...common} d="M13 3.5v5h5M9 12.5h6M9 16h6" />
        </>
      )
    case 'info':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.25" />
          <path {...common} d="M12 11v5M12 8v0.01" />
        </>
      )
    case 'bag':
      return (
        <>
          <path {...common} d="M5 7.5h14l-1 13H6l-1-13z" />
          <path {...common} d="M9 10V7a3 3 0 0 1 6 0v3" />
        </>
      )
    case 'chef':
      return (
        <>
          <path
            {...common}
            d="M6 11a3.5 3.5 0 1 1 1.5-6.6A4 4 0 0 1 16.5 4.4 3.5 3.5 0 1 1 18 11v3H6v-3z"
          />
          <path {...common} d="M6 14h12v5.5H6z" />
        </>
      )
    case 'chevron-down':
      return <path {...common} d="M6 9.5l6 6 6-6" />
    case 'chevron-right':
      return <path {...common} d="M9.5 6l6 6-6 6" />
    case 'chevron-left':
      return <path {...common} d="M14.5 6l-6 6 6 6" />
    case 'chevron-up':
      return <path {...common} d="M6 14.5l6-6 6 6" />
    case 'minus':
      return <path {...common} d="M5 12h14" />
    /** Abre no Dashboard (web) — seta saindo da caixa. */
    case 'external':
      return (
        <>
          <path {...common} d="M14 4.5h5.5V10" />
          <path {...common} d="M19.5 4.5L11 13" />
          <path {...common} d="M17 13.5v5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />
        </>
      )


    // ─────────────────────────────────────────────────────────
    // Do consumidor
    // ─────────────────────────────────────────────────────────
    case 'orders-cliente':
      return (
        <>
          <rect {...common} x="6" y="4" width="12" height="17" rx="2" />
          <path {...common} d="M9 3.5h6v3H9zM9 11h6M9 15h6M9 19h4" />
        </>
      )

    case 'reels':
      return (
        <>
          <rect {...common} x="3" y="5.5" width="18" height="13" rx="2" />
          <path
            {...common}
            d="M3 9.5h18M7.5 5.5L9.5 9.5M12 5.5L14 9.5M16.5 5.5L18.5 9.5"
          />
        </>
      )

    case 'utensils':
      return (
        <>
          <path
            {...common}
            d="M5.5 3.5v4.75a2.25 2.25 0 0 0 2.25 2.25h.5a2.25 2.25 0 0 0 2.25-2.25V3.5"
          />
          <path {...common} d="M8 3.5v17" />
          <path
            {...common}
            d="M18.75 14.75V3.5a4.25 4.25 0 0 0-3.5 4.25v5a2 2 0 0 0 2 2h1.5z"
          />
          <path {...common} d="M18.75 14.75v5.75" />
        </>
      )

    case 'hanger':
      return (
        <>
          <path
            {...common}
            d="M14 6.1a2 2 0 1 0-4 0c0 1.55.62 2.8 1.85 3.75"
          />
          <path
            {...common}
            d="M12 9.85L19.6 14a1.9 1.9 0 0 1 1 1.67v.33a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1v-.33A1.9 1.9 0 0 1 4.4 14L12 9.85z"
          />
        </>
      )

    case 'pulse':
      return (
        <path {...common} d="M3.25 12.5h3.4L9.5 5.5l5 13.25 2.85-6.25h3.4" />
      )

    case 'scissors':
      return (
        <>
          <circle {...common} cx="6.25" cy="6.5" r="2.6" />
          <circle {...common} cx="6.25" cy="17.5" r="2.6" />
          <path {...common} d="M19.75 4.5L8.55 15.7" />
          <path {...common} d="M14.1 14.15l5.65 5.35" />
          <path {...common} d="M8.55 8.3l3.45 3.45" />
        </>
      )

    case 'paw':
      return (
        <>
          <circle {...common} cx="6" cy="10" r="1.75" />
          <circle {...common} cx="9.9" cy="6.75" r="1.75" />
          <circle {...common} cx="14.1" cy="6.75" r="1.75" />
          <circle {...common} cx="18" cy="10" r="1.75" />
          <path
            {...common}
            d="M12 12.25c-2.85 0-5.1 2.05-5.1 4.45 0 1.5 1.15 2.8 2.6 2.8 1 0 1.65-.55 2.5-.55s1.5.55 2.5.55c1.45 0 2.6-1.3 2.6-2.8 0-2.4-2.25-4.45-5.1-4.45z"
          />
        </>
      )

    case 'armchair':
      return (
        <>
          <path {...common} d="M19 9.5V6.75a2.25 2.25 0 0 0-2.25-2.25h-9.5A2.25 2.25 0 0 0 5 6.75V9.5" />
          <path
            {...common}
            d="M3.25 15.5a2 2 0 0 0 2 2h13.5a2 2 0 0 0 2-2v-4a2 2 0 0 0-4 0v1.75h-9.5V11.5a2 2 0 0 0-4 0z"
          />
          <path {...common} d="M5.75 17.5v2.25M18.25 17.5v2.25" />
        </>
      )

    case 'basket':
      return (
        <>
          <path {...common} d="M2.75 10.5h18.5" />
          <path
            {...common}
            d="M4.25 10.5l1.5 7.65a2 2 0 0 0 1.97 1.6h8.56a2 2 0 0 0 1.97-1.6l1.5-7.65"
          />
          <path {...common} d="M5.75 10.5l3.5-6.25M18.25 10.5l-3.5-6.25" />
          <path {...common} d="M10 13.75v2.75M14 13.75v2.75" />
        </>
      )

    case 'wrench':
      return (
        <path
          {...common}
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
      )

    case 'gift':
      return (
        <>
          <rect {...common} x="3.5" y="7.75" width="17" height="4" rx="1" />
          <path {...common} d="M12 7.75v12.5" />
          <path {...common} d="M19 11.75v6.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6.5" />
          <path
            {...common}
            d="M12 7.75H7.75a2.125 2.125 0 0 1 0-4.25C10.7 3.5 12 7.75 12 7.75z"
          />
          <path
            {...common}
            d="M12 7.75h4.25a2.125 2.125 0 0 0 0-4.25C13.3 3.5 12 7.75 12 7.75z"
          />
        </>
      )

    // ─────────────────────────────────────────────────────────
    // Do painel
    // ─────────────────────────────────────────────────────────
    case 'sun':
      return (
        <>
          <circle {...common} cx="12" cy="12" r="4" />
          <path
            {...common}
            d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.46 5.46l1.41 1.41M17.13 17.13l1.41 1.41M5.46 18.54l1.41-1.41M17.13 6.87l1.41-1.41"
          />
        </>
      )
    case 'moon':
      return <path {...common} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    case 'download':
      return (
        <>
          <path {...common} d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
          <path {...common} d="M4.5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
        </>
      )
    case 'upload':
      return (
        <>
          <path {...common} d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
          <path {...common} d="M4.5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
        </>
      )
    case 'arrow-right':
      return <path {...common} d="M5 12h14M13.5 6.5L19 12l-5.5 5.5" />
    case 'mail':
      return (
        <>
          <rect {...common} x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path {...common} d="M4.5 7.5l7.5 5.5 7.5-5.5" />
        </>
      )
    case 'lock':
      return (
        <>
          <rect {...common} x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path {...common} d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
        </>
      )

    case 'pause':
      return <path {...common} d="M9 5.5v13M15 5.5v13" />
    case 'user-plus':
      return (
        <>
          <circle {...common} cx="10" cy="8" r="3.75" />
          <path {...common} d="M3.5 20a6.5 6.5 0 0 1 13 0" />
          <path {...common} d="M19 7.5v6M16 10.5h6" />
        </>
      )
    case 'user-minus':
      return (
        <>
          <circle {...common} cx="10" cy="8" r="3.75" />
          <path {...common} d="M3.5 20a6.5 6.5 0 0 1 13 0" />
          <path {...common} d="M16 10.5h6" />
        </>
      )
    case 'copy':
      return (
        <>
          <rect {...common} x="8.5" y="8.5" width="12" height="12" rx="2.5" />
          <path {...common} d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
        </>
      )
    case 'undo':
      return (
        <>
          <path {...common} d="M4.5 10A8 8 0 1 1 6.3 16.5" />
          <path {...common} d="M4 4.5V10h5.5" />
        </>
      )
    case 'link':
      return (
        <>
          <path {...common} d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1.15 1.15" />
          <path {...common} d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.15-1.15" />
        </>
      )
    case 'archive':
      return (
        <>
          <rect {...common} x="3.5" y="4.5" width="17" height="4.5" rx="1.25" />
          <path {...common} d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
          <path {...common} d="M10 13h4" />
        </>
      )
    case 'archive-restore':
      return (
        <>
          <rect {...common} x="3.5" y="4.5" width="17" height="4.5" rx="1.25" />
          <path {...common} d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
          <path {...common} d="M12 17.5v-5M9.75 14.5 12 12.25l2.25 2.25" />
        </>
      )
    case 'megaphone':
      return (
        <>
          <path {...common} d="M4.5 9.5h2.5l8.5-4.5v14l-8.5-4.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
          <path {...common} d="M7.5 14.5 9 19h2.25l-.9-3.6" />
          <path {...common} d="M19 9.5v5" />
        </>
      )
    case 'flag':
      return (
        <>
          <path {...common} d="M5.5 20.5v-16" />
          <path {...common} d="M5.5 4.5h12l-2.75 4.25 2.75 4.25h-12" />
        </>
      )
    case 'flag-off':
      return (
        <>
          <path {...common} d="M5.5 20.5v-16" />
          <path {...common} d="M5.5 4.5h12l-2.75 4.25 2.75 4.25h-12" />
          <path {...common} d="M3.5 3.5l17 17" />
        </>
      )
    case 'monitor':
      return (
        <>
          <rect {...common} x="3" y="4.5" width="18" height="12" rx="2.25" />
          <path {...common} d="M9 20.5h6M12 16.5v4" />
        </>
      )
    case 'smartphone':
      return (
        <>
          <rect {...common} x="7" y="3" width="10" height="18" rx="2.5" />
          <path {...common} d="M11 17.5h2" />
        </>
      )
    case 'alert':
      return (
        <>
          <path {...common} d="M10.3 4.3 3 17.2a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
          <path {...common} d="M12 9.5v4M12 16.75v.01" />
        </>
      )
    case 'inbox':
      return (
        <>
          <path {...common} d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" />
          <path {...common} d="M6 5.5h12l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-4.5L6 5.5z" />
        </>
      )
    case 'image-plus':
      return (
        <>
          <path {...common} d="M13.5 4.5H6A2.5 2.5 0 0 0 3.5 7v11A2.5 2.5 0 0 0 6 20.5h11a2.5 2.5 0 0 0 2.5-2.5v-7.5" />
          <path {...common} d="M3.5 16.5 8 12l4 4 2-2 5.5 5.5" />
          <path {...common} d="M18.5 3v6M15.5 6h6" />
        </>
      )

    default:
      return null
  }
}
