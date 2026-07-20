import Svg, { Circle, Path, Rect } from 'react-native-svg'

// Espelha CourierIcon/ConsumerIcon: ícones stroke 24x24 desenhados à mão,
// mesmos strokeWidth/linecap para a DNA visual compartilhada.

type IconName =
  | 'home'
  | 'orders'
  | 'plus'
  | 'gallery'
  | 'menu'
  | 'store'
  | 'back'
  | 'user'
  | 'camera'
  | 'chart'
  | 'wallet'
  | 'star'
  | 'chat'
  | 'calendar'
  | 'bike'
  | 'gear'
  | 'help'
  | 'box'
  | 'eye'
  | 'eye-off'
  | 'logout'

interface Props {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function PartnerIcon({
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

function renderIcon(name: IconName, color: string, strokeWidth: number) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'home':
      return (
        <Path {...common} d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 0 1-1 1h-4.5v-5.5h-6V20.5H4.5a1 1 0 0 1-1-1v-9z" />
      )
    case 'orders':
      return (
        <>
          <Path {...common} d="M6 3.5h12v17l-2.4-1.6L13.2 20.5 12 19.4l-1.2 1.1-2.4-1.6L6 20.5v-17z" />
          <Path {...common} d="M9 8h6" />
          <Path {...common} d="M9 11.5h6" />
          <Path {...common} d="M9 15h4" />
        </>
      )
    case 'plus':
      return (
        <>
          <Path {...common} d="M12 5.5v13" />
          <Path {...common} d="M5.5 12h13" />
        </>
      )
    case 'gallery':
      return (
        <>
          <Rect {...common} x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <Rect {...common} x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <Rect {...common} x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <Path {...common} d="M15.5 15.2v3.6l3-1.8-3-1.8z" />
        </>
      )
    case 'menu':
      return (
        <>
          <Path {...common} d="M4 6.5h16" />
          <Path {...common} d="M4 12h16" />
          <Path {...common} d="M4 17.5h10" />
        </>
      )
    case 'store':
      return (
        <>
          <Path {...common} d="M4.5 9.5L6 4.5h12l1.5 5" />
          <Path {...common} d="M4.5 9.5a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.8 0" />
          <Path {...common} d="M5.5 12v7.5h13V12" />
          <Path {...common} d="M9.5 19.5v-5h5v5" />
        </>
      )
    case 'back':
      return (
        <>
          <Path {...common} d="M14.5 5.5L8 12l6.5 6.5" />
        </>
      )
    case 'user':
      return (
        <>
          <Circle {...common} cx="12" cy="8" r="3.25" />
          <Path {...common} d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </>
      )
    case 'camera':
      return (
        <>
          <Path {...common} d="M4.5 7.5h3l1.5-2h6l1.5 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <Circle {...common} cx="12" cy="13" r="3.25" />
        </>
      )
    case 'chart':
      return (
        <>
          <Path {...common} d="M4 20V4" />
          <Path {...common} d="M4 20h16" />
          <Path {...common} d="M8 16v-5" />
          <Path {...common} d="M12.5 16V7.5" />
          <Path {...common} d="M17 16v-3" />
        </>
      )
    case 'wallet':
      return (
        <>
          <Rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <Path {...common} d="M15 11.5h5.5v4H15a2 2 0 1 1 0-4z" />
        </>
      )
    case 'star':
      return (
        <Path {...common} d="M12 4l2.35 4.9 5.35.7-3.95 3.7.95 5.3L12 16.05 7.3 18.6l.95-5.3L4.3 9.6l5.35-.7L12 4z" />
      )
    case 'chat':
      return (
        <>
          <Path {...common} d="M4.5 5.5h15v10.5h-8l-4 3.5v-3.5h-3V5.5z" />
          <Path {...common} d="M8.5 9.5h7" />
          <Path {...common} d="M8.5 12.5h4.5" />
        </>
      )
    case 'calendar':
      return (
        <>
          <Rect {...common} x="4" y="5.5" width="16" height="14" rx="2" />
          <Path {...common} d="M4 9.5h16" />
          <Path {...common} d="M8.5 3.5v3" />
          <Path {...common} d="M15.5 3.5v3" />
        </>
      )
    case 'bike':
      return (
        <>
          <Circle {...common} cx="6" cy="16.5" r="3" />
          <Circle {...common} cx="18" cy="16.5" r="3" />
          <Path {...common} d="M6 16.5l3.5-6h5" />
          <Path {...common} d="M13 7.5h2.5l2.5 9" />
        </>
      )
    case 'gear':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path {...common} d="M12 3.5v2.5M12 18v2.5M20.5 12H18M6 12H3.5M18 6l-1.8 1.8M7.8 16.2L6 18M18 18l-1.8-1.8M7.8 7.8L6 6" />
        </>
      )
    case 'help':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.5" />
          <Path {...common} d="M9.75 9.3a2.4 2.4 0 0 1 4.65.8c0 1.5-2.4 1.9-2.4 3.4" />
          <Path {...common} d="M12 16.6v.1" />
        </>
      )
    case 'box':
      return (
        <>
          <Path {...common} d="M4 8l8-4.5L20 8v8l-8 4.5L4 16V8z" />
          <Path {...common} d="M4 8l8 4.5L20 8" />
          <Path {...common} d="M12 12.5v8" />
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
          <Path {...common} d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <Path {...common} d="M1 1l22 22" />
        </>
      )
    case 'logout':
      return (
        <>
          <Path {...common} d="M9 20.5H5.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1H9" />
          <Path {...common} d="M15.5 16l4-4-4-4" />
          <Path {...common} d="M19.5 12H9.5" />
        </>
      )
  }
}
