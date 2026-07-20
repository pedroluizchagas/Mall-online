import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import type { HorariosFuncionamento } from '@mallevo/types'
import { useAuthStore } from '@/store/useAuthStore'
import {
  alternarLojaAtiva,
  atualizarConfigEntrega,
  atualizarDadosGerais,
  atualizarEndereco,
  atualizarHorarios,
  atualizarImagemLoja,
  atualizarMetodosPagamento,
  getDadosLoja,
  type DadosLoja,
} from '@/lib/loja'
import { escolherImagem } from '@/lib/upload'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign, softColor } from '@/lib/partner-design'

// Minha loja — dados, imagens, horários (grade semanal), entrega,
// pagamentos e endereço. Cada seção salva sozinha (espelha as actions
// separadas do Dashboard). docs/partner-app/08 §1.

const DIAS: { key: keyof HorariosFuncionamento; rotulo: string }[] = [
  { key: 'seg', rotulo: 'Segunda' },
  { key: 'ter', rotulo: 'Terça' },
  { key: 'qua', rotulo: 'Quarta' },
  { key: 'qui', rotulo: 'Quinta' },
  { key: 'sex', rotulo: 'Sexta' },
  { key: 'sab', rotulo: 'Sábado' },
  { key: 'dom', rotulo: 'Domingo' },
]

export default function TelaMinhaLoja() {
  const { tenant, lojaAtivaId } = useAuthStore()
  const [loja, setLoja] = useState<DadosLoja | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Forms por seção
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [telefone, setTelefone] = useState('')
  const [horarios, setHorarios] = useState<HorariosFuncionamento>({})
  const [taxaReais, setTaxaReais] = useState('')
  const [tempo, setTempo] = useState('')
  const [raio, setRaio] = useState('')
  const [entregadoresProprios, setEntregadoresProprios] = useState(false)
  const [aceitaPix, setAceitaPix] = useState(true)
  const [aceitaCartao, setAceitaCartao] = useState(true)
  const [endereco, setEndereco] = useState<NonNullable<DadosLoja['endereco']>>({})
  const [salvando, setSalvando] = useState<string | null>(null)

  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return
    setCarregando(true)
    const d = await getDadosLoja(lojaAtivaId)
    if (d) {
      setLoja(d)
      setNome(d.nome)
      setDescricao(d.descricao ?? '')
      setTelefone(d.telefone ?? '')
      setHorarios(d.horarios ?? {})
      setTaxaReais((d.taxa_entrega / 100).toFixed(2).replace('.', ','))
      setTempo(d.tempo_entrega !== null ? String(d.tempo_entrega) : '')
      setRaio(d.raio_entrega_km !== null ? String(d.raio_entrega_km) : '')
      setEntregadoresProprios(d.usa_entregadores_proprios)
      setAceitaPix(d.aceita_pix)
      setAceitaCartao(d.aceita_cartao_online)
      setEndereco(d.endereco ?? {})
    }
    setCarregando(false)
  }, [lojaAtivaId])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  async function salvar(secao: string, fn: () => Promise<{ sucesso?: true; erro?: string }>) {
    if (salvando) return
    setSalvando(secao)
    const r = await fn()
    setSalvando(null)
    if (r.erro) Alert.alert('Não foi possível salvar', r.erro)
    else void carregar()
  }

  async function handlePausar(novoAtivo: boolean) {
    if (!loja) return
    setLoja({ ...loja, ativo: novoAtivo })
    const r = await alternarLojaAtiva(loja.id, novoAtivo)
    if (r.erro) {
      setLoja({ ...loja, ativo: loja.ativo })
      Alert.alert('Não foi possível atualizar', r.erro)
    }
  }

  function trocarImagem(tipo: 'logo' | 'banner') {
    Alert.alert(tipo === 'logo' ? 'Logo da loja' : 'Banner da loja', undefined, [
      { text: 'Tirar foto', onPress: () => void enviar(tipo, 'camera') },
      { text: 'Escolher da galeria', onPress: () => void enviar(tipo, 'galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function enviar(tipo: 'logo' | 'banner', origem: 'camera' | 'galeria') {
    if (!loja || !tenant) return
    const uri = await escolherImagem(origem)
    if (!uri) return
    await salvar(`img-${tipo}`, () => atualizarImagemLoja(loja.id, tenant.id, tipo, uri))
  }

  function setDia(key: keyof HorariosFuncionamento, valor: { abre: string; fecha: string } | null) {
    setHorarios((h) => ({ ...h, [key]: valor }))
  }

  if (!loja) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
          contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}
        >
          <CabecalhoTela titulo="Minha loja" />

          {/* Pausar loja — destaque no topo */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: loja.ativo ? colors.surface : softColor(colors.danger),
              borderRadius: radius.md,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodyLg.size }}>
                {loja.ativo ? 'Loja aberta' : 'Loja pausada'}
              </Text>
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
                {loja.ativo
                  ? 'Clientes conseguem ver e pedir.'
                  : 'Clientes não conseguem pedir agora.'}
              </Text>
            </View>
            <Switch
              value={loja.ativo}
              onValueChange={(v) => void handlePausar(v)}
              trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
              thumbColor={colors.white}
            />
          </View>

          {/* Imagens */}
          <Legenda>Identidade visual</Legenda>
          <Cartao>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => trocarImagem('logo')} activeOpacity={0.8}>
                {loja.logo_url ? (
                  <Image source={{ uri: loja.logo_url }} style={{ width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }} />
                ) : (
                  <Placeholder rotulo="Logo" largura={72} altura={72} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => trocarImagem('banner')} activeOpacity={0.8} style={{ flex: 1 }}>
                {loja.banner_url ? (
                  <Image source={{ uri: loja.banner_url }} style={{ width: '100%', height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }} />
                ) : (
                  <Placeholder rotulo="Banner" altura={72} />
                )}
              </TouchableOpacity>
            </View>
            {salvando?.startsWith('img') && (
              <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginTop: 8 }}>
                Enviando imagem…
              </Text>
            )}
          </Cartao>

          {/* Dados gerais */}
          <Legenda>Dados</Legenda>
          <Cartao>
            <CampoTexto rotulo="Nome da loja" valor={nome} aoMudar={setNome} />
            <CampoTexto rotulo="Descrição" valor={descricao} aoMudar={setDescricao} multiline />
            <CampoTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} teclado="numeric" placeholder="(37) 9…" />
            <BotaoPrimario
              rotulo="Salvar dados"
              carregando={salvando === 'dados'}
              onPress={() =>
                void salvar('dados', () =>
                  atualizarDadosGerais(loja.id, { nome, descricao: descricao || null, telefone: telefone || null })
                )
              }
            />
          </Cartao>

          {/* Horários — grade semanal */}
          <Legenda>Horários de funcionamento</Legenda>
          <Cartao>
            {DIAS.map(({ key, rotulo }) => {
              const dia = horarios[key] ?? null
              const aberto = dia !== null && dia !== undefined
              return (
                <View
                  key={key}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: spacing.sm }}
                >
                  <Text style={{ width: 76, color: colors.ink, fontWeight: '600', fontSize: typography.body.size }}>
                    {rotulo}
                  </Text>
                  <Switch
                    value={aberto}
                    onValueChange={(v) => setDia(key, v ? { abre: '08:00', fecha: '18:00' } : null)}
                    trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                    thumbColor={colors.white}
                  />
                  {aberto ? (
                    <View style={{ flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
                      <CampoHora valor={dia.abre} aoMudar={(t) => setDia(key, { abre: t, fecha: dia.fecha })} />
                      <Text style={{ color: colors.inkSoft, alignSelf: 'center' }}>–</Text>
                      <CampoHora valor={dia.fecha} aoMudar={(t) => setDia(key, { abre: dia.abre, fecha: t })} />
                    </View>
                  ) : (
                    <Text style={{ flex: 1, textAlign: 'right', color: colors.inkSoft, fontSize: typography.bodySm.size }}>
                      Fechado
                    </Text>
                  )}
                </View>
              )
            })}
            <View style={{ height: spacing.sm }} />
            <BotaoPrimario
              rotulo="Salvar horários"
              carregando={salvando === 'horarios'}
              onPress={() => void salvar('horarios', () => atualizarHorarios(loja.id, horarios))}
            />
          </Cartao>

          {/* Entrega */}
          <Legenda>Entrega</Legenda>
          <Cartao>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <CampoTexto rotulo="Taxa (R$)" valor={taxaReais} aoMudar={setTaxaReais} teclado="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <CampoTexto rotulo="Tempo (min)" valor={tempo} aoMudar={setTempo} teclado="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <CampoTexto rotulo="Raio (km)" valor={raio} aoMudar={setRaio} teclado="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: spacing.sm }}>
              <Text style={{ flex: 1, color: colors.ink, fontSize: typography.body.size, fontWeight: '600' }}>
                Uso entregadores próprios
              </Text>
              <Switch
                value={entregadoresProprios}
                onValueChange={setEntregadoresProprios}
                trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
                thumbColor={colors.white}
              />
            </View>
            <BotaoPrimario
              rotulo="Salvar entrega"
              carregando={salvando === 'entrega'}
              onPress={() =>
                void salvar('entrega', () =>
                  atualizarConfigEntrega(loja.id, {
                    taxa_entrega: Math.round(parseFloat(taxaReais.replace(',', '.') || '0') * 100),
                    tempo_entrega: tempo.trim() ? parseInt(tempo, 10) : null,
                    raio_entrega_km: raio.trim() ? parseFloat(raio.replace(',', '.')) : null,
                    usa_entregadores_proprios: entregadoresProprios,
                  })
                )
              }
            />
          </Cartao>

          {/* Pagamentos (gateway-only, como o Dashboard) */}
          <Legenda>Pagamentos online</Legenda>
          <Cartao>
            <LinhaSwitch rotulo="Pix" valor={aceitaPix} aoMudar={setAceitaPix} />
            <LinhaSwitch rotulo="Cartão online" valor={aceitaCartao} aoMudar={setAceitaCartao} />
            <View style={{ height: spacing.sm }} />
            <BotaoPrimario
              rotulo="Salvar pagamentos"
              carregando={salvando === 'pagamentos'}
              onPress={() =>
                void salvar('pagamentos', () =>
                  atualizarMetodosPagamento(loja.id, { aceita_pix: aceitaPix, aceita_cartao_online: aceitaCartao })
                )
              }
            />
          </Cartao>

          {/* Endereço */}
          <Legenda>Endereço</Legenda>
          <Cartao>
            <CampoTexto rotulo="Rua" valor={endereco.rua ?? ''} aoMudar={(t) => setEndereco({ ...endereco, rua: t })} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <CampoTexto rotulo="Número" valor={endereco.numero ?? ''} aoMudar={(t) => setEndereco({ ...endereco, numero: t })} />
              </View>
              <View style={{ flex: 2 }}>
                <CampoTexto rotulo="Complemento" valor={endereco.complemento ?? ''} aoMudar={(t) => setEndereco({ ...endereco, complemento: t })} />
              </View>
            </View>
            <CampoTexto rotulo="Bairro" valor={endereco.bairro ?? ''} aoMudar={(t) => setEndereco({ ...endereco, bairro: t })} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 2 }}>
                <CampoTexto rotulo="Cidade" valor={endereco.cidade ?? ''} aoMudar={(t) => setEndereco({ ...endereco, cidade: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <CampoTexto rotulo="UF" valor={endereco.estado ?? ''} aoMudar={(t) => setEndereco({ ...endereco, estado: t })} />
              </View>
            </View>
            <CampoTexto rotulo="CEP" valor={endereco.cep ?? ''} aoMudar={(t) => setEndereco({ ...endereco, cep: t })} teclado="numeric" />
            <BotaoPrimario
              rotulo="Salvar endereço"
              carregando={salvando === 'endereco'}
              onPress={() => void salvar('endereco', () => atualizarEndereco(loja.id, endereco))}
            />
          </Cartao>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function CampoHora({ valor, aoMudar }: { valor: string; aoMudar: (t: string) => void }) {
  const { colors, radius, typography } = partnerDesign
  return (
    <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: 8 }}>
      <TextInputHora valor={valor} aoMudar={aoMudar} cor={colors.ink} tamanho={typography.body.size} />
    </View>
  )
}

function TextInputHora({ valor, aoMudar, cor, tamanho }: { valor: string; aoMudar: (t: string) => void; cor: string; tamanho: number }) {
  return (
    <TextInput
      value={valor}
      onChangeText={(t) => {
        // normaliza para HH:MM enquanto digita
        const limpo = t.replace(/[^\d:]/g, '').slice(0, 5)
        aoMudar(limpo)
      }}
      placeholder="08:00"
      keyboardType="numbers-and-punctuation"
      style={{ color: cor, fontSize: tamanho, width: 56, height: 34, textAlign: 'center' }}
    />
  )
}

function LinhaSwitch({ rotulo, valor, aoMudar }: { rotulo: string; valor: boolean; aoMudar: (v: boolean) => void }) {
  const { colors, typography } = partnerDesign
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ flex: 1, color: colors.ink, fontSize: typography.body.size, fontWeight: '600' }}>
        {rotulo}
      </Text>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
        thumbColor={colors.white}
      />
    </View>
  )
}

function Placeholder({ rotulo, largura, altura }: { rotulo: string; largura?: number; altura: number }) {
  const { colors, radius, typography } = partnerDesign
  return (
    <View
      style={{
        width: largura ?? '100%',
        height: altura,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <PartnerIcon name="camera" size={16} color={colors.inkSoft} />
      <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, fontWeight: '700' }}>{rotulo}</Text>
    </View>
  )
}
