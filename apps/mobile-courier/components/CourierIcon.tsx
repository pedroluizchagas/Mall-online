import Svg, { Circle, Path, Rect } from 'react-native-svg'

type IconName =
  | 'home'
  | 'route'
  | 'wallet'
  | 'user'
  | 'search'
  | 'power'
  | 'store'
  | 'pin'
  | 'clock'
  | 'cash'
  | 'package'
  | 'back'
  | 'phone'
  | 'check'
  | 'trend'
  | 'logout'
  | 'shield'
  | 'spark'
  | 'eye'
  | 'eye-off'
  | 'camera'

interface Props {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function CourierIcon({
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
        <>
          <Path {...common} d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 0 1-1 1h-4.5v-5.5h-6V20.5H4.5a1 1 0 0 1-1-1v-9z" />
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
    case 'wallet':
      return (
        <>
          <Rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <Path {...common} d="M15 11.5h5.5v4H15a2 2 0 1 1 0-4z" />
        </>
      )
    case 'user':
      return (
        <>
          <Circle {...common} cx="12" cy="8" r="3.25" />
          <Path {...common} d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </>
      )
    case 'search':
      return (
        <>
          <Circle {...common} cx="10.5" cy="10.5" r="5.75" />
          <Path {...common} d="M15 15l4.5 4.5" />
        </>
      )
    case 'power':
      return (
        <>
          <Path {...common} d="M12 3.5v7" />
          <Path {...common} d="M7.25 6.75a6.5 6.5 0 1 0 9.5 0" />
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
    case 'pin':
      return (
        <>
          <Path {...common} d="M12 20.25s5.25-4.75 5.25-9a5.25 5.25 0 1 0-10.5 0c0 4.25 5.25 9 5.25 9z" />
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
    case 'cash':
      return (
        <>
          <Rect {...common} x="3.5" y="6.5" width="17" height="11" rx="2.5" />
          <Circle {...common} cx="12" cy="12" r="2.5" />
          <Path {...common} d="M7 10v0M17 14v0" />
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
        <>
          <Path {...common} d="M8.2 5.5h2.6l1.1 3.2-1.6 1.45a13 13 0 0 0 3.7 3.7l1.45-1.6 3.2 1.1v2.6a1.6 1.6 0 0 1-1.6 1.6c-6.35 0-11.5-5.15-11.5-11.5A1.6 1.6 0 0 1 8.2 5.5z" />
        </>
      )
    case 'check':
      return <Path {...common} d="M5.5 12.5l4 4 9-9" />
    case 'trend':
      return (
        <>
          <Path {...common} d="M4.5 17.5l5.5-5.5 3.5 3.5 6-7" />
          <Path {...common} d="M15.5 5h4.5v4.5" />
        </>
      )
    case 'logout':
      return (
        <>
          <Path {...common} d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
          <Path {...common} d="M13.5 8.5l4 3.5-4 3.5" />
          <Path {...common} d="M9 12h8" />
        </>
      )
    case 'shield':
      return (
        <>
          <Path {...common} d="M12 3.75l6 2.25v5.25c0 4-2.55 6.75-6 9-3.45-2.25-6-5-6-9V6l6-2.25z" />
          <Path {...common} d="M9.5 12.25l1.75 1.75 3.5-4" />
        </>
      )
    case 'spark':
      return (
        <>
          <Path {...common} d="M12 3.5l1.2 4.3 4.3 1.2-4.3 1.2L12 14.5l-1.2-4.3-4.3-1.2 4.3-1.2L12 3.5z" />
          <Path {...common} d="M18 14.5l.65 2.35L21 17.5l-2.35.65L18 20.5l-.65-2.35L15 17.5l2.35-.65L18 14.5z" />
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
    case 'camera':
      return (
        <>
          <Path {...common} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle {...common} cx="12" cy="13" r="4" />
        </>
      )
    default:
      return null
  }
}
