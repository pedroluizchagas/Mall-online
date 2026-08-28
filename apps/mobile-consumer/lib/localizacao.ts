import * as Location from 'expo-location'

/**
 * localizacao.ts — onde o usuário está AGORA.
 *
 * Só existe para o aviso de "endereço de entrega longe daqui" no checkout.
 * Por isso a regra é absoluta: nada aqui pode bloquear uma compra. Permissão
 * negada, GPS desligado, sinal ruim ou aparelho lento devolvem `null`, e o
 * checkout segue sem perguntar nada — perguntar é um bônus, vender não é.
 */

export interface Coordenadas {
  latitude: number
  longitude: number
}

/** Raio médio da Terra em metros. */
const RAIO_TERRA_M = 6_371_000

/**
 * Distância em linha reta entre dois pontos (Haversine).
 *
 * Mesma fórmula que a logística usa para agrupar entregas (docs/31 §10).
 * Linha reta subestima a distância real de rua, o que aqui é a direção
 * segura do erro: só dispara o aviso quando está mesmo longe.
 */
export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180

  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const lat1 = rad(a.latitude)
  const lat2 = rad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Além disso não vale a pena esperar: o usuário está com o dedo no botão. */
const TIMEOUT_MS = 5000

/**
 * Localização atual, ou `null` se não der para saber.
 *
 * Nunca lança. `Accuracy.Balanced` (~100 m) basta de sobra para uma
 * comparação com limiar de quilômetros e evita acender o GPS de precisão
 * fina, que é lento e come bateria.
 */
export async function obterLocalizacaoAtual(): Promise<Coordenadas | null> {
  try {
    const permissao = await Location.getForegroundPermissionsAsync()

    // Pede uma vez; se já foi negada antes, `canAskAgain` é falso e o
    // sistema nem mostraria o diálogo — não insistir.
    if (!permissao.granted) {
      if (!permissao.canAskAgain) return null
      const novo = await Location.requestForegroundPermissionsAsync()
      if (!novo.granted) return null
    }

    // O expo-location não tem timeout próprio nesta API: sem a corrida, um
    // aparelho sem fix de GPS deixaria o botão de pagar pendurado.
    const posicao = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ])

    if (!posicao) return null

    return {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    }
  } catch {
    return null
  }
}
