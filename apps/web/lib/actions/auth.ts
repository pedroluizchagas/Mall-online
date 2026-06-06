'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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

  redirect('/')
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

export async function getDadosConta() {
  const supabase = createSupabaseServer()

  const [{ data: { user } }, { data: tenants }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tenants').select('nome_responsavel, email, telefone, cpf_cnpj').limit(1),
  ])

  const tenant = tenants?.[0]

  return {
    email: user?.email ?? tenant?.email ?? '',
    nome: tenant?.nome_responsavel ?? (user?.user_metadata?.nome as string | undefined) ?? '',
    telefone: tenant?.telefone ?? '',
    cpf_cnpj: tenant?.cpf_cnpj ?? '',
  }
}

const schemaDadosPessoais = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido').optional().or(z.literal('')),
})

const schemaSenha = z.object({
  nova_senha: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  confirmacao: z.string(),
}).refine((d) => d.nova_senha === d.confirmacao, {
  message: 'As senhas não coincidem',
  path: ['confirmacao'],
})

export async function atualizarDadosPessoais(
  _prevState: unknown,
  formData: FormData
) {
  const dados = schemaDadosPessoais.safeParse({
    nome: formData.get('nome'),
    telefone: formData.get('telefone') || '',
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const supabase = createSupabaseServer()

  const [{ error: errAuth }, { error: errTenant }] = await Promise.all([
    supabase.auth.updateUser({ data: { nome: dados.data.nome } }),
    supabase.from('tenants').update({
      nome_responsavel: dados.data.nome,
      ...(dados.data.telefone ? { telefone: dados.data.telefone } : {}),
    }).eq('id', (await supabase.from('tenants').select('id').limit(1)).data?.[0]?.id ?? ''),
  ])

  if (errAuth || errTenant) return { erro: 'Erro ao atualizar dados. Tente novamente.' }

  revalidatePath('/minha-conta')
  return { sucesso: true }
}

export async function alterarSenha(
  _prevState: unknown,
  formData: FormData
) {
  const dados = schemaSenha.safeParse({
    nova_senha: formData.get('nova_senha'),
    confirmacao: formData.get('confirmacao'),
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const supabase = createSupabaseServer()
  const { error } = await supabase.auth.updateUser({ password: dados.data.nova_senha })

  if (error) return { erro: 'Erro ao alterar senha. Tente novamente.' }

  return { sucesso: true }
}
