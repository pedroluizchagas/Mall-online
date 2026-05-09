# 01 — Diagnóstico do Dashboard Atual

*Versão 1.0 — 09/05/2026*

---

## 1. ROTAS QUE EXISTEM HOJE

Auditadas em `apps/web/app/(dashboard)/`:

| Rota | Arquivo | Estado |
|------|---------|--------|
| `/` (Início) | `page.tsx` | OK — `SetupWizard` quando incompleto, KPIs + fila + movimento + repasse quando completo. |
| `/pedidos` | `pedidos/page.tsx` | OK — `PainelPedidosRealtime`. |
| `/pedidos/[id]` | `pedidos/[id]/page.tsx` | OK — detalhe. |
| `/produtos` | `produtos/page.tsx` | OK — lista, uso do plano. |
| `/produtos/[id]` | `produtos/[id]/page.tsx` | OK — edição. |
| `/produtos/novo` | `produtos/novo/page.tsx` | OK — novo. |
| `/categorias` | `categorias/page.tsx` | OK — **mas não está no sidebar**. |
| `/estoque/[id]` | `estoque/[id]/page.tsx` | Parcial — só detalhe; sem listagem geral; sem link no sidebar. |
| `/financeiro` | `financeiro/page.tsx` | OK — KPIs, gráfico, repasses, antecipação, saldo Stripe. |
| `/minha-loja` | `minha-loja/page.tsx` | **Problemático** — editor visual com preview ao vivo, mas as alterações **só são salvas em `localStorage`** (não persistem). |
| `/configuracoes` | `configuracoes/page.tsx` | Redirect → `/configuracoes/loja`. |
| `/configuracoes/loja` | `configuracoes/loja/page.tsx` | OK — abas: Dados gerais, Horários, Entrega, Pagamentos. |
| `/configuracoes/conta` | `configuracoes/conta/page.tsx` | OK — abas: Meus dados, Assinatura, Recebimentos. |
| `/configuracoes/assinatura` | `configuracoes/assinatura/page.tsx` | Redirect → `/configuracoes/conta`. |

## 2. ROTAS QUE A SIDEBAR APONTA, MAS NÃO EXISTEM

A `SidebarDashboard` (`components/dashboard/sidebar.tsx`) declara:

```ts
const mainItems: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag, badge: 2 },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/minha-loja', label: 'Minha Loja', icon: Store },
  { href: '/entregadores', label: 'Entregadores', icon: Bike },        // 404
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },        // 404
]

const configItems: NavItem[] = [
  { href: '/mensagens', label: 'Mensagens', icon: Bell },               // 404
  { href: '/avaliacoes', label: 'Avaliações', icon: Star },             // 404
  { href: '/configuracoes/loja', label: 'Configurações', icon: Settings },
  { href: '/configuracoes/conta', label: 'Minha conta', icon: UserCircle },
  { href: '/ajuda', label: 'Central de ajuda', icon: HelpCircle },      // 404
]
```

**Cinco itens levam a 404.** Outras quirks:

- `/pedidos` exibe um `badge` hard-coded `2`. Deveria refletir
  pedidos novos em tempo real.
- O input "Buscar..." com chip `⌘K` é apenas decorativo — não há
  command palette implementado.
- O bloco "Próximo evento — Feira Central · 20 abr · 17h–20h"
  é estático, não vem de tabela.

## 3. DUPLICAÇÕES IDENTIFICADAS

### 3.1 Identidade visual da loja (logo/banner/nome/descrição)

| Local | O que faz | Persiste? |
|-------|-----------|-----------|
| `/minha-loja` (`MinhaLojaEditor`) | Edita logo, banner, nome, tagline, escolhe template e paleta. Preview ao vivo no celular mock. | **Não.** Só `localStorage` em `mallevo-loja-config` e `URL.createObjectURL` (lost on refresh). |
| `/configuracoes/loja > Dados gerais` (`AbaGeral`) | Edita logo, banner, nome, descrição, telefone, slug, status. | **Sim** — server actions `atualizarDadosGerais` e `atualizarImagensLoja`. |

**Sintoma:** o lojista mexe em `/minha-loja`, vê funcionar no preview,
publica, recarrega e descobre que não salvou nada de fato.

### 3.2 "Configurações" vs "Minha conta"

Ambos são abas-pai apontando para a mesma rota base `/configuracoes/*`,
mas o usuário lê como se fossem áreas distintas. A separação por aba
horizontal interna (`Dados gerais | Horários | Entrega | Pagamentos`
de um lado, `Meus dados | Assinatura | Recebimentos` do outro) é
sensata, mas a **navegação primária** (sidebar) trata como itens
gêmeos sem deixar claro o critério.

### 3.3 Recebimentos / Stripe Express

Aparece em **dois lugares** com escopo parcialmente sobreposto:

- `/configuracoes/conta > Recebimentos` (`AbaStripe`) — status KYC,
  ID, link Express.
- `/financeiro > CardSaldoStripe` — saldo disponível, a receber, link
  Express.

Os dois renderizam um botão "Acessar conta Stripe" com o mesmo
`linkExpress`. Isso confunde: "configurar recebimento" e "ver meu
dinheiro" são ações distintas, mas o ponto de entrada se repete.

### 3.4 Endereço da loja

Está dentro de `/configuracoes/loja > Entrega` junto de raio, taxa e
tempo. Endereço é **dado da loja** (geral), não configuração de
entrega.

### 3.5 Status da loja (aberta/pausada)

Está dentro de `/configuracoes/loja > Dados gerais` como toggle. Por
ser uma decisão **operacional do dia** (não configuração permanente),
deveria estar no header do dashboard ou em "Minha Loja".

### 3.6 Setup wizard

A home (`page.tsx`) tem um `SetupWizard` muito útil que esconde os
KPIs até o lojista finalizar 4 passos (Stripe, produtos, horários,
entrega). Após completo, **desaparece sem deixar resumo**. Deveria
virar um card "Saúde da loja" sempre visível.

## 4. FUNCIONALIDADES QUE EXISTEM MAS ESTÃO ESCONDIDAS

| O que | Onde está | Por que escondido |
|-------|-----------|-------------------|
| Categorias | `/categorias` | Não há link no sidebar. |
| Estoque (visão geral) | só `/estoque/[id]` | Sem listagem; o usuário precisa navegar via `/produtos > clicar > estoque`. |
| Slug público da loja | `/configuracoes/loja > Dados gerais` | Não há botão "Copiar link" nem QR Code visível, apesar de existir o componente `botao-copiar-link.tsx`. |
| Preview da loja pública | `/loja/[slug]` (rota pública) | Sem link a partir do dashboard. |
| Antecipação de repasse | `/financeiro > CardAntecipacao` | OK, mas sem CTA na home quando há valor disponível. |
| Banner de Stripe pendente | layout do dashboard | OK, mostra. |

## 5. FUNCIONALIDADES PREVISTAS NA DOC E AINDA NÃO IMPLEMENTADAS

Cruzando com `00-INDEX-MESTRE.md`:

| Função | Doc canônica | Estado |
|--------|--------------|--------|
| Cadastro/aprovação de entregadores próprios pelo lojista | `19-entregador-modelo-auth-e-cadastro.md` | **Faltando** página `/entregadores`. |
| Lista de entregas atribuídas e mini-mapa do entregador no detalhe do pedido | `12-dashboard-gestao-pedidos.md` + `21-entregador-localizacao-em-tempo-real.md` | Componente `mapa-entregador-mini.tsx` existe mas a página agregadora não. |
| Relatórios analíticos (faturamento, ticket médio, top produtos, conversão por bairro) | implícito em `13` | **Faltando** `/relatorios`. |
| Mensagens com cliente / broadcasts | `23-push-notifications.md` (push para o consumer) | **Faltando** `/mensagens` (caixa do lojista). |
| Avaliações da loja e do entregador | `18-consumer-app-pedido-e-perfil.md` (cliente avalia) | **Faltando** `/avaliacoes` (lojista lê e responde). |
| Central de Ajuda / FAQ / abrir chamado | — | **Faltando** `/ajuda`. |
| Domínio personalizado | `provision-domain` API existe | Sem UI no dashboard. |
| Migração Pagar.me ↔ Stripe Express | `06-arquitetura-pagarme-...md` | Código atual fala em "Stripe Express"; doc fala em "Pagar.me Recipient". O dashboard precisa ser **agnóstico ao gateway** para suportar a transição. |

## 6. RISCOS DE UX OBSERVADOS

- **Confiança no salvamento** comprometida em `/minha-loja` — usuário
  publica e perde alterações.
- **Discoverability**: sem command palette real, com 5 links 404 no
  menu, o lojista perde tempo procurando função que não existe.
- **Sobrecarga cognitiva**: KPIs da home não filtrável por período
  (sempre "hoje"); o lojista não consegue comparar com ontem.
- **Notificação visual**: badge "2" em Pedidos é fixo; não pulsa
  quando entra novo pedido.
- **Ações destrutivas sem confirmação** em algumas Server Actions
  (verificar caso a caso na fase 1).

## 7. RESUMO DOS PROBLEMAS A RESOLVER

1. Consolidar identidade visual em **um único lugar** (`/minha-loja`)
   ligado a server actions reais.
2. Decidir explicitamente: o que vai em **Configurações** (operação
   da loja), o que vai em **Minha Conta** (pessoa) e o que vai em
   **Minha Loja** (vitrine pública).
3. Implementar as 5 páginas faltantes:
   `/entregadores`, `/relatorios`, `/mensagens`, `/avaliacoes`,
   `/ajuda`.
4. Adicionar **Categorias** e **Estoque** ao menu (subitens de
   "Catálogo").
5. Corrigir badges em tempo real (Pedidos, Mensagens) e implementar
   command palette `⌘K` real.
6. Trazer **status da loja** e **link público** para um lugar de
   destaque (header de "Minha Loja" ou home).
7. Padronizar empty-states, confirmações e toasts.
