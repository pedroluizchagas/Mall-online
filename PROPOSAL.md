# Mall Online — Proposta de Produto

> Um shopping digital onde cada loja tem sua própria identidade, reunindo delivery de comida, bebidas e e-commerce em um único app.

---

## 1. Visão Geral

**Mall Online** é uma plataforma marketplace multi-vertical que funciona como um shopping digital. Assim como em um shopping físico, o consumidor pode comprar roupas em uma loja, comer na praça de alimentação e levar um produto de casa ao mesmo tempo — e cada loja mantém sua própria identidade visual e personalidade de marca.

A plataforma consolida em um único produto o que hoje está fragmentado entre apps como iFood, Zé Delivery e Mercado Livre.

---

## 2. Premissas do MVP

| Item | Decisão |
|------|---------|
| Pagamento | Fora do escopo inicial — acordado entre empresa e cliente final |
| Entrega | Responsabilidade da empresa parceira; entregador recebe do cliente final |
| Monetização | Assinatura mensal por plano (quota de produtos, lojas, recursos) |
| Autenticação de pagamento dos planos | Stripe / Mercado Pago (fora do fluxo de compras das lojas) |

---

## 3. Personas

### 3.1 Consumidor Final (B2C)
Usuário que navega no app, descobre lojas, faz pedidos e acompanha entregas.

### 3.2 Empresa Parceira (B2B)
Negócio que vende pelo Mall Online. Pode ser uma lanchonete, loja de roupas, mercadinho, etc.

### 3.3 Entregador
Vinculado à empresa parceira. Recebe e executa as entregas. Recebe pagamento direto do consumidor.

### 3.4 Admin Mall Online
Time interno que gerencia planos, empresas, moderação e métricas da plataforma.

---

## 4. Plataformas e Interfaces

```
┌─────────────────────────────────────────────────────────┐
│                     Mall Online                         │
├──────────────────────┬──────────────────────────────────┤
│   CONSUMIDOR FINAL   │        EMPRESA PARCEIRA          │
├──────────────────────┼──────────────────────────────────┤
│ • App Mobile         │ • Painel Web (PWA instalável)    │
│   React Native Expo  │   Dashboard / CRM / ERP          │
│ • Web (Next.js)      │                                  │
│   Responsivo         │ • Loja dentro do App             │
│                      │   (identidade própria)           │
│                      │                                  │
│                      │ • Página Web Pública             │
│                      │   mall.online/loja/[slug]        │
│                      │   (para bio de redes sociais)    │
├──────────────────────┴──────────────────────────────────┤
│              ENTREGADOR (App Mobile Leve)               │
│              React Native Expo                          │
├─────────────────────────────────────────────────────────┤
│              ADMIN MALL ONLINE (Web Interno)            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Funcionalidades por Perfil

### 5.1 Consumidor Final

#### Feed & Descoberta
- Feed personalizado com lojas e produtos em destaque
- Busca global (produto, loja, categoria, localização)
- Filtros: categoria, distância, avaliação, tempo de entrega, preço
- Tags de identidade: "Delivery", "Retirada", "Agendado"
- Histórico de pedidos e reordenação rápida

#### Loja Individual
- Página com identidade visual da empresa (banner, paleta, tipografia customizadas)
- Cardápio/catálogo com categorias
- Fotos, descrições, variantes e complementos por produto
- Avaliações e comentários
- Informações de entrega e retirada

#### Pedido
- Carrinho por loja (multi-loja em sessões separadas)
- Seleção de endereço de entrega ou retirada
- Agendamento de entrega
- Acompanhamento em tempo real (status manual atualizado pela empresa/entregador)
- Histórico completo de pedidos

#### Perfil
- Endereços salvos
- Favoritos (lojas e produtos)
- Notificações push
- Configurações de conta

---

### 5.2 Empresa Parceira — Painel Web (PWA)

#### Dashboard
- Visão geral: pedidos do dia, faturamento, produtos mais vendidos
- Alertas de pedidos pendentes em tempo real
- Gráficos de performance (semanal, mensal)

#### Gestão de Loja (Identidade Visual)
- Upload de logotipo e banner
- Seleção de paleta de cores primária/secundária
- Configuração de tipografia
- URL pública: `mall.online/loja/[slug]`
- Horário de funcionamento e feriados
- Configuração de raio/área de entrega
- Taxa e tempo estimado de entrega

#### Catálogo (ERP - Produtos)
- CRUD de categorias e produtos
- Variantes (tamanho, cor, sabor, etc.)
- Complementos e adicionais (ex: extras de lanche)
- Estoque com alertas de quantidade mínima
- Importação via CSV
- Fotos de produto com recorte/crop inline

#### Gestão de Pedidos
- Fila de pedidos em tempo real (Kanban: Novo → Aceito → Em Preparo → Saiu → Entregue)
- Aceitar/recusar pedidos com justificativa
- Impressão de comanda (suporte a impressora térmica via navegador)
- Histórico com filtros e exportação

#### CRM — Clientes
- Lista de clientes que já compraram
- Ticket médio, frequência, última compra
- Anotações internas por cliente
- Segmentação básica (ex: clientes inativos há 30 dias)
- Envio de notificação/oferta para segmento (via push ou WhatsApp link)

#### ERP — Financeiro
- Relatório de vendas por período
- Extrato de pedidos com status de pagamento (confirmado pelo cliente)
- Controle de custos de entrega
- Exportação para CSV/PDF

#### Entregadores
- Cadastro e gestão de entregadores vinculados à loja
- Atribuição manual de pedido a entregador
- Histórico de entregas por entregador

#### Plano e Assinatura
- Visualização do plano atual e limites (produtos, lojas filiais, usuários)
- Upgrade/downgrade de plano
- Histórico de faturas

---

### 5.3 Entregador — App Mobile

- Login via código convite da empresa
- Lista de entregas atribuídas
- Detalhes do pedido (endereço, itens, contato do cliente)
- Atualização de status (Saiu para entrega → Entregue)
- Navegação integrada (abre Google Maps / Waze com endereço)
- Histórico de entregas do dia

---

### 5.4 Admin Mall Online — Painel Interno

- Gerenciamento de empresas parceiras (aprovação, suspensão)
- Gerenciamento de planos e preços
- Moderação de avaliações
- Métricas globais da plataforma
- Suporte e tickets

---

## 6. Página Pública da Loja (`/loja/[slug]`)

Esta é a **segunda interface de saída** da empresa parceira — uma página web pública e indexável, ideal para uso em bio de redes sociais (Instagram, TikTok, WhatsApp).

**Comportamento:**
- URL fixa e personalizada: `mall.online/loja/minha-hamburgueria`
- Renderiza com identidade visual da empresa
- Exibe catálogo completo com preços
- Botão "Fazer Pedido" redireciona para o app (deep link) ou abre fluxo web
- SEO-friendly (SSR via Next.js)
- Open Graph configurado para preview bonito ao compartilhar
- PWA: pode ser "instalado" pelo cliente como atalho

---

## 7. Stack Tecnológica

### 7.1 Backend & Infraestrutura

| Serviço | Uso |
|---------|-----|
| **Supabase** | Banco de dados (PostgreSQL), Auth, Storage (fotos), Realtime (pedidos), Edge Functions |
| **Vercel** | Deploy do frontend web (Next.js) e Edge Functions adicionais |
| **Supabase Storage** | Imagens de produtos, banners, logos das lojas |
| **Supabase Realtime** | Canal de pedidos em tempo real (WebSocket) |
| **Resend** | E-mails transacionais (boas-vindas, fatura, redefinição de senha) |

### 7.2 Frontend Web

| Tecnologia | Uso |
|-----------|-----|
| **Next.js 15 (App Router)** | App consumidor web + Painel empresa + Admin + Páginas públicas de loja |
| **TypeScript** | Tipagem estática end-to-end |
| **Tailwind CSS v4** | Estilização com design tokens por loja (CSS variables dinâmicas) |
| **shadcn/ui** | Componentes base do painel empresa e admin |
| **Zustand** | Estado global no cliente |
| **React Query (TanStack)** | Cache e sincronização de dados servidor |
| **next-pwa** | PWA do painel empresa (instalável no desktop/mobile) |

### 7.3 App Mobile (Consumidor & Entregador)

| Tecnologia | Uso |
|-----------|-----|
| **React Native + Expo SDK 52** | App consumidor final e app entregador |
| **Expo Router (file-based)** | Navegação declarativa com deep links |
| **NativeWind** | Tailwind no React Native |
| **Expo Notifications** | Push notifications (Expo Push Service) |
| **Expo Location** | Geolocalização para entrega |
| **React Query** | Cache de dados e sincronização |
| **Zustand** | Estado global |
| **MMKV** | Storage local rápido |

### 7.4 Compartilhado

| Tecnologia | Uso |
|-----------|-----|
| **Zod** | Validação de schemas compartilhados |
| **Supabase JS Client** | Client isomórfico (web + RN) |
| **pnpm workspaces** | Monorepo |

---

## 8. Arquitetura do Monorepo

```
mall-online/
├── apps/
│   ├── web/                    # Next.js — consumer web + empresa painel + admin + /loja/[slug]
│   ├── mobile/                 # Expo — consumidor final
│   └── delivery/               # Expo — entregador
├── packages/
│   ├── ui/                     # Componentes compartilhados (web)
│   ├── ui-native/              # Componentes compartilhados (RN)
│   ├── schemas/                # Zod schemas compartilhados
│   ├── supabase/               # Client, types gerados, helpers
│   └── config/                 # ESLint, TypeScript, Tailwind configs
├── supabase/
│   ├── migrations/             # Migrations SQL versionadas
│   ├── functions/              # Edge Functions
│   └── seed.sql
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 9. Modelo de Dados (Principais Entidades)

```sql
-- Empresas parceiras
stores (id, slug, name, description, logo_url, banner_url,
        primary_color, secondary_color, font_family,
        owner_id, plan_id, status, created_at)

-- Configuração de entrega da loja
store_delivery_config (store_id, delivery_radius_km,
                       estimated_minutes_min, estimated_minutes_max,
                       delivery_fee, min_order_value, accepts_pickup)

-- Horários de funcionamento
store_hours (store_id, weekday, opens_at, closes_at, is_closed)

-- Catálogo
categories (id, store_id, name, sort_order, active)
products (id, store_id, category_id, name, description,
          price, image_url, active, stock_qty, created_at)
product_variants (id, product_id, name, price_modifier)
product_addons_group (id, product_id, name, min_qty, max_qty)
product_addons (id, group_id, name, price)

-- Pedidos
orders (id, store_id, consumer_id, delivery_address_id,
        status, type[delivery|pickup], subtotal,
        delivery_fee, notes, created_at)
order_items (id, order_id, product_id, qty, unit_price,
             variant_id, addons_json)
order_status_log (id, order_id, status, changed_by, created_at)

-- Entregadores
delivery_persons (id, store_id, user_id, name, phone, active)
order_deliveries (order_id, delivery_person_id, assigned_at,
                  picked_up_at, delivered_at)

-- Usuários / Auth
-- user_profiles vinculado ao auth.users do Supabase
user_profiles (id, role[consumer|store_owner|delivery|admin],
               name, avatar_url, phone)
consumer_addresses (id, user_id, label, street, number,
                    complement, neighborhood, city, state,
                    zip, lat, lng, is_default)

-- Avaliações
reviews (id, order_id, consumer_id, store_id,
         rating, comment, created_at)

-- Planos e Assinaturas
plans (id, name, price_monthly, max_products,
       max_stores, max_delivery_persons, features_json)
store_subscriptions (id, store_id, plan_id, status,
                     current_period_start, current_period_end)
```

---

## 10. Identidade Visual Dinâmica das Lojas

A grande diferença do Mall Online é que **cada loja tem sua própria identidade visual**, sem seguir o design system do shopping.

**Implementação:**

```css
/* Cada página de loja injeta CSS variables dinâmicos */
:root {
  --store-primary: #e63946;        /* cor configurada pela empresa */
  --store-secondary: #f1faee;
  --store-font: 'Poppins', sans-serif;
}
```

No Next.js, isso é feito via `generateMetadata` e `layout.tsx` dinâmico por segmento de rota, injetando as variáveis via `style` prop inline no `<html>` ou via CSS-in-JS scoped.

No React Native, as cores da loja são passadas via contexto React e aplicadas com NativeWind tokens dinâmicos.

---

## 11. Realtime — Fluxo de Pedidos

```
Consumidor faz pedido
       │
       ▼
INSERT em orders (status: 'pending')
       │
       ▼ Supabase Realtime
       ├──► Painel empresa: toca alarme + aparece na fila
       │
Empresa aceita (status: 'accepted')
       │
       ▼ Supabase Realtime
       ├──► App consumidor: notificação push + status atualizado
       │
Empresa: Em Preparo → Saiu para Entrega
       │
       ▼ Supabase Realtime
       └──► App consumidor + App entregador: atualizações em tempo real
```

Canal Supabase Realtime por loja:
```typescript
supabase
  .channel(`store-orders-${storeId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'orders',
    filter: `store_id=eq.${storeId}`
  }, handleNewOrder)
  .subscribe()
```

---

## 12. Planos de Assinatura

| | **Starter** | **Growth** | **Pro** | **Enterprise** |
|---|---|---|---|---|
| **Preço/mês** | R$ 49 | R$ 129 | R$ 299 | Sob consulta |
| Produtos ativos | 30 | 150 | Ilimitado | Ilimitado |
| Lojas filiais | 1 | 3 | 10 | Ilimitado |
| Entregadores | 2 | 10 | Ilimitado | Ilimitado |
| Usuários gestores | 1 | 3 | 10 | Ilimitado |
| Página pública `/loja` | ✓ | ✓ | ✓ | ✓ |
| CRM | Básico | Completo | Completo | Completo |
| ERP / Relatórios | Básico | Completo | Completo | Completo + API |
| Suporte | Chat | Chat | Chat + E-mail | Dedicado |
| Trial | 14 dias | — | — | — |

---

## 13. Segurança & Row Level Security (RLS)

Todas as tabelas do Supabase terão RLS habilitado:

```sql
-- Empresa só vê seus próprios pedidos
CREATE POLICY "store_owner_orders" ON orders
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Consumidor só vê seus próprios pedidos
CREATE POLICY "consumer_orders" ON orders
  FOR SELECT USING (consumer_id = auth.uid());

-- Produtos públicos de lojas ativas
CREATE POLICY "public_products" ON products
  FOR SELECT USING (
    active = true AND store_id IN (
      SELECT id FROM stores WHERE status = 'active'
    )
  );
```

---

## 14. Fases de Desenvolvimento

### Fase 1 — Fundação (Semanas 1–4)
- [ ] Setup monorepo (pnpm workspaces + Turborepo)
- [ ] Supabase: migrations iniciais, RLS, Auth
- [ ] Autenticação (email/senha + Google OAuth)
- [ ] CRUD de loja com identidade visual básica
- [ ] CRUD de produtos e categorias
- [ ] Página pública `/loja/[slug]` (Next.js SSR)

### Fase 2 — Core de Pedidos (Semanas 5–8)
- [ ] Fluxo de pedido completo (consumidor)
- [ ] Fila de pedidos em tempo real (empresa)
- [ ] App mobile consumidor (Expo) — telas principais
- [ ] Push notifications (Expo + Supabase Edge Function)
- [ ] App entregador (Expo) — telas básicas

### Fase 3 — CRM & ERP (Semanas 9–12)
- [ ] Dashboard empresa com métricas
- [ ] CRM de clientes
- [ ] Relatórios financeiros
- [ ] Gestão de entregadores
- [ ] Impressão de comanda

### Fase 4 — Planos & Polimento (Semanas 13–16)
- [ ] Sistema de planos e assinaturas (Stripe)
- [ ] Onboarding guiado para empresas
- [ ] Avaliações e comentários
- [ ] SEO e Open Graph das páginas de loja
- [ ] PWA do painel empresa
- [ ] Testes E2E (Playwright) e unitários (Vitest)
- [ ] Beta fechado com lojas piloto

---

## 15. Critérios de Sucesso do MVP

| Métrica | Meta para lançamento |
|---------|---------------------|
| Lojas onboardadas (beta) | 20 lojas ativas |
| Pedidos processados | 500 pedidos/mês |
| Uptime | 99.5% |
| Tempo médio de aceite de pedido | < 2 min |
| NPS consumidor | > 40 |
| NPS empresa | > 50 |
| Conversão trial → plano pago | > 30% |

---

## 16. Diferenciais Competitivos

1. **Identidade visual própria por loja** — o consumidor sente que está em uma loja diferente, não em mais um marketplace genérico
2. **Multi-vertical** — food delivery + e-commerce + serviços em um só lugar
3. **Link de bio poderoso** — a página `/loja/[slug]` substitui ferramentas como Linktree, com catálogo real e botão de compra
4. **CRM + ERP integrado** — o dono do negócio tem tudo em um painel, sem precisar de ferramentas externas
5. **Sem comissão por pedido** — modelo de assinatura fixo que não penaliza o crescimento das vendas

---

## 17. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Complexidade de identidade visual por loja | Alta | Alto | CSS variables + design system flexível desde o início |
| Latência do Realtime em escala | Média | Alto | Particionamento de canais por loja; fallback polling |
| Adoção de empresas sem delivery próprio | Alta | Médio | Starter plan com preço acessível; suporte no onboarding |
| Churn de empresas sem pedidos | Média | Alto | CRM ativo da Mall para ajudar empresas a divulgar |
| App Store review (Apple) | Média | Médio | Seguir guidelines desde o início; sem pagamentos no app no MVP |

---

## 18. Próximos Passos Imediatos

1. **Validação de negócio** — entrevistar 10 donos de pequenos negócios sobre dores com ferramentas atuais
2. **Design System** — criar no Figma o design system base + 3 temas de loja exemplo
3. **Setup técnico** — criar projeto Supabase + Vercel + repositório monorepo
4. **Spike de identidade visual** — POC de CSS variables dinâmicos por loja no Next.js
5. **Spike Realtime** — testar latência do Supabase Realtime com 50 canais simultâneos
6. **Selecionar lojas piloto** — 3 a 5 estabelecimentos para desenvolvimento colaborativo

---

*Proposta elaborada em 20/03/2026 — Mall Online v0.1*
