import { TouchableOpacity, Text } from 'react-native'

interface Props {
  categoria: { id: string; nome: string; icone: string | null }
  ativa: boolean
  onPress: () => void
}

export function CategoriaChip({ categoria, ativa, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border
        ${ativa
          ? 'bg-verde-profundo border-verde-profundo'
          : 'bg-white border-gray-100'
        }`}
      activeOpacity={0.75}
    >
      {categoria.icone && (
        <Text className="text-base">{categoria.icone}</Text>
      )}
      <Text
        className={`text-sm font-medium ${
          ativa ? 'text-white' : 'text-gray-700'
        }`}
      >
        {categoria.nome}
      </Text>
    </TouchableOpacity>
  )
}
