import { useState } from 'react'
import { View, Text } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { consumerDesign } from '@/lib/consumer-design'
import {
  digitos,
  mascaraCPF,
  mascaraData,
  mascaraTelefone,
  validarCPF,
  validarDataNascimento,
  validarTelefone,
  dataParaExibicao,
} from '@/lib/validacao'

const { colors, radius } = consumerDesign

/** Erro por campo — o Input já tem a prop `erro`, então cada um mostra o seu. */
type Campo = 'nome' | 'telefone' | 'cpf' | 'nascimento'
type Erros = Partial<Record<Campo, string>>

export function EditarPerfil({ onFechar }: { onFechar: () => void }) {
  const { consumer, user, setConsumer } = useAuthStore()
  const [nome, setNome] = useState(consumer?.nome ?? '')
  const [telefone, setTelefone] = useState(
    mascaraTelefone(consumer?.telefone ?? '')
  )
  const [cpf, setCpf] = useState(mascaraCPF(consumer?.cpf ?? ''))
  const [nascimento, setNascimento] = useState(
    dataParaExibicao(consumer?.data_nascimento)
  )
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Erros>({})

  function limparErro(campo: Campo) {
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e))
  }

  async function handleSalvar() {
    const novosErros: Erros = {}

    if (!nome.trim()) novosErros.nome = 'O nome é obrigatório.'
    if (!validarTelefone(telefone)) novosErros.telefone = 'Telefone inválido.'

    // CPF e nascimento são opcionais, mas se preenchidos têm de ser válidos:
    // um CPF errado só aparece na hora da nota fiscal, tarde demais.
    const cpfDigitos = digitos(cpf)
    if (cpfDigitos && !validarCPF(cpfDigitos)) {
      novosErros.cpf = 'CPF inválido.'
    }

    const nascimentoIso = nascimento.trim()
      ? validarDataNascimento(nascimento)
      : null
    if (nascimento.trim() && !nascimentoIso) {
      novosErros.nascimento = 'Data inválida.'
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }

    setSalvando(true)
    setErros({})

    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (!u) {
      setSalvando(false)
      return
    }

    const atualizacao = {
      nome: nome.trim(),
      telefone: digitos(telefone) || null,
      cpf: cpfDigitos || null,
      data_nascimento: nascimentoIso,
    }

    const { error } = await supabase
      .from('consumers')
      .update(atualizacao)
      .eq('user_id', u.id)

    if (error) {
      setErros({ nome: 'Erro ao salvar. Tente novamente.' })
      setSalvando(false)
      return
    }

    if (consumer) setConsumer({ ...consumer, ...atualizacao })

    setSalvando(false)
    onFechar()
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }}>
      <Input
        rotulo="Nome completo"
        valor={nome}
        aoMudar={(t) => {
          setNome(t)
          limparErro('nome')
        }}
        placeholder="Seu nome completo"
        erro={erros.nome}
      />

      <Input
        rotulo="Celular (opcional)"
        valor={telefone}
        aoMudar={(t) => {
          setTelefone(mascaraTelefone(t))
          limparErro('telefone')
        }}
        placeholder="(37) 99999-9999"
        tipo="telefone"
        maxLength={15}
        erro={erros.telefone}
      />

      <Input
        rotulo="CPF (opcional)"
        valor={cpf}
        aoMudar={(t) => {
          setCpf(mascaraCPF(t))
          limparErro('cpf')
        }}
        placeholder="000.000.000-00"
        tipo="numero"
        maxLength={14}
        erro={erros.cpf}
      />

      <Input
        rotulo="Data de nascimento (opcional)"
        valor={nascimento}
        aoMudar={(t) => {
          setNascimento(mascaraData(t))
          limparErro('nascimento')
        }}
        placeholder="DD/MM/AAAA"
        tipo="numero"
        maxLength={10}
        erro={erros.nascimento}
      />

      {/* Email é a chave da conta no Supabase Auth — trocá-lo exige
          reconfirmação por link, fluxo que este editor não cobre. */}
      <View
        style={{
          backgroundColor: colors.canvasAlt,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 2,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkMuted,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Email
        </Text>
        <Text style={{ fontSize: 14, color: colors.ink, fontWeight: '600' }}>
          {user?.email ?? '—'}
        </Text>
        <Text style={{ fontSize: 12, color: colors.inkSoft, fontWeight: '500' }}>
          O email não pode ser alterado por aqui.
        </Text>
      </View>

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
