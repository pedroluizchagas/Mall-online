/**
 * Seed das categorias globais do Mallevo (20 categorias).
 *
 * Fonte da verdade: docs/dashboard-templates/07-categorias-e-pisos.md
 * Cada slug mapeia 1:1 para um template em packages/lib/templates/mapping.ts.
 *
 * Idempotente: faz upsert por slug. Pré-requisito: aplicar a migration
 *   20260507000001_migration_014_categories_slug_imutabilidade.sql
 * antes de rodar este seed (a coluna `slug` precisa existir).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars — certifique-se de passar .env.local:', {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  })
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

const categorias = [
  { slug: 'alimentos-bebidas',      nome: 'Alimentos & Bebidas',       icone: '🍽️',  ordem: 1 },
  { slug: 'vestuario-calcados',     nome: 'Vestuário & Calçados',      icone: '👗',  ordem: 2 },
  { slug: 'acessorios-joias',       nome: 'Acessórios & Joias',        icone: '👜',  ordem: 3 },
  { slug: 'farmacia-medicamentos',  nome: 'Farmácia & Medicamentos',   icone: '💊',  ordem: 4 },
  { slug: 'beleza-cosmeticos',      nome: 'Beleza & Cosméticos',       icone: '💄',  ordem: 5 },
  { slug: 'saloes-estetica',        nome: 'Salões & Estética',         icone: '✂️',  ordem: 6 },
  { slug: 'saude-bem-estar',        nome: 'Saúde & Bem-Estar',         icone: '🩺',  ordem: 7 },
  { slug: 'pet-shop',               nome: 'Pet Shop',                  icone: '🐶',  ordem: 8 },
  { slug: 'veterinaria',            nome: 'Veterinária',               icone: '🏥',  ordem: 9 },
  { slug: 'eletronicos-tecnologia', nome: 'Eletrônicos & Tecnologia',  icone: '📱',  ordem: 10 },
  { slug: 'casa-decoracao',         nome: 'Casa & Decoração',          icone: '🛋️',  ordem: 11 },
  { slug: 'construcao-ferramentas', nome: 'Construção & Ferramentas',  icone: '🔨',  ordem: 12 },
  { slug: 'papelaria-livraria',     nome: 'Papelaria & Livraria',      icone: '📚',  ordem: 13 },
  { slug: 'brinquedos-presentes',   nome: 'Brinquedos & Presentes',    icone: '🎁',  ordem: 14 },
  { slug: 'floricultura-plantas',   nome: 'Floricultura & Plantas',    icone: '🌷',  ordem: 15 },
  { slug: 'automotivo',             nome: 'Automotivo',                icone: '🚗',  ordem: 16 },
  { slug: 'mercado-conveniencia',   nome: 'Mercado & Conveniência',    icone: '🛒',  ordem: 17 },
  { slug: 'oficinas-manutencao',    nome: 'Oficinas & Manutenção',     icone: '🛠️',  ordem: 18 },
  { slug: 'aulas-cursos',           nome: 'Aulas & Cursos',            icone: '🎓',  ordem: 19 },
  { slug: 'outros',                 nome: 'Outros',                    icone: '📦',  ordem: 20 },
]

async function upsertCategoria({ slug, nome, icone, ordem }) {
  const { data: existente, error: selectErr } = await supabase
    .from('categories')
    .select('id')
    .is('tenant_id', null)
    .eq('slug', slug)
    .maybeSingle()

  if (selectErr) {
    throw new Error(`Falha lendo categoria ${slug}: ${selectErr.message}`)
  }

  if (existente?.id) {
    const { error: updateErr } = await supabase
      .from('categories')
      .update({ nome, icone, ordem, ativa: true })
      .eq('id', existente.id)
    if (updateErr) {
      throw new Error(`Falha atualizando categoria ${slug}: ${updateErr.message}`)
    }
    return { slug, action: 'updated' }
  }

  const { error: insertErr } = await supabase
    .from('categories')
    .insert({ tenant_id: null, slug, nome, icone, ordem, ativa: true })
  if (insertErr) {
    throw new Error(`Falha inserindo categoria ${slug}: ${insertErr.message}`)
  }
  return { slug, action: 'inserted' }
}

async function run() {
  console.log(`Seed: aplicando ${categorias.length} categorias globais (idempotente por slug)...`)

  const resultados = []
  for (const categoria of categorias) {
    try {
      const r = await upsertCategoria(categoria)
      resultados.push(r)
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  }

  const inseridas = resultados.filter((r) => r.action === 'inserted').length
  const atualizadas = resultados.filter((r) => r.action === 'updated').length
  console.log(`Seed concluído: ${inseridas} inseridas, ${atualizadas} atualizadas.`)
}

run()
