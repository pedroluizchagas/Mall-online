'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

const schemaCadastro = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
})

export async function login(formData: FormData) {
  const dados = schemaLogin.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
  })

  if (!dados.success) {
    return { erro: dados.error.errors[0].message }
  }

  const supabase = createSupabaseServer()

  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  })

  if (error) {
    return { erro: 'Email ou senha incorretos' }
  }

  // Verificar se tenant existe e onboarding está completo
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_onboarding_ok')
    .single()

  if (!tenant) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

export async function cadastro(formData: FormData) {
  const dados = schemaCadastro.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
    nome: formData.get('nome'),
  })

  if (!dados.success) {
    return { erro: dados.error.errors[0].message }
  }

  const supabase = createSupabaseServer()

  const { error } = await supabase.auth.signUp({
    email: dados.data.email,
    password: dados.data.senha,
    options: {
      data: {
        nome: dados.data.nome,
        role: 'tenant',
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { erro: 'Este email já está cadastrado' }
    }
    return { erro: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/onboarding')
}

export async function logout() {
  const supabase = createSupabaseServer()
  await supabase.auth.signOut()
  redirect('/entrar')
}
