import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars — certifique-se de passar .env.local:", {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY})
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

async function run() {
  // Delete existing plans
  const { error: deleteError } = await supabase.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000') // delete all
  if (deleteError) {
    console.error("Error deleting old plans:", deleteError)
  }

  const plans = [
    {
      nome: 'Básico',
      descricao: 'Para começar seu negócio online.',
      preco_mensal: 14790,
      ativo: true,
      stripe_price_id: null,
      max_lojas: 1,
      max_produtos: 50,
      tem_estoque: true,
      tem_relatorios: false,
      tem_antecipacao: false
    },
    {
      nome: 'Profissional',
      descricao: 'Para negócios em crescimento.',
      preco_mensal: 28790,
      ativo: true,
      stripe_price_id: null,
      max_lojas: 3,
      max_produtos: 500,
      tem_estoque: true,
      tem_relatorios: true,
      tem_antecipacao: false
    },
    {
      nome: 'Premium',
      descricao: 'O ecossistema completo para grandes lojistas.',
      preco_mensal: 69990,
      ativo: true,
      stripe_price_id: null,
      max_lojas: 10,
      max_produtos: 5000,
      tem_estoque: true,
      tem_relatorios: true,
      tem_antecipacao: true
    },
    {
      nome: 'Enterprise',
      descricao: 'Para operações sob medida e grande escala.',
      preco_mensal: 0,
      ativo: true,
      stripe_price_id: null,
      max_lojas: 999,
      max_produtos: 99999,
      tem_estoque: true,
      tem_relatorios: true,
      tem_antecipacao: true
    }
  ]

  const { data, error } = await supabase.from('plans').insert(plans).select()
  if (error) {
    console.error("Error inserting plans:", error)
  } else {
    console.log("Plans inserted:", data)
  }
}

run()
