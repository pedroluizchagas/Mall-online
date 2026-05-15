# 26 — Testes e Qualidade

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

A estratégia de testes prioriza cobertura nos pontos de maior risco:
lógica financeira, fluxo de pagamento e isolamento de dados entre
tenants. Não buscamos cobertura total — buscamos cobertura nos lugares
onde um bug causa perda financeira ou vazamento de dados.

Três camadas de teste:

1. Testes unitários — lógica de negócio isolada (Edge Functions e helpers)
1. Testes de integração — RLS e isolamento multi-tenant no banco
1. Testes E2E — fluxo completo de pedido com pagamento via Playwright

-----

## SETUP — DEPENDENCIAS

### Dashboard web (apps/web)

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react
pnpm add -D @testing-library/user-event @testing-library/jest-dom
pnpm add -D playwright @playwright/test
```

### vitest.config.ts (apps/web)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': new URL('./').pathname,
    },
  },
})
```

### tests/setup.ts

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock do cliente Supabase para testes unitários
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServer: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

// Mock do Stripe para testes unitários (apenas Billing)
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: { create: vi.fn(), retrieve: vi.fn() },
      subscriptions: { create: vi.fn(), update: vi.fn(), cancel: vi.fn() },
      products: { create: vi.fn() },
      prices: { create: vi.fn() },
      invoices: { retrieve: vi.fn() },
    })),
  }
})

// Mock do fetch global para chamadas Pagar.me
global.fetch = vi.fn()
```

-----

## TESTES UNITARIOS — HELPERS FINANCEIROS

### tests/unit/money.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import {
  formatarReais,
  reaisParaCentavos,
  calcularTaxaAntecipacao,
} from '@mallevo/lib'

describe('formatarReais', () => {
  it('formata zero corretamente', () => {
    expect(formatarReais(0)).toBe('R$\u00a00,00')
  })

  it('formata valor inteiro', () => {
    expect(formatarReais(5000)).toBe('R$\u00a050,00')
  })

  it('formata valor com centavos', () => {
    expect(formatarReais(4999)).toBe('R$\u00a049,99')
  })

  it('formata valor grande', () => {
    expect(formatarReais(100000)).toBe('R$\u00a01.000,00')
  })
})

describe('reaisParaCentavos', () => {
  it('converte valor inteiro', () => {
    expect(reaisParaCentavos(50)).toBe(5000)
  })

  it('converte valor decimal', () => {
    expect(reaisParaCentavos(49.99)).toBe(4999)
  })

  it('arredonda corretamente', () => {
    expect(reaisParaCentavos(0.015)).toBe(2)
  })
})

describe('calcularTaxaAntecipacao', () => {
  it('calcula taxa para um pedido', () => {
    expect(calcularTaxaAntecipacao(1)).toBe(75)
  })

  it('calcula taxa para múltiplos pedidos', () => {
    expect(calcularTaxaAntecipacao(40)).toBe(3000)
  })

  it('retorna zero para zero pedidos', () => {
    expect(calcularTaxaAntecipacao(0)).toBe(0)
  })
})
```

-----

## TESTES UNITARIOS — LOGICA DE REPASSE

### tests/unit/daily-payouts.test.ts

Testa a lógica de cálculo do cron de repasses isolada do Supabase
e do Stripe.

```typescript
import { describe, it, expect } from 'vitest'

// Funções extraídas da Edge Function para serem testáveis isoladamente
function calcularValorLojista(
  total: number,
  taxa_entrega: number,
  platform_fee: number
): number {
  return total - taxa_entrega - platform_fee
}

function calcularRepasseComAntecipacao(
  valor_bruto: number,
  total_pedidos: number
): {
  taxa_antecipacao: number
  valor_liquido: number
} {
  const TAXA_POR_PEDIDO = 75 // centavos
  const taxa_antecipacao = total_pedidos * TAXA_POR_PEDIDO
  const valor_liquido = valor_bruto - taxa_antecipacao
  return { taxa_antecipacao, valor_liquido }
}

function agruparPorTenant(
  pedidos: Array<{
    tenant_id: string
    total: number
    taxa_entrega: number
    platform_fee_amount: number
  }>
): Record<string, { total: number; quantidade: number }> {
  return pedidos.reduce(
    (acc, p) => {
      const valor = calcularValorLojista(p.total, p.taxa_entrega, p.platform_fee_amount)
      if (!acc[p.tenant_id]) {
        acc[p.tenant_id] = { total: 0, quantidade: 0 }
      }
      acc[p.tenant_id].total += valor
      acc[p.tenant_id].quantidade += 1
      return acc
    },
    {} as Record<string, { total: number; quantidade: number }>
  )
}

describe('calcularValorLojista', () => {
  it('desconta taxa de entrega e comissão da plataforma', () => {
    // R$60,00 total, R$10,00 frete, R$1,00 comissão
    expect(calcularValorLojista(6000, 1000, 100)).toBe(4900)
  })

  it('funciona com frete grátis', () => {
    expect(calcularValorLojista(5000, 0, 100)).toBe(4900)
  })

  it('nunca retorna negativo para valores válidos', () => {
    const resultado = calcularValorLojista(1000, 900, 100)
    expect(resultado).toBeGreaterThanOrEqual(0)
  })
})

describe('calcularRepasseComAntecipacao', () => {
  it('calcula desconto para 1 pedido', () => {
    const { taxa_antecipacao, valor_liquido } = calcularRepasseComAntecipacao(4900, 1)
    expect(taxa_antecipacao).toBe(75)
    expect(valor_liquido).toBe(4825)
  })

  it('calcula desconto para múltiplos pedidos', () => {
    const { taxa_antecipacao, valor_liquido } = calcularRepasseComAntecipacao(196000, 40)
    expect(taxa_antecipacao).toBe(3000) // 40 × R$0,75
    expect(valor_liquido).toBe(193000)
  })

  it('mantém integridade financeira — bruto = líquido + taxa', () => {
    const valor_bruto = 50000
    const { taxa_antecipacao, valor_liquido } = calcularRepasseComAntecipacao(valor_bruto, 10)
    expect(taxa_antecipacao + valor_liquido).toBe(valor_bruto)
  })
})

describe('agruparPorTenant', () => {
  const pedidos = [
    { tenant_id: 'tenant-a', total: 6000, taxa_entrega: 1000, platform_fee_amount: 100 },
    { tenant_id: 'tenant-a', total: 4500, taxa_entrega: 0, platform_fee_amount: 100 },
    { tenant_id: 'tenant-b', total: 8000, taxa_entrega: 1500, platform_fee_amount: 100 },
  ]

  it('agrupa pedidos do mesmo tenant', () => {
    const resultado = agruparPorTenant(pedidos)
    expect(resultado['tenant-a'].quantidade).toBe(2)
    expect(resultado['tenant-b'].quantidade).toBe(1)
  })

  it('soma corretamente os valores por tenant', () => {
    const resultado = agruparPorTenant(pedidos)
    // tenant-a: (6000-1000-100) + (4500-0-100) = 4900 + 4400 = 9300
    expect(resultado['tenant-a'].total).toBe(9300)
    // tenant-b: 8000-1500-100 = 6400
    expect(resultado['tenant-b'].total).toBe(6400)
  })

  it('não mistura valores entre tenants', () => {
    const resultado = agruparPorTenant(pedidos)
    expect(Object.keys(resultado)).toHaveLength(2)
  })
})
```

-----

## TESTES UNITARIOS — TRANSICOES DE STATUS

### tests/unit/order-status.test.ts

```typescript
import { describe, it, expect } from 'vitest'

type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  novo: ['confirmado', 'cancelado'],
  confirmado: ['em_preparo', 'cancelado'],
  em_preparo: ['aguardando_entregador', 'cancelado'],
  aguardando_entregador: ['cancelado'],
  saiu_para_entrega: [],
  entregue: [],
  cancelado: [],
}

function podeMover(atual: StatusPedido, proximo: StatusPedido): boolean {
  return TRANSICOES[atual]?.includes(proximo) ?? false
}

describe('transições de status do pedido', () => {
  it('permite confirmar pedido novo', () => {
    expect(podeMover('novo', 'confirmado')).toBe(true)
  })

  it('permite cancelar pedido novo', () => {
    expect(podeMover('novo', 'cancelado')).toBe(true)
  })

  it('não permite pular etapas', () => {
    expect(podeMover('novo', 'entregue')).toBe(false)
    expect(podeMover('novo', 'saiu_para_entrega')).toBe(false)
  })

  it('não permite voltar status', () => {
    expect(podeMover('em_preparo', 'novo')).toBe(false)
    expect(podeMover('entregue', 'em_preparo')).toBe(false)
  })

  it('não permite modificar pedido entregue', () => {
    expect(podeMover('entregue', 'cancelado')).toBe(false)
    expect(podeMover('entregue', 'entregue')).toBe(false)
  })

  it('não permite modificar pedido cancelado', () => {
    const todosStatus: StatusPedido[] = [
      'novo', 'confirmado', 'em_preparo',
      'aguardando_entregador', 'saiu_para_entrega', 'entregue', 'cancelado',
    ]
    todosStatus.forEach((s) => {
      expect(podeMover('cancelado', s)).toBe(false)
    })
  })
})
```

-----

## TESTES DE INTEGRACAO — RLS

Testes que rodam contra o banco Supabase local (`supabase start`).
Verificam que o isolamento multi-tenant está funcionando.

### tests/integration/rls.test.ts

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY!

// Cliente admin para setup
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// IDs dos tenants de teste
let tenantA_userId: string
let tenantB_userId: string
let tenantA_storeId: string
let tenantB_storeId: string
let tenantA_token: string
let tenantB_token: string

beforeAll(async () => {
  // Criar usuários de teste para dois tenants
  const { data: userA } = await admin.auth.admin.createUser({
    email: 'tenant-a-test@mallevo.test',
    password: 'senha-teste-123',
    user_metadata: { role: 'tenant' },
    email_confirm: true,
  })
  tenantA_userId = userA.user!.id

  const { data: userB } = await admin.auth.admin.createUser({
    email: 'tenant-b-test@mallevo.test',
    password: 'senha-teste-456',
    user_metadata: { role: 'tenant' },
    email_confirm: true,
  })
  tenantB_userId = userB.user!.id

  // Criar tenants e lojas via service_role
  const { data: tenantA } = await admin
    .from('tenants')
    .insert({
      user_id: tenantA_userId,
      nome_responsavel: 'Lojista A Teste',
      email: 'tenant-a-test@mallevo.test',
    })
    .select('id')
    .single()

  const { data: tenantB } = await admin
    .from('tenants')
    .insert({
      user_id: tenantB_userId,
      nome_responsavel: 'Lojista B Teste',
      email: 'tenant-b-test@mallevo.test',
    })
    .select('id')
    .single()

  // Criar plano e assinatura para bypass do trigger
  const { data: plano } = await admin
    .from('plans')
    .select('id')
    .limit(1)
    .single()

  await admin.from('tenant_subscriptions').insert([
    { tenant_id: tenantA!.id, plan_id: plano!.id, billing_status: 'ativa' },
    { tenant_id: tenantB!.id, plan_id: plano!.id, billing_status: 'ativa' },
  ])

  // Criar lojas
  const { data: lojaA } = await admin
    .from('stores')
    .insert({ tenant_id: tenantA!.id, nome: 'Loja do Tenant A' })
    .select('id')
    .single()

  const { data: lojaB } = await admin
    .from('stores')
    .insert({ tenant_id: tenantB!.id, nome: 'Loja do Tenant B' })
    .select('id')
    .single()

  tenantA_storeId = lojaA!.id
  tenantB_storeId = lojaB!.id

  // Obter tokens de autenticação
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: sessionA } = await clientA.auth.signInWithPassword({
    email: 'tenant-a-test@mallevo.test',
    password: 'senha-teste-123',
  })
  tenantA_token = sessionA.session!.access_token

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: sessionB } = await clientB.auth.signInWithPassword({
    email: 'tenant-b-test@mallevo.test',
    password: 'senha-teste-456',
  })
  tenantB_token = sessionB.session!.access_token
})

afterAll(async () => {
  // Limpar dados de teste
  await admin.from('stores').delete().in('id', [tenantA_storeId, tenantB_storeId])
  await admin.auth.admin.deleteUser(tenantA_userId)
  await admin.auth.admin.deleteUser(tenantB_userId)
})

describe('RLS — isolamento de lojas entre tenants', () => {
  it('tenant A vê apenas sua própria loja', async () => {
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tenantA_token}` } },
    })

    const { data } = await clientA.from('stores').select('id')
    const ids = (data ?? []).map((s: any) => s.id)

    expect(ids).toContain(tenantA_storeId)
    expect(ids).not.toContain(tenantB_storeId)
  })

  it('tenant B não vê a loja do tenant A', async () => {
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tenantB_token}` } },
    })

    const { data } = await clientB
      .from('stores')
      .select('id')
      .eq('id', tenantA_storeId)

    expect(data).toHaveLength(0)
  })

  it('tenant A não consegue atualizar loja do tenant B', async () => {
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tenantA_token}` } },
    })

    const { error } = await clientA
      .from('stores')
      .update({ nome: 'Nome invasor' })
      .eq('id', tenantB_storeId)

    // Sem erro mas sem linhas afetadas (RLS bloqueia silenciosamente)
    const { data: lojaB } = await admin
      .from('stores')
      .select('nome')
      .eq('id', tenantB_storeId)
      .single()

    expect(lojaB?.nome).toBe('Loja do Tenant B')
  })
})

describe('RLS — produtos', () => {
  let produtoA_id: string

  beforeAll(async () => {
    const { data } = await admin
      .from('products')
      .insert({
        store_id: tenantA_storeId,
        tenant_id: (await admin.from('tenants').select('id').eq('user_id', tenantA_userId).single()).data!.id,
        nome: 'Produto de Teste A',
        preco: 1000,
      })
      .select('id')
      .single()
    produtoA_id = data!.id
  })

  it('tenant B não vê produtos do tenant A via RLS', async () => {
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tenantB_token}` } },
    })

    const { data } = await clientB
      .from('products')
      .select('id')
      .eq('id', produtoA_id)

    // RLS retorna vazio ou aplica filtro de tenant
    expect(data?.some((p: any) => p.id === produtoA_id)).toBe(false)
  })
})
```

-----

## TESTES E2E — FLUXO COMPLETO COM PLAYWRIGHT

### playwright.config.ts (raiz do monorepo)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // Desativar paralelismo para evitar conflitos no banco
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### tests/e2e/onboarding-lojista.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Onboarding do lojista', () => {
  test('lojista consegue criar conta e chegar ao wizard', async ({ page }) => {
    await page.goto('/cadastro')

    await page.fill('input[name="nome"]', 'Restaurante Teste E2E')
    await page.fill('input[name="email"]', `e2e-${Date.now()}@teste.com`)
    await page.fill('input[name="senha"]', 'senha123456')

    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/onboarding')
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()
  })

  test('wizard valida campos obrigatórios', async ({ page }) => {
    await page.goto('/onboarding')

    // Tentar avançar sem preencher
    await page.click('button:has-text("Próximo")')

    await expect(page.locator('text=Nome completo obrigatório')).toBeVisible()
  })
})
```

### tests/e2e/fluxo-pedido.spec.ts

Testa o fluxo completo: lojista recebe pedido, confirma, entregador
é atribuído e pedido chega a entregue.

```typescript
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test.describe('Fluxo completo de pedido', () => {
  let tenantId: string
  let storeId: string
  let productId: string
  let orderId: string

  test.beforeAll(async () => {
    // Criar dados de teste via service_role
    // (simplificado — em produção usar fixtures)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', process.env.E2E_TENANT_EMAIL!)
      .single()

    tenantId = tenant!.id

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    storeId = store!.id

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .single()

    productId = product!.id
  })

  test('lojista vê novo pedido no dashboard em tempo real', async ({ page }) => {
    // Fazer login como lojista
    await page.goto('/entrar')
    await page.fill('input[name="email"]', process.env.E2E_TENANT_EMAIL!)
    await page.fill('input[name="senha"]', process.env.E2E_TENANT_PASSWORD!)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await page.goto('/dashboard/pedidos')

    // Criar pedido diretamente no banco (simula consumer fazendo pedido)
    const { data: consumer } = await supabase
      .from('consumers')
      .select('id')
      .limit(1)
      .single()

    const { data: pedido } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer!.id,
        store_id: storeId,
        tenant_id: tenantId,
        status: 'novo',
        payment_status: 'pago',
        forma_pagamento: 'online_cartao',
        subtotal: 5000,
        taxa_entrega: 500,
        total: 5500,
        platform_fee_amount: 100,
        endereco_entrega: {
          rua: 'Rua Teste', numero: '123',
          bairro: 'Centro', cidade: 'Divinópolis',
        },
      })
      .select('id')
      .single()

    orderId = pedido!.id

    await supabase.from('order_items').insert({
      order_id: orderId,
      product_id: productId,
      nome: 'Produto Teste',
      preco_unit: 5000,
      quantidade: 1,
      subtotal: 5000,
    })

    // Verificar que o pedido aparece no dashboard
    await expect(
      page.locator(`text=${orderId.slice(-6).toUpperCase()}`)
    ).toBeVisible({ timeout: 10000 })
  })

  test('lojista consegue confirmar e iniciar preparo do pedido', async ({ page }) => {
    await page.goto('/entrar')
    await page.fill('input[name="email"]', process.env.E2E_TENANT_EMAIL!)
    await page.fill('input[name="senha"]', process.env.E2E_TENANT_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.goto('/dashboard/pedidos')

    // Clicar no card do pedido para expandir
    await page.click(`text=${orderId.slice(-6).toUpperCase()}`)

    // Confirmar pedido
    await page.click('button:has-text("Confirmar pedido")')

    // Verificar mudança de status
    await expect(page.locator('text=Confirmado')).toBeVisible()

    // Verificar no banco
    const { data } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    expect(data?.status).toBe('confirmado')
  })

  test.afterAll(async () => {
    // Limpar dados de teste
    if (orderId) {
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
    }
  })
})
```

-----

## TESTES E2E — SANDBOX PAGAR.ME E STRIPE BILLING

Para testar o fluxo de pagamento em E2E, usar o ambiente sandbox
do Pagar.me. Nunca usar chaves de produção em testes.

### Cartões de teste Pagar.me (sandbox)

|Número             |Comportamento          |
|-------------------|-----------------------|
|4000000000000010   |Pagamento aprovado     |
|4000000000000028   |Cartão recusado        |
|4000000000000036   |Requer autenticação 3DS|
|5500000000000004   |Mastercard aprovado    |

Data de validade: qualquer data futura (ex: 12/2030)
CVV: qualquer 3 dígitos
Nome: qualquer string

### Simular webhooks Pagar.me localmente

```bash
# Terminal 1 — Supabase local
supabase start

# Terminal 2 — Next.js dev
pnpm dev:web

# Terminal 3 — Stripe CLI ouvindo (apenas para eventos Billing)
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Terminal 4 — Disparar evento Billing via Stripe CLI
stripe trigger customer.subscription.updated \
  --override customer.subscription:status=past_due

# Simular webhook Pagar.me manualmente (cURL com assinatura HMAC)
# Calcular x-hub-signature: echo -n '{"id":"or_xxx",...}' | \
#   openssl dgst -sha256 -hmac "$PAGARME_WEBHOOK_SECRET"
curl -X POST http://localhost:54321/functions/v1/pagarme-webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature: sha256=<hmac-calculado>" \
  -d '{"type":"order.paid","data":{"id":"or_xxx","status":"paid"}}'
```

-----

## TESTES DE SEGURANÇA — RLS MANUAL

Checklist de verificações manuais antes de cada deploy:

```bash
# 1. Testar isolamento básico via psql
psql "postgresql://postgres:postgres@localhost:54322/postgres"

-- Verificar policies em vigor
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Simular acesso como tenant específico
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "UUID_DO_USUARIO_A", "role": "authenticated"}';

-- Verificar que só vê seus dados
SELECT id, nome FROM stores;
-- Deve retornar apenas lojas do tenant A

-- Tentar acessar dados de outro tenant
SELECT id FROM stores WHERE id = 'ID_DA_LOJA_DO_TENANT_B';
-- Deve retornar vazio

RESET ROLE;
```

-----

## SCRIPTS DE TESTE

### package.json (raiz do monorepo) — scripts de teste

```json
{
  "scripts": {
    "test": "pnpm --filter web test",
    "test:unit": "pnpm --filter web vitest run",
    "test:watch": "pnpm --filter web vitest",
    "test:coverage": "pnpm --filter web vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:integration": "vitest run tests/integration",
    "test:all": "pnpm test:unit && pnpm test:integration && pnpm test:e2e"
  }
}
```

-----

## CI — GITHUB ACTIONS (referencia)

```yaml
# .github/workflows/test.yml
name: Testes

on:
  pull_request:
    branches: [main]

jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm test:unit

  test-e2e:
    runs-on: ubuntu-latest
    needs: test-unit
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_TEST }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY_TEST }}
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PK_TEST }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SK_TEST }}
      STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET_TEST }}
      PAGARME_API_KEY: ${{ secrets.PAGARME_API_KEY_TEST }}
      PAGARME_WEBHOOK_SECRET: ${{ secrets.PAGARME_WEBHOOK_SECRET_TEST }}
      E2E_TENANT_EMAIL: ${{ secrets.E2E_TENANT_EMAIL }}
      E2E_TENANT_PASSWORD: ${{ secrets.E2E_TENANT_PASSWORD }}

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

-----

## CHECKLIST DE QUALIDADE PRE-DEPLOY

### Antes de cada deploy em staging

- [ ] `pnpm test:unit` passando sem falhas
- [ ] Verificar manualmente o fluxo de novo pedido no dashboard
- [ ] Verificar manualmente a mudança de status no pedido
- [ ] Verificar que tenant A não vê dados do tenant B (teste RLS manual)

### Antes do deploy em produção

- [ ] `pnpm test:all` passando
- [ ] Testar fluxo completo de pagamento com cartão Pagar.me sandbox
- [ ] Testar webhook `order.paid` via cURL com assinatura HMAC válida
- [ ] Testar webhook `customer.subscription.updated` via Stripe CLI (Billing)
- [ ] Verificar que `PAGARME_API_KEY` de produção está configurada (prefixo `ak_live_`)
- [ ] Verificar que `PAGARME_WEBHOOK_SECRET` de produção está correto
- [ ] Verificar que variáveis Stripe `pk_live_` e `sk_live_` estão configuradas (Billing)
- [ ] Fazer backup manual do banco antes do deploy
- [ ] Aplicar migrations pendentes com `supabase db push`
- [ ] Verificar logs do Supabase após deploy por 15 minutos

-----

*Arquivo 26 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 27 — Deploy e Infraestrutura*
