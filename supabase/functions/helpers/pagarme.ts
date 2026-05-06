// helpers/pagarme.ts — cliente HTTP + autenticação Pagar.me + verificação HMAC
//
// Documentado em docs/06 e docs/30. Reutilizado por todas as Edge Functions
// que falam com a API Pagar.me (onboard-courier, create-pagarme-order,
// transfer-to-courier, pagarme-webhook).

export const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

export function pagarmeHeaders(): Record<string, string> {
  const apiKey = Deno.env.get('PAGARME_API_KEY')
  if (!apiKey) throw new Error('PAGARME_API_KEY não configurada')
  const encoded = btoa(`${apiKey}:`)
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

export interface PagarmeRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // permite headers extras (ex: idempotency-key)
  headers?: Record<string, string>
}

export interface PagarmeResponse<T = unknown> {
  ok: boolean
  status: number
  data: T
}

// Cliente HTTP fino sobre fetch — concentra base URL, autenticação e parsing JSON.
// Não lança em respostas !ok: deixa o caller decidir o tratamento (a maioria das
// functions já formata a mensagem de erro com o JSON retornado pelo Pagar.me).
export async function pagarmeRequest<T = unknown>(
  path: string,
  options: PagarmeRequestOptions = {},
): Promise<PagarmeResponse<T>> {
  const { method = 'GET', body, headers = {} } = options

  const res = await fetch(`${PAGARME_BASE_URL}${path}`, {
    method,
    headers: { ...pagarmeHeaders(), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let data: unknown = null
  const text = await res.text()
  if (text.length > 0) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  return { ok: res.ok, status: res.status, data: data as T }
}

// Converte um ArrayBuffer em hexadecimal lowercase.
function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

// Comparação em tempo constante para evitar timing attacks na validação HMAC.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

// Calcula HMAC-SHA256(secret, payload) e retorna o digest em hex.
async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bufferToHex(sig)
}

// Verifica a assinatura HMAC-SHA256 do webhook Pagar.me.
//
// O Pagar.me envia o digest no header `x-hub-signature` (formato
// `sha256=<hex>`). Aceita também o digest cru (sem prefixo) por
// flexibilidade. Comparação em tempo constante.
export async function verifyHmac(
  secret: string,
  payload: string,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  if (!signatureHeader) return false
  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader
  const expected = await hmacSha256Hex(secret, payload)
  return timingSafeEqual(received.toLowerCase(), expected.toLowerCase())
}
