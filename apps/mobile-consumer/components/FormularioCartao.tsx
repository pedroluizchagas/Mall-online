import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Input } from '@/components/ui/Input'
import { consumerDesign } from '@/lib/consumer-design'

const { colors } = consumerDesign

export interface DadosCartao {
  number: string
  holder_name: string
  exp_month: number
  exp_year: number
  cvv: string
}

interface Props {
  onChange: (dados: DadosCartao | null) => void
}

function passaLuhn(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '')
  if (digitos.length < 13 || digitos.length > 19) return false

  let soma = 0
  let alternar = false
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = parseInt(digitos[i], 10)
    if (alternar) {
      n *= 2
      if (n > 9) n -= 9
    }
    soma += n
    alternar = !alternar
  }
  return soma % 10 === 0
}

function formatarNumero(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 19)
  return digitos.replace(/(.{4})/g, '$1 ').trim()
}

function formatarValidade(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4)
  if (digitos.length < 3) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

export function FormularioCartao({ onChange }: Props) {
  const [numero, setNumero] = useState('')
  const [titular, setTitular] = useState('')
  const [validade, setValidade] = useState('')
  const [cvv, setCvv] = useState('')
  const [tocado, setTocado] = useState({
    numero: false,
    titular: false,
    validade: false,
    cvv: false,
  })

  const numeroLimpo = numero.replace(/\D/g, '')
  const numeroValido = passaLuhn(numeroLimpo)

  const [mesStr, anoStr] = validade.split('/')
  const expMonth = parseInt(mesStr ?? '', 10)
  const expYearShort = parseInt(anoStr ?? '', 10)
  const expYear =
    Number.isFinite(expYearShort) && anoStr?.length === 2
      ? 2000 + expYearShort
      : NaN

  const validadeOk = (() => {
    if (!Number.isFinite(expMonth) || !Number.isFinite(expYear)) return false
    if (expMonth < 1 || expMonth > 12) return false
    const agora = new Date()
    const ultimoDiaDoMes = new Date(expYear, expMonth, 0, 23, 59, 59)
    return ultimoDiaDoMes >= agora
  })()

  const titularOk = titular.trim().length >= 3
  const cvvOk = /^\d{3,4}$/.test(cvv)

  const valido = numeroValido && titularOk && validadeOk && cvvOk

  useEffect(() => {
    if (valido) {
      onChange({
        number: numeroLimpo,
        holder_name: titular.trim().toUpperCase(),
        exp_month: expMonth,
        exp_year: expYear,
        cvv,
      })
    } else {
      onChange(null)
    }
  }, [valido, numeroLimpo, titular, expMonth, expYear, cvv])

  const erroNumero =
    tocado.numero && !numeroValido ? 'Número de cartão inválido.' : undefined
  const erroTitular =
    tocado.titular && !titularOk ? 'Informe o nome impresso no cartão.' : undefined
  const erroValidade =
    tocado.validade && !validadeOk ? 'Validade inválida.' : undefined
  const erroCvv = tocado.cvv && !cvvOk ? 'CVV inválido.' : undefined

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.inkMuted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Dados do cartão
      </Text>

      <View style={{ gap: 12 }}>
        <Input
          valor={numero}
          aoMudar={(v) => {
            setNumero(formatarNumero(v))
            if (!tocado.numero) setTocado((t) => ({ ...t, numero: true }))
          }}
          placeholder="Número do cartão"
          tipo="numero"
          erro={erroNumero}
          maxLength={23}
        />

        <Input
          valor={titular}
          aoMudar={setTitular}
          placeholder="Nome impresso no cartão"
          autoCapitalize="characters"
          erro={erroTitular}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              valor={validade}
              aoMudar={(v) => {
                setValidade(formatarValidade(v))
                if (!tocado.validade)
                  setTocado((t) => ({ ...t, validade: true }))
              }}
              placeholder="MM/AA"
              tipo="numero"
              erro={erroValidade}
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              valor={cvv}
              aoMudar={(v) => {
                setCvv(v.replace(/\D/g, '').slice(0, 4))
                if (!tocado.cvv) setTocado((t) => ({ ...t, cvv: true }))
              }}
              placeholder="CVV"
              tipo="senha"
              erro={erroCvv}
              maxLength={4}
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: colors.inkSoft,
            fontWeight: '500',
            lineHeight: 18,
          }}
        >
          Seus dados são tokenizados diretamente pela Pagar.me. Nem o app nem
          nossos servidores armazenam o número do cartão.
        </Text>
      </View>
    </View>
  )
}
