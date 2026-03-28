import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

interface Props {
  label: string
  onPress: () => void
  variante?: 'primario' | 'secundario' | 'ghost'
  carregando?: boolean
  desabilitado?: boolean
}

export function Botao({
  label,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
}: Props) {
  const estilos = {
    primario: 'bg-verde-profundo',
    secundario: 'bg-white border border-verde-profundo',
    ghost: 'bg-transparent',
  }

  const estilosTexto = {
    primario: 'text-white',
    secundario: 'text-verde-profundo',
    ghost: 'text-verde-medio',
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desabilitado || carregando}
      className={`py-4 rounded-2xl items-center ${estilos[variante]} ${
        desabilitado || carregando ? 'opacity-50' : ''
      }`}
      activeOpacity={0.85}
    >
      {carregando ? (
        <ActivityIndicator
          color={variante === 'primario' ? '#fff' : '#1A4D3A'}
        />
      ) : (
        <Text className={`font-semibold text-base ${estilosTexto[variante]}`}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}
