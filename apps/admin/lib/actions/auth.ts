'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const schemaLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha obrigatória'),
})

export async function loginAdmin(formData: FormData) {
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

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.user_metadata?.role !== 'admin') {
    await supabase.auth.signOut()
    return { erro: 'Acesso restrito a administradores.' }
  }

  redirect('/admin')
}

export async function logoutAdmin() {
  const supabase = createSupabaseServer()
  await supabase.auth.signOut()
  redirect('/entrar')
}
