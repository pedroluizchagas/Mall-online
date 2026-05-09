# 02 — Arquitetura de Informação (IA) Proposta

*Versão 1.0 — 09/05/2026*

---

## 1. PRINCÍPIO ORIENTADOR

Três grandes domínios mentais para o lojista:

1. **OPERAR** — o que faço hoje para vender.
2. **CONFIGURAR** — o que regulo de tempos em tempos.
3. **MINHA RELAÇÃO COM A PLATAFORMA** — pessoa, conta, assinatura,
   recebimentos.

Toda página é classificada num e em apenas um desses domínios.

## 2. NOVA SIDEBAR

```
┌────────────────────────────┐
│  M  Mallevo                │
│     shopping de Divinópolis│
├────────────────────────────┤
│ [ Buscar  ⌘K ]             │
├────────────────────────────┤
│  OPERAR                    │
│  • Início                  │  →  /
│  • Pedidos          [n]    │  →  /pedidos
│  • Catálogo      ▾         │  →  /catalogo
│      ↳ Produtos            │  →  /produtos
│      ↳ Categorias          │  →  /categorias
│      ↳ Estoque             │  →  /estoque
│  • Entregadores            │  →  /entregadores
│  • Mensagens        [n]    │  →  /mensagens
│  • Avaliações              │  →  /avaliacoes
│                            │
│  ANALISAR                  │
│  • Financeiro              │  →  /financeiro
│  • Relatórios              │  →  /relatorios
│                            │
│  MINHA LOJA                │
│  • Vitrine                 │  →  /minha-loja
│  • Configurações           │  →  /configuracoes
│                            │
│  CONTA                     │
│  • Minha conta             │  →  /minha-conta
│  • Central de ajuda        │  →  /ajuda
│  • Sair                    │
└────────────────────────────┘
```

Mudanças vs. atual:

- **3 grupos** (Operar, Analisar, Minha Loja, Conta) em vez de 2
  (Menu principal, Configurações).
- **Catálogo** vira agrupador com Produtos, Categorias e Estoque
  (resolve "categorias e estoque escondidos").
- **Minha Loja** = vitrine pública; **Configurações** = operação;
  **Minha Conta** = pessoa.
- **Sem links 404**: as 5 páginas são criadas (vide `04`).
- Badges `[n]` reativos vindos de Realtime (Pedidos, Mensagens).
- O botão "Sair da conta" **dentro do grupo Conta** (não solto no
  rodapé) — o rodapé fica para o card "saúde da loja" (vide `05`).
- O bloco "Próximo evento" some por enquanto (era estático).

## 3. ROTAS NOVAS, MOVIDAS E REMOVIDAS

| Antes | Depois | Motivo |
|-------|--------|--------|
| `/configuracoes` (redirect) | `/configuracoes` (página real, hub) | Usar como hub das abas. |
| `/configuracoes/loja` | `/configuracoes` | Vira a página primária. |
| `/configuracoes/conta` | `/minha-conta` | Promove para top-level e desambigua. |
| `/configuracoes/assinatura` (redirect) | `/minha-conta?aba=assinatura` | Mantém deep-link. |
| `/minha-loja` (editor com `localStorage`) | `/minha-loja` (editor real, persiste) | Une com `AbaGeral` de imagens. |
| `/estoque/[id]` | `/estoque` (lista) + `/estoque/[id]` | Ganha listagem geral. |
| — | `/entregadores` | Nova. |
| — | `/entregadores/[id]` | Nova — detalhe e aprovação. |
| — | `/entregadores/convidar` | Nova — gerar link de convite. |
| — | `/relatorios` | Nova. |
| — | `/mensagens` | Nova. |
| — | `/mensagens/[threadId]` | Nova. |
| — | `/avaliacoes` | Nova. |
| — | `/ajuda` | Nova. |

## 4. MAPA "ANTES → DEPOIS" POR FUNÇÃO

A tabela abaixo resolve as duplicações apontadas em `01-diagnostico`.

| Função | Onde está hoje | Onde fica | Justificativa |
|--------|----------------|-----------|---------------|
| Logo da loja | `/minha-loja` (não persiste) **e** `/configuracoes/loja > Dados gerais` | **`/minha-loja`** (única, persiste) | Identidade visual = vitrine. |
| Banner da loja | mesmo | **`/minha-loja`** | idem. |
| Nome de exibição da loja | mesmo | **`/minha-loja`** | idem. |
| Tagline / descrição curta | `/minha-loja` (não persiste) e `/configuracoes/loja > Dados gerais` | **`/minha-loja`** | idem. |
| Template e paleta | `/minha-loja` (só local) | **`/minha-loja`** (persistido em `stores.theme`) | idem. |
| Slug público | `/configuracoes/loja > Dados gerais` | **`/minha-loja > Identidade pública`** | Faz parte da vitrine. |
| Botão "Copiar link público" + QR | só no componente, não usado | **`/minha-loja`** (header) | idem. |
| Domínio personalizado | API existe, sem UI | **`/minha-loja > Domínio`** | idem. |
| Status loja (aberta/pausada) | `/configuracoes/loja > Dados gerais` | **header global** + `/minha-loja` | Decisão operacional do dia. |
| Telefone de contato da loja | `/configuracoes/loja > Dados gerais` | **`/configuracoes > Identificação`** | É info comercial, não vitrine. |
| Endereço da loja | `/configuracoes/loja > Entrega` | **`/configuracoes > Localização`** (aba própria) | Endereço ≠ entrega. |
| Horários de funcionamento | `/configuracoes/loja > Horários` | **`/configuracoes > Horários`** | Mantém. |
| Taxa, raio e tempo de entrega | `/configuracoes/loja > Entrega` | **`/configuracoes > Entrega`** | Mantém. |
| Pool de entregadores vs próprios | `/configuracoes/loja > Entrega` | **`/configuracoes > Entrega`** | Mantém. |
| Métodos de pagamento aceitos | `/configuracoes/loja > Pagamentos` | **`/configuracoes > Pagamentos`** | Mantém. |
| Conta de recebimentos (Stripe/Pagar.me) — *configurar* | `/configuracoes/conta > Recebimentos` | **`/configuracoes > Recebimentos`** | Configuração da loja, não da pessoa. |
| Saldo / extrato Stripe — *consultar* | `/financeiro > CardSaldoStripe` | **`/financeiro`** | Mantém. |
| Dados pessoais (nome, telefone, e-mail, CPF/CNPJ) | `/configuracoes/conta > Meus dados` | **`/minha-conta > Pessoa`** | Pessoa, não loja. |
| Senha e segurança (2FA) | `/configuracoes/conta > Meus dados` | **`/minha-conta > Segurança`** | Mantém. |
| Assinatura (plano, faturas, portal) | `/configuracoes/conta > Assinatura` | **`/minha-conta > Assinatura`** | Mantém. |
| Sessões ativas / dispositivos | — | **`/minha-conta > Segurança`** (novo) | Novo. |
| Setup wizard | home (oculto após completar) | **home** (sempre visível como "Saúde da loja") | Mantém memória do progresso. |
| Categorias | `/categorias` (sem link no menu) | **menu Catálogo > Categorias** | Discoverability. |
| Estoque (lista) | só `[id]` | **`/estoque`** (lista) | Discoverability. |
| Atribuição de entregador a pedido | modal em `/pedidos/[id]` (`modal-atribuir-entregador.tsx`) | **mantém + atalho em `/entregadores`** | Mantém. |
| Convidar entregador próprio | — | **`/entregadores/convidar`** | Novo. |
| Aprovar entregador próprio | — | **`/entregadores/[id]`** | Novo. |
| Avaliações da loja | — | **`/avaliacoes`** | Novo. |
| Mensagens com cliente | — | **`/mensagens`** | Novo. |
| Relatórios analíticos | — | **`/relatorios`** | Novo. |
| Central de Ajuda | — | **`/ajuda`** | Novo. |

## 5. ATALHOS GLOBAIS

| Atalho | Ação |
|--------|------|
| `⌘K` / `Ctrl+K` | Abre command palette: pesquisa páginas, produtos, pedidos por número, clientes. |
| `g i` | Vai para Início. |
| `g p` | Vai para Pedidos. |
| `g c` | Vai para Catálogo. |
| `g f` | Vai para Financeiro. |
| `g r` | Vai para Relatórios. |
| `g e` | Vai para Entregadores. |
| `g m` | Vai para Mensagens. |
| `g a` | Vai para Avaliações. |
| `g s` | Vai para Configurações. |
| `?` | Mostra este painel de atalhos. |
| `Esc` | Fecha modais e command palette. |

A implementação fica em `components/dashboard/command-palette.tsx`
(ver `05-componentes-e-padroes.md`).

## 6. BREADCRUMBS E HEADER DE PÁGINA

Toda página de rota interna passa a ter um cabeçalho padrão:

```
[Categoria]                                    [ações primárias]
Título da página em font-display
Linha de subtítulo com 1 frase de contexto.
[abas internas, se houver]
```

Especificação completa em `05-componentes-e-padroes.md`.

## 7. URLs E `searchParams`

Convenção:

- **Filtros e abas** vão em `searchParams` para ser compartilháveis.
  Ex.: `/configuracoes?aba=horarios`,
  `/relatorios?periodo=30d&metrica=ticket_medio`.
- **Modais persistentes** (detalhe lateral) usam `searchParams`.
  Ex.: `/pedidos?abrir=ord_123`.
- **Estados temporários** ficam em estado local de cliente.

## 8. RESUMO

A nova IA elimina os 5 links 404, expõe Categorias/Estoque, separa
*configurar a loja* (`/configuracoes`) de *gerenciar a pessoa*
(`/minha-conta`) e dá um lar único para identidade visual
(`/minha-loja`). Isso dá clareza para o redesenho página a página
descrito a seguir.
