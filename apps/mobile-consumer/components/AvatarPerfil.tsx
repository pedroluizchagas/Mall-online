import { useState } from 'react'
import {
  View,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import {
  escolherFoto,
  enviarAvatar,
  apagarAvatar,
  ErroPermissao,
  type OrigemFoto,
} from '@/lib/avatar'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

/**
 * Avatar do card de identidade do perfil: foto se houver, inicial do nome
 * como fundo. Toque abre o menu de origem (câmera/galeria/remover).
 *
 * O estado `erroImagem` cobre a URL que ficou órfã — a foto foi apagada do
 * bucket por outra via, mas `foto_url` continua na tabela. Sem ele o
 * círculo ficaria vazio; com ele volta para a inicial.
 */
export function AvatarPerfil({ tamanho = 56 }: { tamanho?: number }) {
  const { consumer, setConsumer } = useAuthStore()
  const [enviando, setEnviando] = useState(false)
  const [erroImagem, setErroImagem] = useState(false)

  const fotoUrl = consumer?.foto_url ?? null
  const mostrarFoto = !!fotoUrl && !erroImagem
  const inicial = consumer?.nome?.charAt(0).toUpperCase() ?? '?'

  async function persistir(url: string | null) {
    if (!consumer) return
    // `.select()` porque um UPDATE que não casa linha nenhuma volta sem
    // erro — a foto pareceria salva e sumiria no próximo boot.
    const { data, error } = await supabase
      .from('consumers')
      .update({ foto_url: url })
      .eq('id', consumer.id)
      .select('id')

    if (error || !data || data.length === 0) {
      throw new Error('Não foi possível salvar a foto.')
    }
    setConsumer({ ...consumer, foto_url: url })
    setErroImagem(false)
  }

  async function trocarFoto(origem: OrigemFoto) {
    try {
      const uri = await escolherFoto(origem)
      if (!uri) return

      setEnviando(true)
      await persistir(await enviarAvatar(uri))
    } catch (e) {
      Alert.alert(
        e instanceof ErroPermissao ? 'Permissão necessária' : 'Erro',
        e instanceof Error
          ? e.message
          : 'Não foi possível atualizar a foto. Tente novamente.'
      )
    } finally {
      setEnviando(false)
    }
  }

  async function removerFoto() {
    try {
      setEnviando(true)
      // Primeiro a tabela: é ela que a UI lê. O arquivo é limpeza.
      await persistir(null)
      await apagarAvatar()
    } catch {
      Alert.alert('Erro', 'Não foi possível remover a foto. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirMenu() {
    if (enviando || !consumer) return

    Alert.alert('Foto de perfil', undefined, [
      { text: 'Tirar foto', onPress: () => trocarFoto('camera') },
      { text: 'Escolher da galeria', onPress: () => trocarFoto('galeria') },
      ...(fotoUrl
        ? [
            {
              text: 'Remover foto',
              style: 'destructive' as const,
              onPress: removerFoto,
            },
          ]
        : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ])
  }

  const badge = Math.round(tamanho * 0.36)

  return (
    <TouchableOpacity
      onPress={abrirMenu}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={
        fotoUrl ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'
      }
      style={{ width: tamanho, height: tamanho }}
    >
      <View
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {mostrarFoto ? (
          <Image
            source={{ uri: fotoUrl! }}
            onError={() => setErroImagem(true)}
            style={{ width: tamanho, height: tamanho }}
          />
        ) : (
          <Text
            style={{
              fontSize: tamanho * 0.43,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.5,
            }}
          >
            {inicial}
          </Text>
        )}

        {enviando && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `rgba(17, 18, 22, ${consumerDesign.opacity.overlay})`,
            }}
          >
            <ActivityIndicator color={colors.white} size="small" />
          </View>
        )}
      </View>

      {/* Selo de câmera: o único aviso de que o avatar é tocável. */}
      <View
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: badge,
          height: badge,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          borderWidth: 2,
          borderColor: colors.surfaceDark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon
          name="camera"
          size={badge * 0.55}
          color={colors.ink}
          strokeWidth={2}
        />
      </View>
    </TouchableOpacity>
  )
}
