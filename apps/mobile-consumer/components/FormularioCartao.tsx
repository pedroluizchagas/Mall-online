import { useEffect, useState } from 'react'
import { View, Text, TextInput } from 'react-native'

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
    tocado.numero && !numeroValido ? 'Número de cartão inválido.' : null
  const erroTitular =
    tocado.titular && !titularOk ? 'Informe o nome impresso no cartão.' : null
  const erroValidade =
    tocado.validade && !validadeOk ? 'Validade inválida.' : null
  const erroCvv = tocado.cvv && !cvvOk ? 'CVV inválido.' : null

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Dados do cartão
      </Text>

      <View className="gap-3">
        <View>
          <TextInput
            value={numero}
            onChangeText={(v) => setNumero(formatarNumero(v))}
            onBlur={() => setTocado((t) => ({ ...t, numero: true }))}
            placeholder="Número do cartão"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            autoComplete="cc-number"
            className={`border rounded-xl px-4 py-3 text-base text-gray-700 ${
              erroNumero ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {erroNumero && (
            <Text className="text-xs text-red-500 mt-1">{erroNumero}</Text>
          )}
        </View>

        <View>
          <TextInput
            value={titular}
            onChangeText={setTitular}
            onBlur={() => setTocado((t) => ({ ...t, titular: true }))}
            placeholder="Nome impresso no cartão"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoComplete="cc-name"
            className={`border rounded-xl px-4 py-3 text-base text-gray-700 ${
              erroTitular ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {erroTitular && (
            <Text className="text-xs text-red-500 mt-1">{erroTitular}</Text>
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextInput
              value={validade}
              onChangeText={(v) => setValidade(formatarValidade(v))}
              onBlur={() => setTocado((t) => ({ ...t, validade: true }))}
              placeholder="MM/AA"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              autoComplete="cc-exp"
              className={`border rounded-xl px-4 py-3 text-base text-gray-700 ${
                erroValidade ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {erroValidade && (
              <Text className="text-xs text-red-500 mt-1">{erroValidade}</Text>
            )}
          </View>
          <View className="flex-1">
            <TextInput
              value={cvv}
              onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
              onBlur={() => setTocado((t) => ({ ...t, cvv: true }))}
              placeholder="CVV"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              autoComplete="cc-csc"
              secureTextEntry
              className={`border rounded-xl px-4 py-3 text-base text-gray-700 ${
                erroCvv ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {erroCvv && (
              <Text className="text-xs text-red-500 mt-1">{erroCvv}</Text>
            )}
          </View>
        </View>

        <Text className="text-xs text-gray-400 mt-1">
          Seus dados são tokenizados diretamente pela Pagar.me. Nem o app nem
          nossos servidores armazenam o número do cartão.
        </Text>
      </View>
    </View>
  )
}
