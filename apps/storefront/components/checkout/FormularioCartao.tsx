'use client'

import { useEffect, useState } from 'react'

/**
 * FormularioCartao — port RN→DOM de
 * apps/mobile-consumer/components/FormularioCartao.tsx (Stage 3d).
 *
 * Mesma validação (Luhn + validade + CVV), mesmo contrato `onChange`
 * (`DadosCartao | null`). O PAN só existe neste componente client e é
 * passado a `tokenizarCartao` (browser→pagar.me) — nunca ao nosso servidor.
 */

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

const inputBase =
  'h-12 w-full rounded-md border bg-surface px-4 text-sm font-medium text-ink outline-none placeholder:text-ink-soft focus:border-ink'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valido, numeroLimpo, titular, expMonth, expYear, cvv])

  const erroNumero =
    tocado.numero && !numeroValido ? 'Número de cartão inválido.' : undefined
  const erroTitular =
    tocado.titular && !titularOk
      ? 'Informe o nome impresso no cartão.'
      : undefined
  const erroValidade =
    tocado.validade && !validadeOk ? 'Validade inválida.' : undefined
  const erroCvv = tocado.cvv && !cvvOk ? 'CVV inválido.' : undefined

  return (
    <div className="px-6 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
        Dados do cartão
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <input
            inputMode="numeric"
            value={numero}
            onChange={(e) => {
              setNumero(formatarNumero(e.target.value))
              if (!tocado.numero) setTocado((t) => ({ ...t, numero: true }))
            }}
            placeholder="Número do cartão"
            maxLength={23}
            className={`${inputBase} ${
              erroNumero ? 'border-danger' : 'border-line'
            }`}
          />
          {erroNumero && (
            <p className="mt-1 text-xs font-semibold text-danger">
              {erroNumero}
            </p>
          )}
        </div>

        <div>
          <input
            value={titular}
            onChange={(e) => {
              setTitular(e.target.value)
              if (!tocado.titular) setTocado((t) => ({ ...t, titular: true }))
            }}
            placeholder="Nome impresso no cartão"
            autoCapitalize="characters"
            className={`${inputBase} uppercase ${
              erroTitular ? 'border-danger' : 'border-line'
            }`}
          />
          {erroTitular && (
            <p className="mt-1 text-xs font-semibold text-danger">
              {erroTitular}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              inputMode="numeric"
              value={validade}
              onChange={(e) => {
                setValidade(formatarValidade(e.target.value))
                if (!tocado.validade)
                  setTocado((t) => ({ ...t, validade: true }))
              }}
              placeholder="MM/AA"
              maxLength={5}
              className={`${inputBase} ${
                erroValidade ? 'border-danger' : 'border-line'
              }`}
            />
            {erroValidade && (
              <p className="mt-1 text-xs font-semibold text-danger">
                {erroValidade}
              </p>
            )}
          </div>
          <div className="flex-1">
            <input
              inputMode="numeric"
              type="password"
              value={cvv}
              onChange={(e) => {
                setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                if (!tocado.cvv) setTocado((t) => ({ ...t, cvv: true }))
              }}
              placeholder="CVV"
              maxLength={4}
              className={`${inputBase} ${
                erroCvv ? 'border-danger' : 'border-line'
              }`}
            />
            {erroCvv && (
              <p className="mt-1 text-xs font-semibold text-danger">
                {erroCvv}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs font-medium leading-relaxed text-ink-soft">
          Seus dados são tokenizados diretamente pela Pagar.me. Nem o site nem
          nossos servidores armazenam o número do cartão.
        </p>
      </div>
    </div>
  )
}
