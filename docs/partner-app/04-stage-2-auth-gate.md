# Stage 2 — Auth do Lojista + Gate

> Mesmo lojista do Dashboard. Sem cadastro novo no app — quem não tem conta
> cria no onboarding web. Depende do Stage 1.

## Modelo de identidade (já existente)

`auth.users` → `tenants.user_id` (1:1) → `stores.tenant_id` (1:N). O Partner
App autentica o `auth.user` e resolve o `tenant` + as `stores` dele. Helper
`my_tenant_id()` no banco já garante o escopo via RLS — o app só precisa do id
da loja ativa para filtrar listas (pedidos, produtos), prefixar uploads e
setar `store_posts.store_id`.

## Login

Espelhar [`apps/mobile-courier/app/(auth)/entrar.tsx`](../../apps/mobile-courier/app/(auth)/entrar.tsx):
`supabase.auth.signInWithPassword({ email, password })`, erros tratados
("Email ou senha incorretos."), sucesso tratado pelo `onAuthStateChange` do
`_layout.tsx` (sem `router.replace` manual). Mesmas mensagens e estilo de
input do courier.

Sem fluxo de cadastro/reset próprio no MVP: link "Não tem conta? Cadastre sua
loja" abre `EXPO_PUBLIC_APP_URL` (onboarding web) via `expo-web-browser`/
`Linking` — não reimplementar onboarding de tenant no mobile.

## `useAuthStore`

Espelha o do courier, trocando `Courier` por:

```ts
interface Tenant {
  id: string
  nome_responsavel: string
  email: string
  ativo: boolean
  pagarme_onboarding_status: string
}
interface Loja { id: string; nome: string; slug: string; logo_url: string | null }

interface AuthState {
  user: User | null
  tenant: Tenant | null
  lojas: Loja[]
  lojaAtivaId: string | null      // persistir em AsyncStorage
  carregando: boolean
  // setters + setLojaAtiva + limpar
}
```

`carregarTenant(userId)` no `_layout.tsx`:

```
1. select tenant por user_id  -> tenant
2. select id,nome,slug,logo_url from stores where tenant_id = tenant.id and ativo
3. lojaAtivaId = persistido (AsyncStorage) se ainda existir, senão lojas[0].id
```

RLS já restringe os dois selects ao próprio tenant (`tenants_select_proprio`,
`stores_select_proprio`).

## Gate — dois níveis, mesmo predicado do Dashboard

O app tem dois níveis de acesso, ambos derivados do estado que o Dashboard
**já** usa (nunca um predicado novo):

1. **Gate de operação** — espelha o bloqueio do Dashboard web (middleware
   bloqueia quando a assinatura/onboarding não está utilizável). Reprovado:
   app em modo read-only com CTA "Regularize no Dashboard".
2. **Gate de publicação** — condição para as abas Publicar/Conteúdo. O projeto
   migrou o gate para `pagarme_onboarding_status` (commit `e172f80` "migrar
   gate para pagarme_onboarding_status"). **Reusar o mesmo predicado.**

Centralizar ambos em `packages/lib` (`tenantPodeOperar(tenant)`,
`tenantPodePublicar(tenant)`), copiando a lógica da fonte atual
(middleware do Dashboard / `create-subscription`) — junto das outras regras de
negócio compartilhadas. Se hoje os dois estados forem o mesmo predicado,
exportar dois nomes apontando para a mesma função (a semântica pode divergir
no futuro sem quebrar chamadas).

Estados e tela:

| Situação | Comportamento |
|---|---|
| Sem sessão | `(auth)/entrar` |
| Sessão ok, sem tenant | tela "Conta sem loja — finalize o cadastro" + link web |
| Tenant existe, gate de operação reprova | app read-only + banner "Regularize sua assinatura" + link Dashboard |
| Gate de operação ok, gate de publicação reprova | gestão liberada; Publicar/Conteúdo bloqueadas com CTA |
| Tenant ok, sem `stores` | "Crie sua loja no Dashboard" + link |
| Tenant ok, ≥1 loja | app liberado, loja ativa selecionada |

> O predicado exato (`pagarme_onboarding_status IN (...)`) deve ser **copiado**
> da fonte atual, não redefinido aqui. O tech lead confirma o valor no Stage 0
> e o registra em `packages/lib`.

## Seletor de loja

Tenant multi-loja: seletor simples (bottom sheet/lista) no header das abas
Início/Pedidos/Publicar e em Menu → Minha conta. Troca `lojaAtivaId`
(persistido). Todas as listas de gestão (pedidos, produtos, estoque…) filtram
pela loja ativa; todo upload e todo registro `store_posts` usam `lojaAtivaId`
→ define `store_id` e o prefixo `{tenant_id}/{store_id}/` no Storage.

## Critérios de aceite

- [ ] Login com credenciais do Dashboard entra; credencial errada mostra erro.
- [ ] `_layout` carrega tenant + lojas e popula o store; sessão persiste após
      reabrir o app (AsyncStorage).
- [ ] Tenant reprovado no gate de operação vê app read-only com CTA; reprovado
      só no de publicação navega na gestão mas não acessa Publicar/Conteúdo.
- [ ] Tenant multi-loja troca a loja ativa e a seleção persiste.
- [ ] `tenantPodeOperar`/`tenantPodePublicar` vivem em `packages/lib` e
      replicam o predicado atual (não há regra de gate duplicada no app).
- [ ] Sessão isolada deste app (AsyncStorage próprio), sem vazar p/ courier/
      consumer.
