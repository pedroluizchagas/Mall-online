import type { Endereco, Json, TipoEndereco } from '@mallevo/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { geocodificarEndereco } from '@/lib/geocode'
import type { ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * enderecos.ts — única porta de escrita de `consumers.enderecos`.
 *
 * Antes, três arquivos faziam o próprio `update` na coluna
 * (GerenciarEnderecos removia, SeletorEndereco adicionava, cada um com sua
 * cópia da regra). Com "padrão" na jogada isso deixou de ser aceitável: a
 * invariante "existe exatamente um padrão" não sobrevive espalhada.
 *
 * Todas as funções devolvem `boolean` (gravou ou não) e já atualizam o
 * store — a tela só precisa reagir ao consumer novo.
 */

/** Ícone da lista por tipo de endereço. Sem tipo (legado) cai no alfinete. */
export function iconePorTipo(tipo?: TipoEndereco): ConsumerIconName {
  if (tipo === 'casa') return 'home'
  if (tipo === 'trabalho') return 'briefcase'
  return 'pin'
}

/** Rótulo humano do tipo — usado no apelido sugerido e na acessibilidade. */
export function rotuloPorTipo(tipo?: TipoEndereco): string {
  if (tipo === 'casa') return 'Casa'
  if (tipo === 'trabalho') return 'Trabalho'
  return 'Outro'
}

/**
 * Impõe a invariante do padrão sobre a lista inteira.
 *
 * Uma lista não-vazia SEMPRE tem exatamente um padrão. Se ninguém está
 * marcado (endereços legados, ou o padrão acabou de ser removido), o
 * primeiro assume — melhor um padrão arbitrário que um checkout sem
 * endereço pré-selecionado. Se mais de um está marcado, vence o primeiro.
 */
function normalizarPadrao(lista: Endereco[]): Endereco[] {
  if (lista.length === 0) return lista

  let indicePadrao = lista.findIndex((e) => e.padrao)
  if (indicePadrao < 0) indicePadrao = 0

  return lista.map((e, i) => ({ ...e, padrao: i === indicePadrao }))
}

/** O endereço que o checkout deve pré-selecionar. */
export function enderecoPadrao(lista: Endereco[]): Endereco | null {
  if (lista.length === 0) return null
  return lista.find((e) => e.padrao) ?? lista[0]
}

/**
 * Compara dois endereços pelo que os identifica no mundo, não por
 * referência: toda escrita recria a lista inteira (JSONB), então o objeto
 * que a tela guardou em `useState` deixa de existir na lista nova, mesmo
 * sem nada ter mudado. Por referência, o destaque do selecionado sumiria
 * depois de cadastrar um endereço novo.
 */
export function mesmoEndereco(
  a: Endereco | null | undefined,
  b: Endereco | null | undefined
): boolean {
  if (!a || !b) return false
  return (
    a.rua === b.rua &&
    a.numero === b.numero &&
    a.complemento === b.complemento &&
    a.bairro === b.bairro &&
    a.cidade === b.cidade
  )
}

/**
 * Grava a lista inteira e atualiza o store.
 *
 * A coluna é um JSONB único, então toda escrita é da lista completa — não
 * existe update parcial de um item.
 */
export async function salvarEnderecos(lista: Endereco[]): Promise<boolean> {
  const normalizada = normalizarPadrao(lista)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('consumers')
    .update({ enderecos: normalizada as unknown as Json })
    .eq('user_id', user.id)

  if (error) return false

  const consumer = useAuthStore.getState().consumer
  if (consumer) {
    useAuthStore.getState().setConsumer({ ...consumer, enderecos: normalizada })
  }

  return true
}

/**
 * Completa o endereço com coordenadas antes de gravar.
 *
 * Sem lat/lng o pedido nunca entra em agrupamento de entrega e vira corrida
 * individual (docs/31 §10) — degradação prevista, não falha. Por isso a
 * geocodificação nunca bloqueia o salvamento. Também alimenta o aviso de
 * "endereço longe da sua localização" no checkout.
 */
async function comCoordenadas(endereco: Endereco): Promise<Endereco> {
  const coords = await geocodificarEndereco(endereco)
  if (!coords) return endereco
  return { ...endereco, latitude: coords.latitude, longitude: coords.longitude }
}

export async function adicionarEndereco(
  lista: Endereco[],
  novo: Endereco
): Promise<boolean> {
  const completo = await comCoordenadas(novo)
  // Primeiro endereço da conta já nasce padrão — normalizarPadrao cuida
  // disso, mas explicitar aqui evita depender do efeito colateral.
  const entrada = lista.length === 0 ? { ...completo, padrao: true } : completo
  return salvarEnderecos([...lista, entrada])
}

export async function editarEndereco(
  lista: Endereco[],
  indice: number,
  editado: Endereco
): Promise<boolean> {
  if (indice < 0 || indice >= lista.length) return false

  const anterior = lista[indice]
  // Mudou de lugar? Recoordena. Não mudou? Poupa a chamada ao Nominatim
  // (que tem limite de 1 req/s) e preserva a coordenada já conhecida.
  const mudouLocal =
    anterior.rua !== editado.rua ||
    anterior.numero !== editado.numero ||
    anterior.bairro !== editado.bairro ||
    anterior.cidade !== editado.cidade ||
    anterior.cep !== editado.cep

  const completo = mudouLocal
    ? await comCoordenadas(editado)
    : {
        ...editado,
        latitude: anterior.latitude,
        longitude: anterior.longitude,
      }

  // O padrão é atributo da posição na lista, não do formulário: editar não
  // pode promover nem rebaixar ninguém.
  const nova = [...lista]
  nova[indice] = { ...completo, padrao: anterior.padrao }
  return salvarEnderecos(nova)
}

export async function removerEndereco(
  lista: Endereco[],
  indice: number
): Promise<boolean> {
  // Remover o padrão deixa a lista sem nenhum; normalizarPadrao promove o
  // primeiro que sobrou.
  return salvarEnderecos(lista.filter((_, i) => i !== indice))
}

export async function definirPadrao(
  lista: Endereco[],
  indice: number
): Promise<boolean> {
  if (indice < 0 || indice >= lista.length) return false
  return salvarEnderecos(
    lista.map((e, i) => ({ ...e, padrao: i === indice }))
  )
}
