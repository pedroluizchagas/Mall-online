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
      throw new Error('Não foi possível excluir o login. Tente novamente.')
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
