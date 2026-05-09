# Dashboard do Lojista — Redesenho de UX e Arquitetura de Informação

### Plataforma Mallevo (Mall-online)

*Versão 1.0 — 09/05/2026*
*Branch de implementação: `claude/improve-merchant-dashboard-b9sMl`*

---

## OBJETIVO

Esta documentação consolida o **redesenho** do Dashboard do Lojista
(`apps/web`). Ela parte de uma auditoria do estado atual, identifica
duplicações entre **Minha Conta**, **Configurações** e **Minha Loja**,
mapeia páginas referenciadas no menu mas inexistentes (**Entregadores**,
**Relatórios**, **Mensagens**, **Avaliações**, **Ajuda**) e propõe uma
nova **Arquitetura de Informação (IA)** com responsabilidades claras
por página, além de um roadmap de implementação fase a fase.

Esta pasta é um *complemento aplicado* aos documentos canônicos
`10-auth-onboarding-lojista.md`, `11-dashboard-produtos-e-categorias.md`,
`12-dashboard-gestao-pedidos.md`, `13-dashboard-financeiro-e-assinatura.md`
e `14-dashboard-configuracoes-loja.md`. Quando houver conflito de
escopo, **prevalece esta especificação** para o que diz respeito ao
Dashboard Web.

---

## SUMÁRIO

| # | Arquivo | O que cobre |
|---|---------|-------------|
| 00 | `00-indice.md` | Este arquivo. Princípios e como ler a doc. |
| 01 | `01-diagnostico-atual.md` | Auditoria do código atual: páginas, sidebar, abas, duplicações, links quebrados. |
| 02 | `02-arquitetura-de-informacao.md` | Nova sidebar, agrupamentos, rotas, mapeamento "antes → depois". |
| 03 | `03-redesenho-paginas-existentes.md` | Início, Pedidos, Catálogo, Financeiro, Minha Loja, Configurações, Minha Conta — redesenhados. |
| 04 | `04-novas-paginas.md` | Especificação detalhada de Entregadores, Relatórios, Mensagens, Avaliações, Central de Ajuda. |
| 05 | `05-componentes-e-padroes.md` | Header de página, breadcrumbs, empty-states, KPI card, command palette `⌘K`, toasts. |
| 06 | `06-fluxos-ux-criticos.md` | Setup, primeiro pedido, atrasos, antecipação, convidar entregador, responder avaliação. |
| 07 | `07-acessibilidade-responsividade.md` | A11y (WCAG 2.1 AA), atalhos de teclado, mobile/tablet, modo claro/escuro. |
| 08 | `08-roadmap-implementacao.md` | 5 fases com escopo, branches sugeridas e checkpoints. |
| 09 | `09-checklist-qa.md` | Checklist de QA visual + funcional + regressão para cada página. |

---

## PRINCÍPIOS DE DESIGN

1. **Uma responsabilidade por página.** "Onde eu mexo no logo da minha
   loja?" precisa ter **uma resposta única**. Hoje há logo em
   `/minha-loja` (não persiste, só `localStorage`) e em
   `/configuracoes/loja > Dados gerais` (server action real).
   Vamos consolidar.

2. **Configurar é diferente de operar.** O que muda toda hora
   (preço, disponibilidade, ofertas) fica em páginas operacionais
   (Catálogo, Pedidos). O que muda raramente (taxa, raio, métodos)
   fica em **Configurações**. O que é da pessoa (senha, e-mail) fica
   em **Minha Conta**. O que é vitrine (identidade visual da loja, link
   público) fica em **Minha Loja**.

3. **A sidebar é a IA.** Se algo precisa estar no menu, deve ter
   página. Se a página existe e não está no menu, vira esconde-esconde.
   Hoje 5 itens da sidebar levam a 404 (Entregadores, Relatórios,
   Mensagens, Avaliações, Ajuda) e 2 páginas existentes (Categorias,
   Estoque) não estão no menu principal.

4. **Densidade controlada.** Listas longas com filtros, KPIs no topo,
   ações primárias visíveis. Sem accordion dentro de accordion.

5. **Mobile-first nas páginas operacionais.** Pedidos, Mensagens e
   Entregadores precisam funcionar em tablet/mobile no balcão da loja.

6. **Estados vazios úteis.** Toda lista vazia tem título, descrição e
   CTA primário (ex.: "Ainda sem entregas. [Convidar entregador]").

---

## CONVENÇÕES

- **Português do Brasil** em rótulos visíveis e nomes de domínio,
  conforme `08-estrutura-do-monorepo.md` (`pedidos`, `produtos`,
  `entregadores`).
- **Ícones**: `lucide-react` (já em uso).
- **Cores**: tokens já definidos em `globals.css` (`--brick`,
  `--ink`, `--bg`, `--ok`, `--warn`, `--err`, `--leaf`, `--mustard`,
  `--sky`).
- **Tipografia**: `font-display` para títulos, `Plus Jakarta Sans`
  para corpo (já usado em `MinhaLojaEditor`).
- **Server Actions** para escrita; **Server Components** para leitura
  com `Promise.all` em paralelo (mantém o padrão atual).
- **Zod** para validação de Server Actions (mantém o padrão atual).

---

## STATUS DE LEITURA

A leitura recomendada é sequencial: 00 → 01 → 02 → 03 → 04 → 05 →
06 → 07 → 08 → 09. O **`01`** é a justificativa, o **`02`** é o
"o quê", o **`03`/`04`** são o "como" e o **`08`** é o "quando".
