/**
 * validacao.ts — máscaras e validadores dos campos de cadastro.
 *
 * Funções puras, sem dependência de React ou Supabase: o que entra é string
 * do teclado, o que sai é string para a tela ou o valor canônico para o
 * banco. A regra é sempre a mesma: a UI mostra formatado, o banco guarda
 * cru (CPF só dígitos, data em ISO).
 */

/** Só os dígitos — usado por todas as máscaras e antes de persistir. */
export function digitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

// ─────────────────────────── CPF ───────────────────────────

/** 000.000.000-00, truncando o excesso conforme o usuário digita. */
export function mascaraCPF(valor: string): string {
  const d = digitos(valor).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/**
 * Valida CPF pelos dois dígitos verificadores.
 *
 * Sequências repetidas (111.111.111-11 e afins) passam no cálculo do DV mas
 * não são CPFs válidos — a Receita as reserva, e são exatamente o que alguém
 * digita para escapar do campo. Rejeitadas explicitamente.
 */
export function validarCPF(valor: string): boolean {
  const d = digitos(valor)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const dv = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) {
      soma += Number(d[i]) * (ate + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

// ──────────────────────── Nascimento ────────────────────────

/** DD/MM/AAAA conforme digita. */
export function mascaraData(valor: string): string {
  const d = digitos(valor).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Idades aceitas. O piso acompanha a idade mínima usual de cadastro. */
const IDADE_MINIMA = 13
const IDADE_MAXIMA = 120

/**
 * Converte DD/MM/AAAA para ISO `YYYY-MM-DD`, ou `null` se não for uma data
 * real. Valida o dia de verdade (31/02 não passa) comparando os campos com
 * o `Date` construído — o JS normaliza silenciosamente 31/02 para 03/03.
 */
export function validarDataNascimento(valor: string): string | null {
  const d = digitos(valor)
  if (d.length !== 8) return null

  const dia = Number(d.slice(0, 2))
  const mes = Number(d.slice(2, 4))
  const ano = Number(d.slice(4, 8))

  const data = new Date(ano, mes - 1, dia)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null
  }

  const hoje = new Date()
  if (data > hoje) return null

  let idade = hoje.getFullYear() - ano
  const passouAniversario =
    hoje.getMonth() > mes - 1 ||
    (hoje.getMonth() === mes - 1 && hoje.getDate() >= dia)
  if (!passouAniversario) idade--

  if (idade < IDADE_MINIMA || idade > IDADE_MAXIMA) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${ano}-${pad(mes)}-${pad(dia)}`
}

/** ISO do banco (`YYYY-MM-DD`) de volta para DD/MM/AAAA na tela. */
export function dataParaExibicao(iso: string | null | undefined): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return ''
  return `${dia}/${mes}/${ano}`
}

// ───────────────────────── Telefone ─────────────────────────

/** (37) 99999-9999 — celular com 9 dígitos ou fixo com 8. */
export function mascaraTelefone(valor: string): string {
  const d = digitos(valor).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Aceita fixo (10) ou celular (11). Vazio é válido: o campo é opcional. */
export function validarTelefone(valor: string): boolean {
  const d = digitos(valor)
  if (d.length === 0) return true
  return d.length === 10 || d.length === 11
}
