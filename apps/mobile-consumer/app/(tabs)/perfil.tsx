import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import { GerenciarEnderecos } from '@/components/GerenciarEnderecos'
import { EditarPerfil } from '@/components/EditarPerfil'
import {
  Edit3,
  MapPin,
  ClipboardList,
  FileText,
  Shield,
  ChevronRight,
  LogOut,
} from 'lucide-react-native'

type SecaoAtiva = null | 'enderecos' | 'editar'

export default function TelaPerfil() {
  const { consumer, user, limpar: limparAuth } = useAuthStore()
  const { limparCarrinho } = useCartStore()
  const { limpar: limparOrder } = useOrderStore()
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>(null)
  const [atualizando, setAtualizando] = useState(false)
  const insets = useSafeAreaInsets()

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (u) {
      const { data } = await supabase
        .from('consumers')
        .select('id, nome, telefone, foto_url, enderecos')
        .eq('user_id', u.id)
        .single()
      if (data) {
        useAuthStore.getState().setConsumer(data)
      }
    }
    setAtualizando(false)
  }, [])

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          limparAuth()
          limparCarrinho()
          limparOrder()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const primeiraLetra = consumer?.nome?.charAt(0).toUpperCase() ?? '?'
  const nomeExibido = consumer?.nome ?? 'Usuário'
  const qtdEnderecos = consumer?.enderecos?.length ?? 0

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F0EB' }}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    >
      {/* Header verde com avatar */}
      <View
        style={{
          backgroundColor: '#1A4D3A',
          paddingTop: insets.top + 16,
          paddingBottom: 32,
          paddingHorizontal: 24,
          overflow: 'hidden',
        }}
      >
        {/* Círculos decorativos */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 60,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -30,
            left: -20,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        />

        {/* Avatar */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: '#287D5C',
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 34,
                fontWeight: '700',
                letterSpacing: -0.5,
              }}
            >
              {primeiraLetra}
            </Text>
          </View>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
              letterSpacing: -0.3,
              marginBottom: 4,
            }}
          >
            {nomeExibido}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            {user?.email ?? ''}
          </Text>

          {/* Botão editar perfil */}
          <TouchableOpacity
            onPress={() => setSecaoAtiva(secaoAtiva === 'editar' ? null : 'editar')}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Edit3 size={13} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Text
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12.5,
                fontWeight: '600',
                letterSpacing: 0.2,
              }}
            >
              Editar perfil
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Formulário de edição */}
      {secaoAtiva === 'editar' && (
        <EditarPerfil onFechar={() => setSecaoAtiva(null)} />
      )}

      {/* Stats strip */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          marginTop: -1,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#1C1C19',
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderWidth: 1,
          borderColor: 'rgba(26,26,23,0.06)',
        }}
      >
        <StatItem label="Pedidos" valor="—" />
        <View
          style={{ width: 1, backgroundColor: 'rgba(26,26,23,0.07)', marginVertical: 14 }}
        />
        <StatItem
          label="Endereços"
          valor={String(qtdEnderecos)}
        />
        <View
          style={{ width: 1, backgroundColor: 'rgba(26,26,23,0.07)', marginVertical: 14 }}
        />
        <StatItem label="Nível" valor="VIP" destaque />
      </View>

      {/* Seção: Minha conta */}
      <SectionTitle label="Minha conta" />

      <View
        style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(26,26,23,0.06)',
        }}
      >
        <MenuItem
          icon={<MapPin size={18} color="#1A4D3A" strokeWidth={1.8} />}
          label="Meus endereços"
          descricao={`${qtdEnderecos} endereço${qtdEnderecos !== 1 ? 's' : ''} salvo${qtdEnderecos !== 1 ? 's' : ''}`}
          onPress={() => setSecaoAtiva(secaoAtiva === 'enderecos' ? null : 'enderecos')}
          expandido={secaoAtiva === 'enderecos'}
          ultimo
        />
      </View>

      {/* Endereços expandido */}
      {secaoAtiva === 'enderecos' && (
        <View style={{ marginHorizontal: 20 }}>
          <GerenciarEnderecos
            enderecos={consumer?.enderecos ?? []}
            onAtualizar={(novos) => {
              const c = useAuthStore.getState().consumer
              if (c) useAuthStore.getState().setConsumer({ ...c, enderecos: novos })
            }}
          />
        </View>
      )}

      {/* Seção: Histórico */}
      <SectionTitle label="Pedidos" />

      <View
        style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(26,26,23,0.06)',
        }}
      >
        <MenuItem
          icon={<ClipboardList size={18} color="#287D5C" strokeWidth={1.8} />}
          label="Histórico de pedidos"
          onPress={() => router.push('/(tabs)/pedidos')}
          ultimo
        />
      </View>

      {/* Seção: Informações */}
      <SectionTitle label="Informações" />

      <View
        style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(26,26,23,0.06)',
        }}
      >
        <MenuItem
          icon={<FileText size={18} color="#6B6B60" strokeWidth={1.8} />}
          label="Termos de uso"
          onPress={() => {}}
        />
        <MenuItem
          icon={<Shield size={18} color="#6B6B60" strokeWidth={1.8} />}
          label="Política de privacidade"
          onPress={() => {}}
          ultimo
        />
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginHorizontal: 20,
          marginTop: 24,
          paddingVertical: 15,
          borderRadius: 18,
          backgroundColor: 'rgba(199,91,58,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(199,91,58,0.2)',
        }}
      >
        <LogOut size={16} color="#C75B3A" strokeWidth={2} />
        <Text
          style={{
            color: '#C75B3A',
            fontSize: 14,
            fontWeight: '600',
            letterSpacing: 0.1,
          }}
        >
          Sair da conta
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 11,
          color: 'rgba(26,26,23,0.25)',
          textAlign: 'center',
          marginTop: 20,
          letterSpacing: 0.3,
        }}
      >
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}

function StatItem({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: destaque ? '#D4A04A' : '#1C1C19',
          letterSpacing: -0.5,
        }}
      >
        {valor}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: '#8A8A7E',
          marginTop: 3,
          fontWeight: '500',
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: '#8A8A7E',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginHorizontal: 24,
        marginTop: 28,
        marginBottom: 10,
      }}
    >
      {label}
    </Text>
  )
}

function MenuItem({
  icon,
  label,
  descricao,
  onPress,
  expandido,
  ultimo,
}: {
  icon: React.ReactNode
  label: string
  descricao?: string
  onPress: () => void
  expandido?: boolean
  ultimo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: 'rgba(26,26,23,0.06)',
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: '#F4F0EB',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14.5,
            fontWeight: '600',
            color: '#1C1C19',
            letterSpacing: -0.1,
          }}
        >
          {label}
        </Text>
        {descricao && (
          <Text
            style={{
              fontSize: 12,
              color: '#8A8A7E',
              marginTop: 2,
              fontWeight: '400',
            }}
          >
            {descricao}
          </Text>
        )}
      </View>

      <ChevronRight
        size={16}
        color={expandido ? '#1A4D3A' : '#C8C8BE'}
        strokeWidth={expandido ? 2.5 : 1.8}
        style={{ transform: [{ rotate: expandido ? '90deg' : '0deg' }] }}
      />
    </TouchableOpacity>
  )
}
