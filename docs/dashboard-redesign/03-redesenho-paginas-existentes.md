# 03 — Redesenho das Páginas Existentes

*Versão 1.0 — 09/05/2026*

Cada seção descreve **escopo**, **layout**, **dados (server actions)**,
**eventos** e **mudanças vs. atual**.

---

## 3.1 Início (`/`)

### Escopo
Painel "1 olhada e entendi". Fila do dia, dinheiro, saúde da loja,
próximas ações.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER         "Olá, {nome}"   [seletor: Hoje · 7d · 30d] │
├─────────────────────────────────────────────────────────────┤
│  KPI · Receita   |  KPI · Pedidos  |  KPI · Ticket  |  KPI │
│   (com sparkline com período do filtro)                    │
├─────────────────────────────────────────────────────────────┤
│  Fila de pedidos (2/3)         |  Movimento por hora (1/3) │
├─────────────────────────────────────────────────────────────┤
│  Mais vendidos (1/3) | Entregadores ativos (1/3) | Repasse │
├─────────────────────────────────────────────────────────────┤
│  SAÚDE DA LOJA — barra horizontal com checklist permanente │
│   ✓ Conta de recebimentos verificada                       │
│   ✓ Produtos cadastrados (12)                              │
│   ✓ Horários configurados                                  │
│   ⚠ Sem foto em 3 produtos                                 │
│   ⚠ Avaliação média baixa nesta semana                     │
└─────────────────────────────────────────────────────────────┘
```

### Mudanças vs. atual
- O **seletor de período** afeta KPIs e sparklines (hoje só `hoje`).
- "Saúde da loja" passa a ser **permanente**: o `SetupWizard` continua
  no fluxo inicial, mas após completo vira essa barra com warnings
  acionáveis.
- O placeholder "pool da plataforma" do card Entregadores some quando
  a loja usa pool: vira "X entregadores disponíveis" ou "1 alocado em
  pedido #123" com link para `/entregadores`.
- "InsightBar" mantém-se no rodapé.

### Server Actions / leitura
- `getKpisFinanceiros(periodo)` (já existe) — passa a aceitar período
  do filtro.
- `getPedidosAtivos()` (já existe).
- `getMaisVendidos(periodo)` (extensão de `getTopProdutos`).
- `getSaudeLoja()` (novo) — retorna lista de avisos:
  ```ts
  type AvisoSaude = {
    id: 'sem_foto_produto' | 'avaliacao_baixa' | 'estoque_baixo' | ...
    severidade: 'info' | 'aviso' | 'erro'
    titulo: string
    descricao: string
    cta?: { label: string; href: string }
  }
  ```

---

## 3.2 Pedidos (`/pedidos`)

### Escopo
Operação realtime do dia + busca histórica + detalhe.

### Layout
```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Pedidos"            [Imprimir] [Exportar CSV]    │
│  Subtítulo: "X em curso · Y aguardando entrega"            │
│  [ Hoje · 7d · 30d · Personalizado ] [ Status: Todos ▾ ]   │
│  [ Buscar por número, cliente, bairro... ]                 │
├──────────────┬─────────────────────────────────────────────┤
│ KANBAN       │  DETALHE LATERAL (quando ?abrir=ord_123)    │
│ Novo (3)     │  cliente, itens, endereço, mapa,           │
│ Preparo (2)  │  forma de pagto, atribuir entregador,      │
│ Entrega (4)  │  ações (aceitar, despachar, concluir).     │
│ Concluído    │                                             │
│ Cancelado    │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Mudanças vs. atual
- Adiciona **busca textual** (número, telefone, bairro).
- Filtro de período + status no querystring (`?periodo=7d&status=novo`).
- Modo **Kanban** lado a lado das colunas (já existe parcialmente em
  `painel-pedidos-realtime.tsx`); painel de detalhe em sidebar
  derivado de `?abrir=`.
- Botão "Imprimir" gera comanda de cozinha (uma página A4 por pedido).
- Notificação sonora **respeita** preferência do usuário (toggle no
  header) — hoje toca sempre.
- Badge de "Pedidos" na sidebar reflete `count(status='novo')` via
  Realtime.

### Server Actions
- `getPedidos(filtros)` (existe) — adicionar `busca`, `periodo`,
  `status`.
- `imprimirComandaUrl(orderId)` (novo, server action que retorna URL
  de PDF gerado em Edge Function).

---

## 3.3 Catálogo (`/catalogo` → hub)

Em vez de uma rota nova com listagem, **`/catalogo`** é um redirect
para `/produtos`, mas o **menu agrupa** Produtos, Categorias e Estoque
sob "Catálogo". Com isso, o usuário entende que são partes do mesmo
domínio.

### 3.3.1 Produtos (`/produtos`)

Mantém estrutura. Adicionar:
- **Filtros persistentes** em `searchParams` (categoria, status,
  estoque baixo).
- **Ações em massa** (selecionar várias linhas → desativar / aplicar
  desconto / mudar categoria).
- **Importar/Exportar CSV** (botão já existe, ligar à Edge Function).

### 3.3.2 Categorias (`/categorias`)

Adicionar ao menu. Manter UI atual. Adicionar:
- Reordenação por arrastar (`@dnd-kit/sortable`).
- Contador "X produtos" por categoria.

### 3.3.3 Estoque (`/estoque`)

Criar **listagem** (hoje só existe detalhe `[id]`):

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Estoque"                       [Movimento manual]│
│  [ Buscar... ] [ Apenas baixo ☐ ] [ Apenas zerado ☐ ]      │
├────────────────────────────────────────────────────────────┤
│  Produto       SKU      Atual   Mínimo   Última mov.   →   │
│  Pão francês   PF-001   42      10       há 2h            │
│  Arroz 5kg     AR-005   3 ⚠     20       há 1d            │
└────────────────────────────────────────────────────────────┘
```

Linha → `/estoque/[id]` (já existe).

---

## 3.4 Financeiro (`/financeiro`)

### Escopo
Dinheiro entrando, dinheiro saindo, repasses, antecipação. **Não**
é onde se configura recebimento — só se consulta.

### Layout (mudanças incrementais)

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Financeiro"     [Hoje · 7d · 30d · Mês · 12m]    │
│                            [Exportar extrato]              │
├────────────────────────────────────────────────────────────┤
│  KPIs financeiros (já existem)                             │
├────────────────────────────────────────────────────────────┤
│  Faturamento × período (já existe)                         │
├────────────────────────────────────────────────────────────┤
│  Saldo a receber (Stripe/Pagar.me) │ Antecipar repasse    │
│  - separar do "configurar"         │ (já existe)           │
├────────────────────────────────────────────────────────────┤
│  Top produtos · Histórico de repasses                      │
└────────────────────────────────────────────────────────────┘
```

### Mudanças vs. atual
- Período no querystring com 5 opções padronizadas.
- Card "Saldo" deixa de duplicar a função de "configurar Stripe":
  - Botão "Acessar conta Stripe" continua aqui (consultar).
  - Botão "Completar verificação" só aparece em `/configuracoes >
    Recebimentos` (configurar).
- "Exportar extrato" gera CSV/XLSX por período (Edge Function).

---

## 3.5 Minha Loja (`/minha-loja`) — vitrine

### Escopo
**Único** ponto onde se mexe na vitrine pública: identidade visual,
link público, domínio, status (aberta/pausada).

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                     │
│  "Minha Loja"        [● Aberta ▾]  [Ver loja pública ↗]     │
│  Subtítulo: "Personalize a vitrine que seus clientes verão" │
│  [Identidade · Identidade pública · Domínio]                │
├─────────────────────────────────────┬───────────────────────┤
│  ABA "IDENTIDADE"                   │  PREVIEW AO VIVO      │
│  • Template (4 opções)              │  (mantém o iPhone     │
│  • Paleta                           │   mock atual)         │
│  • Logo, banner                     │                       │
│  • Nome de exibição                 │                       │
│  • Tagline                          │                       │
│  [ Salvar identidade ]              │                       │
├─────────────────────────────────────┘                       │
│  ABA "IDENTIDADE PÚBLICA"                                   │
│  • Slug:  mallevo.app/[ minha-loja ] [Copiar] [QR]          │
│  • Avaliação média e nº de avaliações (somente leitura)     │
│  • SEO: título, descrição, og:image                         │
├─────────────────────────────────────────────────────────────┤
│  ABA "DOMÍNIO PERSONALIZADO"                                │
│  • Domínio atual: minhaloja.com.br  [Verificar DNS]         │
│  • Botão "Configurar domínio" → wizard usando provision-domain│
└─────────────────────────────────────────────────────────────┘
```

### Mudanças vs. atual
- **Persistência real**: ao publicar, a Server Action grava em
  `stores`:
  ```ts
  // packages/types — adicionar
  type StoreTheme = {
    template: 'market' | 'boutique' | 'artesanal' | 'neon'
    paleta: 'midnight'|'ocean'|'berry'|'ember'|'slate'|'matcha'|null
  }
  ```
  Migrar imagens com `URL.createObjectURL` para upload Supabase
  Storage (bucket `store-assets`).
- **Sai do `localStorage`**.
- Adiciona toggle de status (aberta/pausada) no header — substitui o
  toggle hoje em `/configuracoes/loja > Dados gerais`.
- Adiciona aba "Domínio personalizado" cobrindo a API
  `app/api/stores/provision-domain`.
- Remove duplicação com `/configuracoes/loja > Dados gerais` em logo,
  banner, nome, descrição.

### Server Actions novas
```ts
// lib/actions/loja-vitrine.ts
'use server'
export async function publicarVitrine(input: {
  template: StoreTheme['template']
  paleta: StoreTheme['paleta']
  nome: string
  tagline: string
  logoFile?: File
  bannerFile?: File
}): Promise<{ sucesso: true } | { erro: string }>

export async function alternarStatusLoja(ativo: boolean):
  Promise<{ sucesso: true } | { erro: string }>

export async function configurarDominio(dominio: string):
  Promise<{ sucesso: true; instrucoesDns: DnsInstrucao[] } | { erro: string }>
```

---

## 3.6 Configurações (`/configuracoes`) — operação da loja

### Escopo
**Operacional** da loja. Sem identidade visual (foi para Minha Loja).
Sem dados pessoais (foram para Minha Conta). Sem assinatura (foi para
Minha Conta).

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER  "Configurações da loja"                            │
│  [Identificação · Localização · Horários · Entrega ·        │
│   Pagamentos · Recebimentos · Notificações · Equipe]        │
├─────────────────────────────────────────────────────────────┤
│  conteúdo da aba ativa                                      │
└─────────────────────────────────────────────────────────────┘
```

### Abas
1. **Identificação** — nome interno, telefone, e-mail comercial,
   CNPJ (se houver), categoria do negócio.
2. **Localização** — endereço completo (rua, número, bairro, cep,
   cidade, estado, complemento). Sem entrega. Geocode opcional.
3. **Horários** — mantém AbaHorarios.
4. **Entrega** — taxa, raio, tempo, política de entrega (próprio vs.
   pool). Sai do "endereço".
5. **Pagamentos** — métodos aceitos (mantém AbaPagamentos).
6. **Recebimentos** — conta Stripe Express / Pagar.me Recipient,
   botão "Completar verificação". (Move de `/configuracoes/conta`.)
7. **Notificações** — preferências de e-mail/push do lojista (novo).
   Som de pedido novo, alerta de avaliação <3, alerta de estoque
   baixo, etc.
8. **Equipe** *(beta)* — convidar usuários adicionais com papéis
   (admin, atendente). Para depois das fases iniciais.

### Mudanças vs. atual
- Some `Dados gerais` (vai para Identificação + Localização +
  Vitrine).
- Some `Recebimentos` de "Minha conta" e vem para cá.
- Aba **Localização** nova.
- Aba **Notificações** nova.
- Aba **Equipe** opcional para fase futura.

---

## 3.7 Minha Conta (`/minha-conta`) — pessoa

### Escopo
Pessoa física que opera a conta. **Não** loja, **não** vitrine.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER  "Minha conta"                                      │
│  [Pessoa · Segurança · Assinatura · Faturas · Privacidade]  │
└─────────────────────────────────────────────────────────────┘
```

### Abas
1. **Pessoa** — nome, telefone, e-mail (read-only), CPF/CNPJ
   (read-only), foto de perfil.
2. **Segurança** — alterar senha, 2FA, sessões ativas (novo),
   "encerrar todas as sessões".
3. **Assinatura** — plano atual, próxima cobrança, "Gerenciar no
   portal", upgrade/downgrade inline.
4. **Faturas** — histórico tabular com status, valor, PDF.
5. **Privacidade** — exportar meus dados (LGPD), excluir conta.

### Mudanças vs. atual
- `Recebimentos` **sai** daqui (vai para `/configuracoes >
  Recebimentos`).
- `Privacidade` é nova.
- `Sessões ativas` em Segurança é nova.

---

## 3.8 RESUMO DAS MUDANÇAS DE PERSISTÊNCIA

| Componente | Antes | Depois |
|------------|-------|--------|
| `MinhaLojaEditor` | grava em `localStorage` | grava em `stores.theme`, `stores.logo_url`, `stores.banner_url`, `stores.nome`, `stores.descricao` via Server Action `publicarVitrine`. |
| `AbaGeral.atualizarDadosGerais` | grava nome/descrição da loja | passa a gravar **apenas** nome interno, telefone, slug. Logo/banner/nome de exibição saem para `publicarVitrine`. |
| `AbaGeral` toggle de status | em "Dados gerais" | move para header de `/minha-loja`. |
| `AbaEntrega.atualizarEndereco` | aba Entrega | move para Server Action `atualizarLocalizacao` chamada na nova aba Localização. |
| `AbaStripe` | em `/configuracoes/conta > Recebimentos` | move para `/configuracoes > Recebimentos`. |

A migração de dados é trivial (mesmas colunas, só mudou a UI). Onde
necessário, criar **alias** de Server Action no primeiro release para
não quebrar testes.
