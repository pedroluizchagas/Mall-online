import type { Endereco } from '@mallevo/types'

/**
 * Geocodificação de endereço (docs/31-logistica-de-entrega.md §10).
 *
 * Sem latitude/longitude o pedido nunca entra em agrupamento — vira entrega
 * individual. Não é falha: é a degradação graciosa prevista, porque não dá
 * para prometer proximidade ao consumidor sem saber onde ele está. Mas cada
 * endereço sem coordenada é uma alavanca de custo perdida, então vale
 * geocodificar no cadastro, onde o usuário ainda pode corrigir.
 *
 * Usa Nominatim (OpenStreetMap) por HTTP, sem chave e sem permissão de
 * localização — mesma abordagem do ViaCEP já usado no cadastro. Coerente
 * com o OSRM self-hosted previsto para a Fase 2, que roda sobre os mesmos
 * dados; quando o OSRM subir, o ideal é apontar para um Nominatim próprio
 * e remover a dependência do serviço público.
 *
 * Política de uso do Nominatim público: 1 req/s e User-Agent identificável.
 * Salvar endereço é ação rara e iniciada pelo usuário, bem dentro do limite.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const TIMEOUT_MS = 4000

export interface Coordenadas {
  latitude: number
  longitude: number
}

export async function geocodificarEndereco(
  endereco: Pick<Endereco, 'rua' | 'numero' | 'bairro' | 'cidade' | 'estado' | 'cep'>,
): Promise<Coordenadas | null> {
  // Consulta estruturada: mais precisa que jogar a string inteira em `q`,
  // principalmente para numeração em cidade do interior.
  const params = new URLSearchParams({
    street: `${endereco.numero} ${endereco.rua}`.trim(),
    city: endereco.cidade || 'Divinópolis',
    state: endereco.estado || 'MG',
    country: 'Brasil',
    format: 'jsonv2',
    limit: '1',
  })

  if (endereco.cep) {
    params.set('postalcode', endereco.cep.replace(/\D/g, ''))
  }

  // Timeout próprio: salvar endereço não pode ficar pendurado num serviço
  // externo. Passado o prazo, salva sem coordenada.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mallevo/1.0 (delivery app; Divinopolis-MG)',
        Accept: 'application/json',
      },
    })

    if (!res.ok) return null

    const dados = await res.json()
    if (!Array.isArray(dados) || dados.length === 0) return null

    const lat = parseFloat(dados[0].lat)
    const lon = parseFloat(dados[0].lon)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    // Guarda de sanidade: descarta resultado fora do Brasil continental.
    // O Nominatim às vezes casa com um topônimo homônimo em outro país
    // quando o endereço está incompleto — e uma coordenada errada é pior
    // que coordenada nenhuma: o agrupamento juntaria pedidos distantes.
    if (lat < -34 || lat > 6 || lon < -74 || lon > -34) return null

    return { latitude: lat, longitude: lon }
  } catch {
    // Rede fora, timeout ou resposta inesperada: segue sem coordenada.
    return null
  } finally {
    clearTimeout(timer)
  }
}
