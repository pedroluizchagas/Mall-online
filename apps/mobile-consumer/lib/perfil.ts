import type { User } from '@supabase/supabase-js'
import type { Endereco } from '@mallevo/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * perfil.ts — garante que existe uma linha em `consumers` para o usuário
 * logado e hidrata o store com ela.
 *
 * Por que EXISTE: nada no app criava esse registro. A policy
 * `consumers_insert_proprio` estava lá desde a migration 006 esperando ser
 * usada, mas nem o signup nem o primeiro login inseriam a linha — e sem ela
 * `create-pagarme-order` falha com "Consumidor não encontrado" na hora de
 * pagar, ou seja, o usuário só descobre no fim do funil.
 *
 * Por que RODA NO BOOT: até aqui `setConsumer` só acontecia no
 * pull-to-refresh da aba Perfil, então a saudação da Home (`consumer?.nome`)
 * nascia vazia em toda sessão nova.
 *
 * Nunca lança: falha de rede aqui não pode segurar o boot. O app degrada
 * para "sem perfil carregado", que é o estado que já existia antes.
 */

/** Colunas do perfil — uma lista só, usada aqui e no refresh da aba Perfil. */
export const COLUNAS_CONSUMER =
  'id, nome, telefone, foto_url, cpf, data_nascimento, enderecos'

interface LinhaConsumer {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  cpf: string | null
  data_nascimento: string | null
  enderecos: unknown
}

/** Normaliza a linha do banco para o shape do store. */
export function paraPerfil(linha: LinhaConsumer) {
  return {
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone,
    foto_url: linha.foto_url,
    cpf: linha.cpf,
    data_nascimento: linha.data_nascimento,
    // A coluna é JSONB: qualquer coisa pode estar lá. Sem esta guarda, um
    // `null` legado viraria `.map is not a function` na listagem.
    enderecos: Array.isArray(linha.enderecos)
      ? (linha.enderecos as Endereco[])
      : [],
  }
}

async function buscar(userId: string) {
  const { data } = await supabase
    .from('consumers')
    .select(COLUNAS_CONSUMER)
    .eq('user_id', userId)
    .maybeSingle()

  return (data as LinhaConsumer | null) ?? null
}

/**
 * Carrega o perfil do usuário no store, criando-o se ainda não existir.
 *
 * O nome sai do `user_metadata` gravado no signup (ver app/(auth)/entrar.tsx);
 * contas antigas, criadas antes de o cadastro pedir nome, caem no trecho
 * antes do @ do email.
 */
export async function garantirConsumer(user: User): Promise<void> {
  try {
    let linha = await buscar(user.id)

    if (!linha) {
      const metadata = user.user_metadata ?? {}
      const nome =
        (typeof metadata.nome === 'string' && metadata.nome.trim()) ||
        user.email?.split('@')[0] ||
        'Cliente'
      const telefone =
        typeof metadata.telefone === 'string' && metadata.telefone.trim()
          ? metadata.telefone.trim()
          : null

      const { error } = await supabase
        .from('consumers')
        .insert({ user_id: user.id, nome, telefone })

      // Corrida entre duas telas montando ao mesmo tempo: o UNIQUE em
      // user_id barra a segunda inserção (23505). Não é erro — o re-select
      // abaixo acha a linha que a primeira criou.
      if (error && error.code !== '23505') return

      linha = await buscar(user.id)
    }

    if (linha) {
      useAuthStore.getState().setConsumer(paraPerfil(linha))
    }
  } catch (error) {
    console.error('Falha ao carregar perfil do consumidor:', error)
  }
}
