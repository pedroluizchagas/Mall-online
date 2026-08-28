// supabase/functions/delete-account/index.ts
//
// Exclusão de conta do consumidor — exigência da App Store (5.1.1(v)) e do
// Google Play para qualquer app que permite criar conta dentro dele.
//
// NÃO é um DELETE na linha de `consumers`: `orders.consumer_id` a referencia
// e os pedidos ficam por obrigação fiscal/contábil. O que se apaga é o que
// identifica a pessoa; o histórico sobrevive sem dono, aparecendo como
// "Conta excluída" para o lojista e no admin.
//
// Ordem das operações importa:
//   1. anonimiza `consumers`  — se falhar, nada foi perdido, o usuário
//      tenta de novo com a conta ainda inteira;
//   2. apaga o avatar do bucket (best-effort);
//   3. deleta o auth user     — o FK ON DELETE SET NULL (migration
//      20260828120000) desliga a linha anonimizada sem tocar nos pedidos.
//
// Inverter 1 e 3 deixaria uma janela em que o login já não existe mas os
// dados pessoais ainda estão lá, sem ninguém autorizado a apagá-los.
//
// Body: nenhum. A identidade vem do JWT no header Authorization.
import {
  getSupabaseAdmin,
  getAuthenticatedUser,
  corsHeaders,
} from '../helpers/auth.ts'

const BUCKET_AVATARS = 'consumer-avatars'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    // O JWT só prova que existe um usuário — não diz QUAL app o emitiu.
    // Sem esta checagem, um lojista ou entregador com sessão válida
    // conseguiria chamar esta rota e destruir a própria operação:
    // `tenants.user_id` e `couriers.user_id` têm ON DELETE CASCADE para
    // auth.users, e de tenants cascateiam stores, produtos, posts. Este
    // endpoint é EXCLUSIVO do consumidor.
    const [{ data: tenant }, { data: courier }] = await Promise.all([
      supabase.from('tenants').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('couriers').select('id').eq('user_id', user.id).maybeSingle(),
    ])

    if (tenant || courier) {
      return new Response(
        JSON.stringify({
          error:
            'Esta conta é de lojista ou entregador e não pode ser excluída por aqui. Fale com o suporte.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (consumer) {
      const { error: erroAnonimizacao } = await supabase
        .from('consumers')
        .update({
          nome: 'Conta excluída',
          telefone: null,
          cpf: null,
          data_nascimento: null,
          foto_url: null,
          enderecos: [],
        })
        .eq('id', consumer.id)

      if (erroAnonimizacao) {
        throw new Error('Não foi possível remover seus dados. Tente novamente.')
      }
    }

    // Best-effort: um arquivo órfão no bucket é bem menos grave do que a
    // exclusão falhar por causa dele. A URL já saiu da tabela acima.
    try {
      await supabase.storage
        .from(BUCKET_AVATARS)
        .remove([`${user.id}/perfil.jpg`])
    } catch {
      // Ignorado de propósito.
    }

    // Os push_tokens saem sozinhos: user_id tem ON DELETE CASCADE para
    // auth.users (migration 011), então o delete abaixo os leva junto.
    const { error: erroAuth } = await supabase.auth.admin.deleteUser(user.id)

    if (erroAuth) {
      // Os dados pessoais JÁ FORAM apagados neste ponto — dizer "tente
      // novamente" seria mentira, porque não há mais nada a apagar e uma
      // segunda tentativa cairia no mesmo erro. O cliente encerra a sessão
      // do mesmo jeito; o que resta é um login órfão para o suporte.
      //
      // Causa mais provável se isto disparar em produção: a migration
      // 20260828120000 não foi aplicada, então `consumers.user_id` ainda
      // tem o ON DELETE CASCADE original e o FK de `orders` bloqueia a
      // remoção justamente para quem já pediu alguma coisa.
      return new Response(
        JSON.stringify({
          ok: false,
          dados_removidos: true,
          error:
            'Seus dados pessoais foram apagados, mas o login não pôde ser removido. Fale com o suporte para concluir.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
})
