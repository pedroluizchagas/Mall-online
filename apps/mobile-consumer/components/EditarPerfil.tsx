import { useState } from 'react'
import { View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'

export function EditarPerfil({ onFechar }: { onFechar: () => void }) {
  const { consumer, setConsumer } = useAuthStore()
  const [nome, setNome] = useState(consumer?.nome ?? '')
  const [telefone, setTelefone] = useState(consumer?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | undefined>(undefined)

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(undefined)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSalvando(false)
      return
    }

    const { error } = await supabase
      .from('consumers')
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq('user_id', user.id)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    if (consumer) {
      setConsumer({
        ...consumer,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
      })
    }

    setSalvando(false)
    onFechar()
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }}>
      <Input
        rotulo="Nome"
        valor={nome}
        aoMudar={setNome}
        placeholder="Seu nome completo"
        erro={erro}
      />

      <Input
        rotulo="Telefone (opcional)"
        valor={telefone}
        aoMudar={setTelefone}
        placeholder="(37) 99999-9999"
        tipo="telefone"
      />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Botao
            label="Cancelar"
            variante="ghost"
            tamanho="md"
            onPress={onFechar}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Botao
            label="Salvar"
            variante="primario"
            tamanho="md"
            carregando={salvando}
            onPress={handleSalvar}
          />
        </View>
      </View>
    </View>
  )
}
