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
  const categories = [
    { nome: 'Vestuário', icone: '👕', ordem: 1, ativa: true },
    { nome: 'Eletrônicos', icone: '📱', ordem: 2, ativa: true },
    { nome: 'Alimentos e Bebidas', icone: '🍔', ordem: 3, ativa: true },
    { nome: 'Serviços', icone: '🔧', ordem: 4, ativa: true },
    { nome: 'Saúde e Beleza', icone: '💄', ordem: 5, ativa: true },
    { nome: 'Casa e Decoração', icone: '🏠', ordem: 6, ativa: true },
    { nome: 'Pets', icone: '🐶', ordem: 7, ativa: true },
    { nome: 'Outros', icone: '📦', ordem: 8, ativa: true },
  ]

  const { data, error } = await supabase.from('categories').insert(categories).select()
  if (error) {
    console.error("Error inserting categories:", error)
  } else {
    console.log("Categories inserted:", data)
  }
}

run()
