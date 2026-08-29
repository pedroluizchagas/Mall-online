import Svg, { Circle, Path, Rect } from 'react-native-svg'

/**
 * Biblioteca de ícones SVG do mobile-consumer.
 * Espelha apps/mobile-courier/components/CourierIcon.tsx.
 *
 * Convenções:
 * - viewBox 0 0 24 24
 * - stroke-only (fill="none")
 * - strokeLinecap/Linejoin: 'round'
 * - strokeWidth default 1.9
 *
 * Detalhamento em docs/system-design/consumer/02-iconografia.md.
 */
export type ConsumerIconName =
  // Navegação principal (tabs)
  | 'home'
  | 'reels'
  | 'orders'
  | 'user'
  /** Lojas seguidas (tela Seguindo, atalho do Início). */
  | 'users'
  // Comuns (espelho do courier)
  | 'search'
  | 'pin'
  | 'clock'
  | 'package'
  | 'back'
  | 'phone'
  | 'check'
  | 'logout'
  | 'shield'
  | 'spark'
  | 'eye'
  | 'eye-off'
  | 'camera'
  | 'store'
  | 'cash'
  | 'wallet'
  | 'trend'
  | 'power'
  | 'route'
  // Específicos do consumer
  | 'bell'
  | 'bike'
  | 'truck'
  | 'tag'
  | 'heart'
  | 'comment'
  | 'send'
  | 'play'
  | 'volume'
  | 'volume-off'
  | 'edit'
  /** Endereço de trabalho (contraparte de `home` na lista de endereços). */
  | 'briefcase'
  /** Endereço padrão do checkout. */
  | 'star'
  | 'trash'
  | 'file'
  | 'info'
  | 'bag'
  | 'chef'
  | 'check-double'
  | 'check-circle'
  | 'close'
  | 'close-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-up'
  | 'plus'
  | 'minus'
  // Pisos — sinalização do diretório do shopping (um ícone de linha por piso;
  // o emoji de PISOS em @mallevo/lib é fallback, nunca aparece no consumer)
  | 'utensils'
  | 'hanger'
  | 'pulse'
  | 'scissors'
  | 'paw'
  | 'armchair'
  | 'basket'
  | 'wrench'
  | 'gift'

interface Props {
  name: ConsumerIconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function ConsumerIcon({
  name,
  size = 20,
  color = '#111216',
  strokeWidth = 1.9,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderIcon(name, color, strokeWidth)}
    </Svg>
  )
}

function renderIcon(name: ConsumerIconName, color: string, strokeWidth: number) {
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
        <Path
          {...common}
          d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 0 1-1 1h-4.5v-5.5h-6V20.5H4.5a1 1 0 0 1-1-1v-9z"
        />
      )
    case 'reels':
      return (
        <>
          <Rect {...common} x="3" y="5.5" width="18" height="13" rx="2" />
          <Path
            {...common}
            d="M3 9.5h18M7.5 5.5L9.5 9.5M12 5.5L14 9.5M16.5 5.5L18.5 9.5"
          />
        </>
      )
    case 'orders':
      return (
        <>
          <Rect {...common} x="6" y="4" width="12" height="17" rx="2" />
          <Path {...common} d="M9 3.5h6v3H9zM9 11h6M9 15h6M9 19h4" />
        </>
      )
    case 'user':
      return (
        <>
          <Circle {...common} cx="12" cy="8" r="3.25" />
          <Path {...common} d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </>
      )
    case 'users':
      return (
        <>
          <Circle {...common} cx="9.5" cy="8.5" r="3.25" />
          <Path {...common} d="M3.5 19.5a6 6 0 0 1 12 0" />
          <Path {...common} d="M16.25 5.9a3.25 3.25 0 0 1 0 5.2" />
          <Path {...common} d="M17.75 14.4a6 6 0 0 1 2.75 5.1" />
        </>
      )

    // ─────────────────────────────────────────────────────────
    // Reaproveitados do courier
    // ─────────────────────────────────────────────────────────
    case 'search':
      return (
        <>
          <Circle {...common} cx="10.5" cy="10.5" r="5.75" />
          <Path {...common} d="M15 15l4.5 4.5" />
        </>
      )
    case 'pin':
      return (
        <>
          <Path
            {...common}
            d="M12 20.25s5.25-4.75 5.25-9a5.25 5.25 0 1 0-10.5 0c0 4.25 5.25 9 5.25 9z"
          />
          <Circle {...common} cx="12" cy="11.25" r="1.9" />
        </>
      )
    case 'clock':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.25" />
          <Path {...common} d="M12 7.75v4.75l3.5 2" />
        </>
      )
    case 'package':
      return (
        <>
          <Path {...common} d="M12 3.75l7 3.75v9L12 20.25 5 16.5v-9l7-3.75z" />
          <Path {...common} d="M12 20.25V12" />
          <Path {...common} d="M5.25 7.75L12 12l6.75-4.25" />
        </>
      )
    case 'back':
      return <Path {...common} d="M14.75 5.5L8.25 12l6.5 6.5" />
    case 'phone':
      return (
        <Path
          {...common}
          d="M8.2 5.5h2.6l1.1 3.2-1.6 1.45a13 13 0 0 0 3.7 3.7l1.45-1.6 3.2 1.1v2.6a1.6 1.6 0 0 1-1.6 1.6c-6.35 0-11.5-5.15-11.5-11.5A1.6 1.6 0 0 1 8.2 5.5z"
        />
      )
    case 'check':
      return <Path {...common} d="M5.5 12.5l4 4 9-9" />
    case 'logout':
      return (
        <>
          <Path
            {...common}
            d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"
          />
          <Path {...common} d="M13.5 8.5l4 3.5-4 3.5" />
          <Path {...common} d="M9 12h8" />
        </>
      )
    case 'shield':
      return (
        <>
          <Path
            {...common}
            d="M12 3.75l6 2.25v5.25c0 4-2.55 6.75-6 9-3.45-2.25-6-5-6-9V6l6-2.25z"
          />
          <Path {...common} d="M9.5 12.25l1.75 1.75 3.5-4" />
        </>
      )
    case 'spark':
      return (
        <>
          <Path
            {...common}
            d="M12 3.5l1.2 4.3 4.3 1.2-4.3 1.2L12 14.5l-1.2-4.3-4.3-1.2 4.3-1.2L12 3.5z"
          />
          <Path
            {...common}
            d="M18 14.5l.65 2.35L21 17.5l-2.35.65L18 20.5l-.65-2.35L15 17.5l2.35-.65L18 14.5z"
          />
        </>
      )
    case 'eye':
      return (
        <>
          <Path {...common} d="M2 12s3.5-7.5 10-7.5S22 12 22 12s-3.5 7.5-10 7.5S2 12 2 12z" />
          <Circle {...common} cx="12" cy="12" r="3" />
        </>
      )
    case 'eye-off':
      return (
        <>
          <Path
            {...common}
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
          />
          <Path {...common} d="M1 1l22 22" />
        </>
      )
    case 'camera':
      return (
        <>
          <Path
            {...common}
            d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
          />
          <Circle {...common} cx="12" cy="13" r="4" />
        </>
      )
    case 'store':
      return (
        <>
          <Path {...common} d="M5 9.5h14l-1-4H6l-1 4z" />
          <Path {...common} d="M6 9.5v9.5h12V9.5" />
          <Path {...common} d="M9.5 19V14h5v5" />
        </>
      )
    case 'cash':
      return (
        <>
          <Rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <Circle {...common} cx="12" cy="12" r="2.5" />
          <Path {...common} d="M7 10v0M17 14v0" />
        </>
      )
    case 'wallet':
      return (
        <>
          <Rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <Path {...common} d="M15 11.5h5.5v4H15a2 2 0 1 1 0-4z" />
        </>
      )
    case 'trend':
      return (
        <>
          <Path {...common} d="M4.5 17.5l5.5-5.5 3.5 3.5 6-7" />
          <Path {...common} d="M15.5 5h4.5v4.5" />
        </>
      )
    case 'power':
      return (
        <>
          <Path {...common} d="M12 3.5v7" />
          <Path {...common} d="M7.25 6.75a6.5 6.5 0 1 0 9.5 0" />
        </>
      )
    case 'route':
      return (
        <>
          <Circle {...common} cx="6" cy="18" r="2.25" />
          <Circle {...common} cx="18" cy="6" r="2.25" />
          <Path {...common} d="M8.5 17.5h3a4 4 0 0 0 4-4v-3" />
          <Path {...common} d="M14.25 8H18V4.25" />
        </>
      )

    // ─────────────────────────────────────────────────────────
    // Específicos do consumer
    // ─────────────────────────────────────────────────────────
    case 'bell':
      return (
        <>
          <Path
            {...common}
            d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z"
          />
          <Path {...common} d="M10 19.5a2 2 0 0 0 4 0" />
        </>
      )
    case 'bike':
      return (
        <>
          <Circle {...common} cx="5.5" cy="17" r="3.25" />
          <Circle {...common} cx="18.5" cy="17" r="3.25" />
          <Path
            {...common}
            d="M5.5 17l3.5-7h5l3.5 7M9 10l-1.5-3.5H5M14 10l1-3.5h2.5"
          />
        </>
      )
    case 'truck':
      return (
        <>
          <Rect {...common} x="2.5" y="7.5" width="11" height="9" rx="1.5" />
          <Path {...common} d="M13.5 10.5h4l3 3.5v2.5h-7" />
          <Circle {...common} cx="7" cy="17" r="2" />
          <Circle {...common} cx="17" cy="17" r="2" />
        </>
      )
    case 'tag':
      return (
        <>
          <Path {...common} d="M3.5 11.5V4.5h7L20.5 14.5l-6 6L3.5 11.5z" />
          <Circle {...common} cx="8" cy="8" r="1.25" />
        </>
      )
    case 'heart':
      return (
        <Path
          {...common}
          d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z"
        />
      )
    case 'comment':
      return (
        <Path
          {...common}
          d="M20.5 12c0 4.5-3.5 7.5-8.5 7.5a10 10 0 0 1-3.5-.6L4 20.5l1.6-4.4A8 8 0 0 1 3.5 12c0-4.5 3.5-7.5 8.5-7.5s8.5 3 8.5 7.5z"
        />
      )
    case 'send':
      return (
        <>
          <Path {...common} d="M21 3.5L3 11l7.5 2 2 7.5L21 3.5z" />
          <Path {...common} d="M10.5 13L21 3.5" />
        </>
      )
    case 'play':
      return <Path {...common} d="M7 4.5v15l13-7.5L7 4.5z" />
    case 'volume':
      return (
        <>
          <Path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
          <Path
            {...common}
            d="M16 8.5a5 5 0 0 1 0 7M18.5 5.5a8.5 8.5 0 0 1 0 13"
          />
        </>
      )
    case 'volume-off':
      return (
        <>
          <Path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
          <Path {...common} d="M17 9l5 5M22 9l-5 5" />
        </>
      )
    case 'edit':
      return (
        <>
          <Path {...common} d="M4 20l1-4 11-11 3 3-11 11-4 1z" />
          <Path {...common} d="M14 7l3 3" />
        </>
      )
    case 'briefcase':
      return (
        <>
          <Rect {...common} x="3" y="7.5" width="18" height="12.5" rx="2" />
          <Path {...common} d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" />
          <Path {...common} d="M3 12.5h18" />
        </>
      )
    case 'star':
      return (
        <Path
          {...common}
          d="M12 3.75l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 17.03l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L12 3.75z"
        />
      )
    case 'trash':
      return (
        <>
          <Path {...common} d="M4.5 6.5h15" />
          <Path {...common} d="M9.5 6.5V4.75h5V6.5" />
          <Path {...common} d="M6.5 6.5l.9 13a1 1 0 0 0 1 .95h7.2a1 1 0 0 0 1-.95l.9-13" />
          <Path {...common} d="M10.5 10.5v6M13.5 10.5v6" />
        </>
      )
    case 'file':
      return (
        <>
          <Path {...common} d="M6 3.5h7l5 5v12H6v-17z" />
          <Path {...common} d="M13 3.5v5h5M9 12.5h6M9 16h6" />
        </>
      )
    case 'info':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.25" />
          <Path {...common} d="M12 11v5M12 8v0.01" />
        </>
      )
    case 'bag':
      return (
        <>
          <Path {...common} d="M5 7.5h14l-1 13H6l-1-13z" />
          <Path {...common} d="M9 10V7a3 3 0 0 1 6 0v3" />
        </>
      )
    case 'chef':
      return (
        <>
          <Path
            {...common}
            d="M6 11a3.5 3.5 0 1 1 1.5-6.6A4 4 0 0 1 16.5 4.4 3.5 3.5 0 1 1 18 11v3H6v-3z"
          />
          <Path {...common} d="M6 14h12v5.5H6z" />
        </>
      )
    case 'check-double':
      return (
        <>
          <Path {...common} d="M3 12.5l4 4 9-9" />
          <Path {...common} d="M9 16.5l4 4 9-9" />
        </>
      )
    case 'check-circle':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.25" />
          <Path {...common} d="M8.5 12.5l3 3 4-5" />
        </>
      )
    case 'close':
      return <Path {...common} d="M5 5l14 14M19 5L5 19" />
    case 'close-circle':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.25" />
          <Path {...common} d="M9 9l6 6M15 9l-6 6" />
        </>
      )
    case 'chevron-down':
      return <Path {...common} d="M6 9.5l6 6 6-6" />
    case 'chevron-right':
      return <Path {...common} d="M9.5 6l6 6-6 6" />
    case 'chevron-left':
      return <Path {...common} d="M14.5 6l-6 6 6 6" />
    case 'chevron-up':
      return <Path {...common} d="M6 14.5l6-6 6 6" />
    case 'plus':
      return <Path {...common} d="M12 5v14M5 12h14" />
    case 'minus':
      return <Path {...common} d="M5 12h14" />

    // ─────────────────────────────────────────────────────────
    // Pisos (diretório do shopping)
    // ─────────────────────────────────────────────────────────
    case 'utensils':
      return (
        <>
          <Path
            {...common}
            d="M5.5 3.5v4.75a2.25 2.25 0 0 0 2.25 2.25h.5a2.25 2.25 0 0 0 2.25-2.25V3.5"
          />
          <Path {...common} d="M8 3.5v17" />
          <Path
            {...common}
            d="M18.75 14.75V3.5a4.25 4.25 0 0 0-3.5 4.25v5a2 2 0 0 0 2 2h1.5z"
          />
          <Path {...common} d="M18.75 14.75v5.75" />
        </>
      )
    case 'hanger':
      return (
        <>
          <Path
            {...common}
            d="M14 6.1a2 2 0 1 0-4 0c0 1.55.62 2.8 1.85 3.75"
          />
          <Path
            {...common}
            d="M12 9.85L19.6 14a1.9 1.9 0 0 1 1 1.67v.33a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1v-.33A1.9 1.9 0 0 1 4.4 14L12 9.85z"
          />
        </>
      )
    case 'pulse':
      return (
        <Path {...common} d="M3.25 12.5h3.4L9.5 5.5l5 13.25 2.85-6.25h3.4" />
      )
    case 'scissors':
      return (
        <>
          <Circle {...common} cx="6.25" cy="6.5" r="2.6" />
          <Circle {...common} cx="6.25" cy="17.5" r="2.6" />
          <Path {...common} d="M19.75 4.5L8.55 15.7" />
          <Path {...common} d="M14.1 14.15l5.65 5.35" />
          <Path {...common} d="M8.55 8.3l3.45 3.45" />
        </>
      )
    case 'paw':
      return (
        <>
          <Circle {...common} cx="6" cy="10" r="1.75" />
          <Circle {...common} cx="9.9" cy="6.75" r="1.75" />
          <Circle {...common} cx="14.1" cy="6.75" r="1.75" />
          <Circle {...common} cx="18" cy="10" r="1.75" />
          <Path
            {...common}
            d="M12 12.25c-2.85 0-5.1 2.05-5.1 4.45 0 1.5 1.15 2.8 2.6 2.8 1 0 1.65-.55 2.5-.55s1.5.55 2.5.55c1.45 0 2.6-1.3 2.6-2.8 0-2.4-2.25-4.45-5.1-4.45z"
          />
        </>
      )
    case 'armchair':
      return (
        <>
          <Path {...common} d="M19 9.5V6.75a2.25 2.25 0 0 0-2.25-2.25h-9.5A2.25 2.25 0 0 0 5 6.75V9.5" />
          <Path
            {...common}
            d="M3.25 15.5a2 2 0 0 0 2 2h13.5a2 2 0 0 0 2-2v-4a2 2 0 0 0-4 0v1.75h-9.5V11.5a2 2 0 0 0-4 0z"
          />
          <Path {...common} d="M5.75 17.5v2.25M18.25 17.5v2.25" />
        </>
      )
    case 'basket':
      return (
        <>
          <Path {...common} d="M2.75 10.5h18.5" />
          <Path
            {...common}
            d="M4.25 10.5l1.5 7.65a2 2 0 0 0 1.97 1.6h8.56a2 2 0 0 0 1.97-1.6l1.5-7.65"
          />
          <Path {...common} d="M5.75 10.5l3.5-6.25M18.25 10.5l-3.5-6.25" />
          <Path {...common} d="M10 13.75v2.75M14 13.75v2.75" />
        </>
      )
    case 'wrench':
      return (
        <Path
          {...common}
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
      )
    case 'gift':
      return (
        <>
          <Rect {...common} x="3.5" y="7.75" width="17" height="4" rx="1" />
          <Path {...common} d="M12 7.75v12.5" />
          <Path {...common} d="M19 11.75v6.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6.5" />
          <Path
            {...common}
            d="M12 7.75H7.75a2.125 2.125 0 0 1 0-4.25C10.7 3.5 12 7.75 12 7.75z"
          />
          <Path
            {...common}
            d="M12 7.75h4.25a2.125 2.125 0 0 0 0-4.25C13.3 3.5 12 7.75 12 7.75z"
          />
        </>
      )

    default:
      return null
  }
}
