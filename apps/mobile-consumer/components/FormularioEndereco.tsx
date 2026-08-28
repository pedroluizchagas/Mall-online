import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import type { Endereco, TipoEndereco } from '@mallevo/types'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { iconePorTipo, rotuloPorTipo } from '@/lib/enderecos'

const { colors, radius } = consumerDesign

const TIPOS: TipoEndereco[] = ['casa', 'trabalho', 'outro']

interface Props {
  /** Preenchido = edição; ausente = novo endereço. */
  inicial?: Endereco
  salvando: boolean
  onSalvar: (endereco: Endereco) => void
  onCancelar: () => void
}

type Campo = 'rua' | 'numero' | 'bairro' | 'cidade'

/**
 * Formulário de endereço — usado no perfil (cadastrar/editar) e no
 * checkout (cadastrar durante o pedido).
 *
 * NÃO fala com o Supabase: recebe o endereço inicial e devolve o montado
 * via `onSalvar`. Quem persiste é o chamador, via lib/enderecos.ts — assim
 * a regra de "padrão" fica num lugar só e o formulário serve aos dois
 * fluxos sem saber de qual veio.
 */
export function FormularioEndereco({
  inicial,
  salvando,
  onSalvar,
  onCancelar,
}: Props) {
  const [tipo, setTipo] = useState<TipoEndereco>(inicial?.tipo ?? 'casa')
  const [apelido, setApelido] = useState(inicial?.apelido ?? '')
  const [cep, setCep] = useState(inicial?.cep ?? '')
  const [rua, setRua] = useState(inicial?.rua ?? '')
  const [numero, setNumero] = useState(inicial?.numero ?? '')
  const [complemento, setComplemento] = useState(inicial?.complemento ?? '')
  const [bairro, setBairro] = useState(inicial?.bairro ?? '')
  const [cidade, setCidade] = useState(inicial?.cidade ?? 'Divinópolis')
  const [estado, setEstado] = useState(inicial?.estado ?? 'MG')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  /** Último CEP consultado — ver buscarCep. Começa com o do endereço em
   *  edição, para reabrir o formulário não redisparar a consulta. */
  const ultimoCepBuscado = useRef((inicial?.cep ?? '').replace(/\D/g, ''))

  function limparErro(campo: Campo) {
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e))
  }

  /**
   * Preenche rua/bairro/cidade/estado a partir do CEP (ViaCEP).
   *
   * Só busca quando o CEP MUDOU de verdade. Sem essa guarda, corrigir um
   * dígito e redigitá-lo dispara a consulta de novo e devolve a rua do
   * ViaCEP por cima da que a pessoa tinha corrigido à mão — comum em
   * CEP de faixa, onde o logradouro devolvido não é o do endereço.
   */
  async function buscarCep(valor: string) {
    const limpo = valor.replace(/\D/g, '')
    if (limpo.length !== 8) return
    if (limpo === ultimoCepBuscado.current) return
    ultimoCepBuscado.current = limpo

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const dados = await res.json()
      if (!dados.erro) {
        // O ViaCEP não devolve número. Sobrescrever rua/bairro aqui é o
        // certo: o CEP é outro, então o endereço anterior não vale mais.
        if (dados.logradouro) setRua(dados.logradouro)
        if (dados.bairro) setBairro(dados.bairro)
        if (dados.localidade) setCidade(dados.localidade)
        if (dados.uf) setEstado(dados.uf)
        setErros({})
      }
    } catch {
      // CEP é atalho, não obrigação: sem rede o usuário digita tudo.
    } finally {
      setBuscandoCep(false)
    }
  }

  function escolherTipo(novo: TipoEndereco) {
    setTipo(novo)
    // Sugestão só quando o campo está vazio ou ainda tem a sugestão
    // anterior — nunca por cima de um apelido escrito pela pessoa.
    const sugestoes = TIPOS.map(rotuloPorTipo)
    if (!apelido.trim() || sugestoes.includes(apelido.trim())) {
      setApelido(novo === 'outro' ? '' : rotuloPorTipo(novo))
    }
  }

  function handleSalvar() {
    const novosErros: Partial<Record<Campo, string>> = {}
    if (!rua.trim()) novosErros.rua = 'Informe a rua.'
    if (!numero.trim()) novosErros.numero = 'Nº'
    if (!bairro.trim()) novosErros.bairro = 'Informe o bairro.'
    if (!cidade.trim()) novosErros.cidade = 'Informe a cidade.'

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }

    onSalvar({
      apelido: apelido.trim() || rotuloPorTipo(tipo),
      tipo,
      rua: rua.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim().toUpperCase() || 'MG',
      cep: cep.replace(/\D/g, ''),
      // padrao e coordenadas são responsabilidade de lib/enderecos.ts.
      padrao: inicial?.padrao,
    })
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Tipo do local */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.inkMuted,
            letterSpacing: 0.3,
          }}
        >
          Tipo de endereço
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TIPOS.map((t) => {
            const ativo = tipo === t
            return (
              <TouchableOpacity
                key={t}
                onPress={() => escolherTipo(t)}
                activeOpacity={consumerDesign.opacity.pressedSoft}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  borderWidth: ativo ? 1.5 : 1,
                  borderColor: ativo ? colors.accent : colors.line,
                  backgroundColor: ativo
                    ? softColor(colors.accent)
                    : colors.surface,
                }}
              >
                <ConsumerIcon
                  name={iconePorTipo(t)}
                  size={16}
                  color={ativo ? colors.accent : colors.inkMuted}
                  strokeWidth={ativo ? 2.2 : 1.9}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: ativo ? '700' : '600',
                    color: ativo ? colors.accent : colors.inkMuted,
                  }}
                >
                  {rotuloPorTipo(t)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <Input
        rotulo="Apelido (opcional)"
        valor={apelido}
        aoMudar={setApelido}
        placeholder="Ex.: Casa da praia, Escritório"
      />

      <Input
        rotulo={buscandoCep ? 'CEP — buscando...' : 'CEP'}
        valor={cep}
        aoMudar={(t) => {
          setCep(t)
          buscarCep(t)
        }}
        placeholder="00000-000"
        tipo="numero"
        maxLength={9}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input
            rotulo="Rua"
            valor={rua}
            aoMudar={(t) => {
              setRua(t)
              limparErro('rua')
            }}
            placeholder="Nome da rua"
            erro={erros.rua}
          />
        </View>
        <View style={{ width: 100 }}>
          <Input
            rotulo="Número"
            valor={numero}
            aoMudar={(t) => {
              setNumero(t)
              limparErro('numero')
            }}
            placeholder="123"
            erro={erros.numero}
          />
        </View>
      </View>

      <Input
        rotulo="Complemento (opcional)"
        valor={complemento}
        aoMudar={setComplemento}
        placeholder="Apto, bloco, referência..."
      />

      <Input
        rotulo="Bairro"
        valor={bairro}
        aoMudar={(t) => {
          setBairro(t)
          limparErro('bairro')
        }}
        placeholder="Nome do bairro"
        erro={erros.bairro}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input
            rotulo="Cidade"
            valor={cidade}
            aoMudar={(t) => {
              setCidade(t)
              limparErro('cidade')
            }}
            placeholder="Divinópolis"
            erro={erros.cidade}
          />
        </View>
        <View style={{ width: 80 }}>
          <Input
            rotulo="UF"
            valor={estado}
            aoMudar={(t) => setEstado(t.toUpperCase().slice(0, 2))}
            placeholder="MG"
            maxLength={2}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Botao
            label="Cancelar"
            variante="ghost"
            tamanho="md"
            onPress={onCancelar}
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
