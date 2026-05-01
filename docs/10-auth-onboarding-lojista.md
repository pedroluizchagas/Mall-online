# 10 — Auth e Onboarding do Lojista

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O fluxo de entrada do lojista tem duas etapas distintas:

1. Autenticação — criar conta ou fazer login via Supabase Auth
1. Onboarding — wizard de 4 etapas que configura o tenant, a loja,
   o plano e o recebedor Pagar.me (com KYC) para recebimentos

Após o onboarding, o lojista é redirecionado para o dashboard. O acesso ao
dashboard é bloqueado via middleware enquanto o `pagarme_onboarding_status`
não for `active` ou enquanto a assinatura Stripe Billing estiver cancelada.

-----

## FLUXO COMPLETO

```
/cadastro
  → Cria conta no Supabase Auth
  → Redireciona para /onboarding

/onboarding (wizard 4 etapas)
  Etapa 1: Dados do responsável
  Etapa 2: Dados da loja
  Etapa 3: Escolha do plano
  Etapa 4: Configurar recebimentos (Pagar.me)
    → Coleta dados bancários ou chave Pix
    → Chama Edge Function onboard-tenant
       → Cria recipient no Pagar.me + Stripe Customer (Billing)
       → Retorna kyc_url se necessário (PF)
    → Embarca o lojista no link KYC do Pagar.me (ou pula se PJ aprovado)
    → Webhook recipient.status.changed confirma status = 'active'
    → Edge Function create-subscription cria assinatura no Stripe Billing
    → Redireciona para /dashboard

/entrar
  → Login com email e senha
  → Se tenant existe e onboarding completo: /dashboard
  → Se tenant existe mas onboarding incompleto: /onboarding
  → Se tenant não existe: /onboarding
```

-----

## SUPABASE AUTH — CONFIGURACAO

### lib/supabase/server.ts (apps/web)

Cliente para uso em Server Components e Server Actions.

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@mallora/types'

export function createSupabaseServer() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignorado em Server Components (cookies são read-only)
          }
        },
      },
    }
  )
}

export function createSupabaseAdmin() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
```

### lib/supabase/client.ts (apps/web)

Cliente para uso em Client Components.

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@mallora/types'

export function createSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

-----

## SERVER ACTIONS — AUTH

### lib/actions/auth.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
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
    .select('id, pagarme_onboarding_status')
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
```

-----

## PAGINAS DE AUTH

### app/(auth)/entrar/page.tsx

```typescript
import { login } from '@/lib/actions/auth'

export default function PaginaEntrar() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A4D3A]">
            Entrar na plataforma
          </h1>
          <p className="text-gray-500 mt-1">
            Acesse o painel do seu negócio
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              name="senha"
              type="password"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ainda não tem conta?{' '}
          <a href="/cadastro" className="text-[#4CAF82] font-medium">
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  )
}
```

### app/(auth)/cadastro/page.tsx

Estrutura idêntica à página de login, usando a action `cadastro`.
Campos adicionais: nome completo. Após submit, redireciona para `/onboarding`.

-----

## WIZARD DE ONBOARDING

O wizard mantém o estado entre etapas via `useState` no Client Component
pai. Cada etapa é um componente separado. A chamada à Edge Function
acontece apenas na etapa final.

### app/(auth)/onboarding/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { EtapaDadosResponsavel } from './etapas/dados-responsavel'
import { EtapaDadosLoja } from './etapas/dados-loja'
import { EtapaEscolhaPlano } from './etapas/escolha-plano'
import { EtapaConfigurarRecebimentos } from './etapas/configurar-recebimentos'

export interface DadosOnboarding {
  // Etapa 1
  nome_responsavel: string
  cpf_cnpj: string
  telefone: string
  email: string
  // Etapa 2
  nome_loja: string
  categoria_id: string
  endereco: {
    rua: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  }
  // Etapa 3
  plan_id: string
}

export default function PaginaOnboarding() {
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState<Partial<DadosOnboarding>>({})
  const [carregando, setCarregando] = useState(false)

  function avancar(novosDados: Partial<DadosOnboarding>) {
    setDados(prev => ({ ...prev, ...novosDados }))
    setEtapa(prev => prev + 1)
  }

  function voltar() {
    setEtapa(prev => prev - 1)
  }

  async function finalizarOnboarding(dadosFinais: Partial<DadosOnboarding>) {
    setCarregando(true)
    const dadosCompletos = { ...dados, ...dadosFinais }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(dadosCompletos),
        }
      )

      const resultado = await resposta.json()

      if (!resposta.ok) {
        throw new Error(resultado.error)
      }

      // Se o Pagar.me retornou kyc_url, redirecionar para o KYC.
      // Caso contrário, recipient já está apto — ir direto para o dashboard
      // (a assinatura é criada pelo webhook recipient.status.changed).
      if (resultado.kyc_url) {
        window.location.href = resultado.kyc_url
      } else {
        window.location.href = '/onboarding/recebimentos/aguardando'
      }
    } catch (erro: any) {
      alert(erro.message)
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8ED]">
      {/* Barra de progresso */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-[#4CAF82] transition-all duration-300"
          style={{ width: `${(etapa / 4) * 100}%` }}
        />
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Indicador de etapa */}
        <p className="text-sm text-gray-400 mb-2">Etapa {etapa} de 4</p>

        {etapa === 1 && (
          <EtapaDadosResponsavel
            dadosIniciais={dados}
            onAvancar={avancar}
          />
        )}
        {etapa === 2 && (
          <EtapaDadosLoja
            dadosIniciais={dados}
            onAvancar={avancar}
            onVoltar={voltar}
          />
        )}
        {etapa === 3 && (
          <EtapaEscolhaPlano
            dadosIniciais={dados}
            onAvancar={avancar}
            onVoltar={voltar}
          />
        )}
        {etapa === 4 && (
          <EtapaConfigurarRecebimentos
            carregando={carregando}
            onFinalizar={finalizarOnboarding}
            onVoltar={voltar}
          />
        )}
      </div>
    </div>
  )
}
```

-----

## ETAPAS DO WIZARD

### Etapa 1 — Dados do Responsável

Campos: nome completo, CPF ou CNPJ, telefone, email (pré-preenchido
com o email do cadastro, editável).

Validação via Zod:

```typescript
const schema = z.object({
  nome_responsavel: z.string().min(3, 'Nome completo obrigatório'),
  cpf_cnpj: z.string().min(11, 'CPF ou CNPJ inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
})
```

### Etapa 2 — Dados da Loja

Campos: nome da loja, categoria (select com categorias globais do banco),
CEP com preenchimento automático de endereço (via ViaCEP), número,
complemento.

Busca de categorias:

```typescript
const { data: categorias } = await supabase
  .from('categories')
  .select('id, nome, icone')
  .is('tenant_id', null)   // apenas categorias globais
  .eq('ativa', true)
  .order('ordem')
```

Busca de endereço por CEP:

```typescript
async function buscarCep(cep: string) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  const dados = await resposta.json()
  if (dados.erro) throw new Error('CEP não encontrado')
  return {
    rua: dados.logradouro,
    bairro: dados.bairro,
    cidade: dados.localidade,
    estado: dados.uf,
  }
}
```

### Etapa 3 — Escolha do Plano

Busca planos ativos do banco e exibe cards comparativos.

```typescript
const { data: planos } = await supabase
  .from('plans')
  .select('*')
  .eq('ativo', true)
  .order('preco_mensal')
```

Cada card de plano exibe:

- Nome e preço mensal formatado
- Limite de lojas e produtos
- Features disponíveis (estoque, relatórios, antecipação)
- Botão de seleção com estado visual destacado

### Etapa 4 — Configurar Recebimentos (Pagar.me)

Tela com formulário de dados bancários ou chave Pix:

- Tipo de conta (Conta Corrente / Poupança / Pix)
- Banco (autocomplete com lista de bancos brasileiros)
- Agência, conta e dígito verificador
- Ou chave Pix (CPF, CNPJ, email, telefone, aleatória)
- Nome do titular e CPF/CNPJ
- Aceite dos termos de uso do Pagar.me

Após submeter, a Edge Function `onboard-tenant` cria o recipient. Para
Pessoa Física e em alguns casos PJ, o Pagar.me devolve um `kyc_url` para
Prova de Vida e envio de documentos. O frontend redireciona o lojista
para esse URL e, ao terminar, ele é direcionado de volta para
`/onboarding/recebimentos/aguardando`.

-----

## AGUARDANDO ATIVACAO DO RECIPIENT (PAGAR.ME)

### app/(auth)/onboarding/recebimentos/aguardando/page.tsx

Após o lojista concluir o KYC no Pagar.me, ele é redirecionado para esta
página. O webhook `recipient.status.changed` (assíncrono) é quem confirma
o status `active`. A página exibe mensagem de aguardo e faz polling até
confirmar.

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function PaginaAguardandoRecipient() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [mensagem, setMensagem] = useState('Verificando sua conta...')

  useEffect(() => {
    let tentativas = 0
    const maxTentativas = 24 // até 2 minutos

    const intervalo = setInterval(async () => {
      tentativas++

      const { data: tenant } = await supabase
        .from('tenants')
        .select('pagarme_onboarding_status')
        .single()

      if (tenant?.pagarme_onboarding_status === 'active') {
        clearInterval(intervalo)
        setMensagem('Conta ativada! Redirecionando...')
        setTimeout(() => router.push('/dashboard'), 1500)
        return
      }

      if (tenant?.pagarme_onboarding_status === 'refused') {
        clearInterval(intervalo)
        setMensagem(
          'Seu cadastro precisa de ajustes. Entre em contato pelo suporte.'
        )
        return
      }

      if (tentativas >= maxTentativas) {
        clearInterval(intervalo)
        setMensagem(
          'A análise pode demorar alguns minutos a algumas horas. ' +
          'Você receberá um email quando a conta estiver ativa.'
        )
      }
    }, 5000)

    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8ED]">
      <div className="text-center max-w-sm px-4">
        <div className="w-12 h-12 border-4 border-[#4CAF82] border-t-transparent
          rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-[#1A4D3A] mb-2">
          Quase lá!
        </h2>
        <p className="text-gray-500">{mensagem}</p>
      </div>
    </div>
  )
}
```

### app/(auth)/onboarding/recebimentos/kyc/page.tsx

Exibida quando o link KYC do Pagar.me expira. Gera um novo link chamando
a Edge Function `onboard-tenant` novamente (que detecta o tenant existente
e regenera apenas o `kyc_link` via API).

-----

## MIDDLEWARE DE PROTECAO DE ROTAS

O middleware do Next.js (documentado no arquivo 08) já cobre os
redirecionamentos básicos. O layout do grupo `(dashboard)` adiciona
uma verificação adicional de estado da assinatura:

### app/(dashboard)/layout.tsx

```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  // Verificar tenant e onboarding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status')
    .single()

  if (!tenant) redirect('/onboarding')
  if (tenant.pagarme_onboarding_status !== 'active') {
    redirect('/onboarding/recebimentos/aguardando')
  }

  // Verificar assinatura
  const { data: assinatura } = await supabase
    .from('tenant_subscriptions')
    .select('billing_status')
    .single()

  const statusAtivos = ['trial', 'ativa']
  const assinaturaAtiva = assinatura && statusAtivos.includes(assinatura.billing_status)

  return (
    <div className="flex h-screen bg-[#FFF8ED]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Banner de aviso para assinatura em atraso */}
        {assinatura?.billing_status === 'em_atraso' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <p className="text-sm text-amber-800">
              Sua assinatura está com pagamento em atraso.
              <a href="/dashboard/configuracoes/assinatura" className="underline ml-1">
                Regularize agora
              </a>
            </p>
          </div>
        )}

        {/* Bloquear acesso se assinatura cancelada */}
        {!assinaturaAtiva && assinatura?.billing_status === 'cancelada' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <h2 className="text-xl font-semibold text-[#1A4D3A] mb-2">
                Assinatura cancelada
              </h2>
              <p className="text-gray-500 mb-4">
                Reative sua assinatura para continuar usando a plataforma.
              </p>
              <a
                href="/dashboard/configuracoes/assinatura"
                className="bg-[#1A4D3A] text-white px-6 py-2 rounded-lg inline-block"
              >
                Reativar assinatura
              </a>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
```

-----

## VALIDACOES DE ONBOARDING

### lib/validations/onboarding.ts

```typescript
import { z } from 'zod'

export const schemaDadosResponsavel = z.object({
  nome_responsavel: z.string().min(3, 'Nome completo obrigatório'),
  cpf_cnpj: z
    .string()
    .min(11, 'CPF ou CNPJ inválido')
    .max(18, 'CPF ou CNPJ inválido')
    .regex(/^[\d.\-\/]+$/, 'Apenas números e pontuação'),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(15, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
})

export const schemaDadosLoja = z.object({
  nome_loja: z.string().min(2, 'Nome da loja obrigatório'),
  categoria_id: z.string().uuid('Selecione uma categoria'),
  endereco: z.object({
    cep: z.string().length(8, 'CEP inválido'),
    rua: z.string().min(3, 'Rua obrigatória'),
    numero: z.string().min(1, 'Número obrigatório'),
    complemento: z.string().optional(),
    bairro: z.string().min(2, 'Bairro obrigatório'),
    cidade: z.string().min(2, 'Cidade obrigatória'),
    estado: z.string().length(2, 'Estado inválido'),
  }),
})

export const schemaEscolhaPlano = z.object({
  plan_id: z.string().uuid('Selecione um plano'),
})

export type DadosResponsavel = z.infer<typeof schemaDadosResponsavel>
export type DadosLoja = z.infer<typeof schemaDadosLoja>
export type EscolhaPlano = z.infer<typeof schemaEscolhaPlano>
```

-----

## CHECKLIST DO FLUXO

- [ ] Supabase Auth configurado com confirmação de email desabilitada
  no ambiente de dev (Supabase Dashboard > Auth > Email confirmations)
- [ ] Categorias globais inseridas no banco antes de abrir o onboarding
- [ ] Planos inseridos na tabela `plans` com `stripe_product_id` e
  `stripe_price_id` preenchidos
- [ ] Edge Function `onboard-tenant` deployada e testada (cria recipient Pagar.me + Customer Stripe)
- [ ] Webhook `recipient.status.changed` registrado em `pagarme-webhook`
- [ ] Webhook `customer.subscription.*` e `invoice.*` registrados em `stripe-webhook`
- [ ] Middleware bloqueando `/dashboard` para usuários sem tenant
- [ ] Middleware bloqueando `/dashboard` enquanto `pagarme_onboarding_status` ≠ `active`
- [ ] Banner de assinatura em atraso visível no layout do dashboard

-----

*Arquivo 10 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 11 — Dashboard — Produtos e Categorias*
