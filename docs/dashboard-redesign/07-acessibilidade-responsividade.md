# 07 — Acessibilidade e Responsividade

*Versão 1.0 — 09/05/2026*

---

## 7.1 Padrão alvo

WCAG 2.1 nível **AA** para todas as páginas do Dashboard.

---

## 7.2 Contraste

- Texto sobre `var(--bg)`: ratio ≥ 4.5:1.
- Texto pequeno (< 14px) sobre tokens `--bg-2` e `--bg-3`: validar
  com ferramenta (Stark, axe). Atual `--ink-3` em alguns lugares
  fica abaixo de 4.5:1 — substituir por `--ink-2` em rótulos de
  KPI e categorias.
- Cores de status (`ok`, `warn`, `err`) **nunca sozinhas** veiculam
  informação — sempre acompanhadas de ícone ou texto.

---

## 7.3 Foco visível

- Outline padrão do navegador é restaurado em todos os elementos
  interáveis. Nada de `outline: none` global.
- Custom focus ring usando token `--brick-lt`:
  ```css
  :focus-visible {
    outline: 2px solid var(--brick);
    outline-offset: 2px;
    border-radius: inherit;
  }
  ```

---

## 7.4 Estrutura semântica

- Cada página tem **um** `<h1>`. Subseções usam `<h2>`/`<h3>` em
  ordem.
- `<main>` único por página (já está no layout).
- `<nav>` na sidebar com `aria-label="Navegação principal"`.
- Tabelas usam `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`.

---

## 7.5 Componentes interativos

| Componente | Padrão a11y |
|------------|-------------|
| Tabs (`/configuracoes`, `/minha-conta`) | `role="tablist"`, `role="tab"`, `aria-selected`, navegação com setas. |
| Toggle `<StoreStatusToggle />` | `role="switch"`, `aria-checked`, label associada. |
| Modal (atribuir entregador, confirmar antecipação) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, foco preso, `Esc` fecha. |
| Command palette (`⌘K`) | `role="combobox"`, `aria-expanded`, lista com `role="listbox"`, items com `role="option"`. |
| Kanban Pedidos | colunas com `aria-label="Pedidos {status}"`. Cada cartão é um `<article>` clicável (`<button>` interno para acessibilidade). |
| Skeleton loading | `aria-busy="true"` no container e `<span class="sr-only">Carregando...</span>`. |
| Toast (sonner) | já é live region (`role="status"`). |

---

## 7.6 Atalhos de teclado

Todos os atalhos descritos em `02-arquitetura-de-informacao.md §5` e
`06-fluxos-ux-criticos.md §6.12`.

Adicionais para acessibilidade:
- `Tab` segue ordem natural do DOM.
- `Shift+Tab` reverte.
- Setas em listas (Pedidos, Entregadores, Avaliações) movem entre
  linhas. `Enter` abre detalhe.
- Modais devolvem o foco ao elemento que abriu ao fechar.

---

## 7.7 Texto alternativo

- `<img>` com `alt` descrevendo conteúdo, ou `alt=""` para
  decorativo.
- Avatares de cliente e entregador: `alt={nome}`.
- Logo da loja na vitrine pública: `alt={'Logo da loja ' + nome}`.
- Ícones puramente decorativos junto a label: `aria-hidden="true"`.

---

## 7.8 Internacionalização e formatação

- pt-BR é primário. Datas: `Intl.DateTimeFormat('pt-BR')`. Moeda:
  `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Componente utilitário `formatarReais` (já existe em
  `@mallora/lib`).

---

## 7.9 Responsividade — breakpoints

Tailwind padrão:
- `sm`: ≥ 640px — tablets pequenos.
- `md`: ≥ 768px — tablets.
- `lg`: ≥ 1024px — desktop.
- `xl`: ≥ 1280px — desktop largo.

### Padrões por página

| Página | Mobile (< sm) | Tablet (sm–lg) | Desktop (≥ lg) |
|--------|---------------|----------------|----------------|
| `/` Início | KPIs em coluna única, cards empilhados, sidebar vira drawer | KPIs 2 col, cards 1-2 col | KPIs 4 col, layout completo |
| `/pedidos` | Tabs por status (sem kanban), painel detalhe vira tela cheia | Kanban 2 colunas com scroll horizontal | Kanban completo + detalhe lateral |
| `/produtos` | Cards verticais | Tabela compacta | Tabela completa |
| `/financeiro` | KPIs e gráfico empilhados | 2 colunas | layout atual |
| `/minha-loja` | Editor empilhado sem preview lateral; botão "Ver preview" abre modal | Editor + preview lado a lado | atual |
| `/configuracoes` | Tabs scroll horizontal | abas + conteúdo | atual |
| `/entregadores` | Cards | Tabela + filtros laterais | atual |
| `/relatorios` | gráficos full-width, paginar | 2 colunas | grid 12 colunas |
| `/mensagens` | Lista de threads em tela cheia, conversa em outra tela | side-by-side | atual |
| `/avaliacoes` | Cards verticais | Lista densa | atual |
| `/ajuda` | Cards verticais | Cards 2 col | Cards 3 col |

### Sidebar mobile

A sidebar vira drawer (`Sheet` do shadcn) acionado por botão
hamburger no header. O drawer mantém a mesma IA do desktop. Em
tablet (≥ md) já volta a ser sidebar fixa colapsável.

---

## 7.10 Toques e gestos

- Botões e itens clicáveis com **mínimo 44×44px** em mobile.
- Swipe horizontal para alternar entre status de pedido em mobile
  (cardview).
- Pull-to-refresh em listas de Pedidos e Mensagens (mobile).

---

## 7.11 Modo claro/escuro

- O design atual usa tokens `var(--*)`. Adicionar suporte a
  `prefers-color-scheme: dark` — tema escuro mantém a sidebar atual
  (que já é escura) e ajusta `--bg`, `--ink` etc.
- Toggle manual em `/minha-conta > Pessoa`. Persistência em
  `localStorage` + cookie httpOnly para hidratar SSR sem flash.

---

## 7.12 Performance

- Páginas críticas (Início, Pedidos) com Time-to-Interactive
  ≤ 2.5s em conexão 4G simulada.
- Imagens via `next/image` quando fizer sentido (logos, banners,
  fotos de produto).
- Skeletons durante carregamento, evitando "layout shift".
- `force-dynamic` continua nas páginas que dependem de Realtime.

---

## 7.13 Testes manuais de acessibilidade

Inclui-se em `09-checklist-qa.md` lista de verificação manual:
- Navegação completa só com teclado.
- Leitor de tela (VoiceOver e NVDA) lê títulos e ordem coerente.
- Zoom 200% — nada quebra de layout.
- Contraste — Stark/axe sem violações AA.
