export const PAGARME_APPID = process.env.EXPO_PUBLIC_PAGARME_APPID!

export interface DadosCartaoTokenizacao {
  number: string
  holder_name: string
  exp_month: number
  exp_year: number
  cvv: string
}

export interface TokenCartao {
  id: string
  type: 'card'
  expires_at?: string
}

export async function tokenizarCartao(
  card: DadosCartaoTokenizacao
): Promise<TokenCartao> {
  if (!PAGARME_APPID) {
    throw new Error('EXPO_PUBLIC_PAGARME_APPID não configurado.')
  }

  const url = `https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(
    PAGARME_APPID
  )}`

  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'card',
      card: {
        number: card.number,
        holder_name: card.holder_name,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvv: card.cvv,
      },
    }),
  })

  if (!resposta.ok) {
    const detalhes = await resposta.text().catch(() => '')
    throw new Error(
      `Não foi possível validar o cartão (${resposta.status}). ${detalhes.slice(0, 200)}`
    )
  }

  const json = (await resposta.json()) as TokenCartao
  if (!json.id) throw new Error('Resposta inválida da Pagar.me.')
  return json
}
