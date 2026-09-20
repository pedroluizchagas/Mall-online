# Plano — Convergência web · storefront · mobile (StoreTheme e vitrines)

> Data: 2026-09-19. Branch de origem: `claude/partner-app`.
> Objetivo: tudo o que foi construído nas vitrines e arquétipos do consumer passa a ser
> **controlado pelo lojista no `apps/web`** e **refletido no `apps/storefront`**, com os três
> renderizadores lendo o mesmo contrato de dados.

---

## 1. Diagnóstico (estado em 2026-09-19)

### 1.1 Três renderizadores, um só sabe o que é uma vitrine

| Superfície | O que renderiza hoje | Onde decide o layout |
|---|---|---|
| `apps/mobile-consumer` | 21 peles + **15 vitrines com layout próprio** (`components/loja/Loja*.tsx` + `Produto*.tsx`) | Gate `preset × categoria_slug` hardcoded em `app/loja/[slug].tsx` L279-335 |
| `apps/storefront` | 21 peles (CSS vars) sobre **um único layout genérico** (header 200px + lista de seções + modal) | Não decide. Nem seleciona `categoria_slug` em `lib/tenant.ts` |
| `apps/web` (preview de `/minha-loja`) | Celular desenhado à mão em JSX (`minha-loja-editor.tsx` L611-1484), só cores/raio/fonte | Não decide. Estrutura fixa (grid 2 col + chips fictícios + "Aberto · 8h–20h" literal) |

Consequências:
- O lojista escolhe um arquétipo sem saber que ele ativa (ou não) uma vitrine no app.
- A mesma loja é **visualmente diferente** entre app e web. O DoD do roadmap ("a mesma loja é equivalente entre storefront e app") está reprovado.
- O preview é uma terceira implementação da UI de loja: drift garantido.

### 1.2 O consumer roda em mock, e as vitrines dependem de dados que só o mock produz

`apps/mobile-consumer/.env.local` tem `EXPO_PUBLIC_USE_MOCK=true` (`lib/supabase.ts` L11-14). Tudo que "ficou ótimo" foi visto sobre `lib/mock/dataset.ts`. Contra o Supabase real:

| Dado lido pelas vitrines | Quem lê | Produtor real no web | Efeito sem o dado |
|---|---|---|---|
| `products.metadata.galeria: string[]` | os 15 `Produto*.tsx` | **nenhum** | todo PDP cai para 1 foto |
| `products.metadata.recorte` (PNG sem fundo) | Torra, Smash, Horta, Ritual | **nenhum** (nem o mock gera) | efeito "produto flutuando" nunca acende |
| `products.metadata.especificacoes: [rótulo, valor][]` | Artesã, Feira | **nenhum** (form grava campos planos) | ficha técnica vazia |
| `products.metadata.unidade` ("/kg") | Feira | **nenhum** | preço sem unidade |
| `products.metadata.estoque` | Passarela | **nenhum** — a coluna real é `stock_quantity`, ignorada | chip de escassez nunca acende |
| Copy de hero ("Nova coleção", manifestos, marquees) | todas | não existe campo | texto fixo do componente para toda loja |
| Destaques / coleções curadas | Home e vitrines | não existe | proxy `order('ordem').limit(3)` |
| `stores.horarios` → aberto/fechado | Feira, Forno, Horta, Passarela | existe | o layout padrão e o storefront mostram "Aberto" literal |

### 1.3 Conteúdo (posts) só nasce no celular do lojista

A Home do consumer é alimentada por `store_posts` via `public_explore_feed`. O `apps/web` tem **zero** referências a posts: não lista, não publica, não mostra métricas. Só o `apps/mobile-partner` publica (`publicar.tsx`, `conteudo.tsx`).

### 1.4 Lacunas específicas do storefront

- Sem gate de vitrine; `categoria_slug` não é carregado.
- `StoreThemeRoot` só em `/` e `/produto/[id]`. Checkout, pedido, auth voltam ao lima Mallevo. Doze componentes usam `bg-accent text-ink` (quebram em preset escuro se forem tematizados).
- Tokens neutros divergiram do consumer (`canvas #F3F3F1` vs `#F1F1F3`, `line`, `canvasAlt`).
- `middleware.ts` só resolve subdomínio; `stores.domain` é gravado e nunca lido.
- Apex `mallevo.com.br` cai em "loja não encontrada".
- Zero testes.

### 1.5 Lacunas específicas do dashboard web

- Preview infiel (ver 1.1) e sem indicação de qual vitrine o arquétipo ativa.
- Slug editável só em `/configuracoes`; o editor manda o lojista para outra tela.
- Duas URLs na UI: `mallevo.app/` (aba identificação) vs `<slug>.mallevo.com.br` (botão). Nenhuma lê `stores.domain`.
- Código morto: `preview-loja.tsx` (921 linhas, era v1), `botao-copiar-link.tsx`. Action deprecada viva: `atualizarImagensLoja` (grava no bucket errado).
- Dashboard mono-loja (`.single()` em `lib/actions/lojas.ts`), enquanto lib e partner são multi-loja.

### 1.6 Lacunas da engine e dos docs

- 6 dos 21 arquétipos sem vitrine: `heritage` (**default de alimentos-bebidas**, a maior categoria), `soft`, `tech`, `market`, `utility`, `playful`.
- `supabase/functions/onboard-tenant/index.test.ts` ainda espelha whitelist de 11 presets.
- `docs/store-theme/07-roadmap` fala em 11 presets / 22 paletas (são 21 / 44) e não menciona as vitrines.
- `provider.tsx` da lib exportado e sem consumidor.

---

## 2. Princípio arquitetural

**Uma fonte de verdade, um decisor, três renderizadores.**

1. **Fonte de verdade** = banco: `stores.theme` (pele), `categories.slug` (nicho), `stores.conteudo` (editorial, novo), catálogo com `metadata` validado, `store_posts`.
2. **Decisor** = `@mallevo/lib`: `resolveTheme` (já existe) + `resolveVitrine(preset, categoriaSlug)` (novo, extraído do consumer) + schemas Zod do contrato de dados.
3. **Renderizadores** = consumer (RN), storefront (Next) e o preview do dashboard, que **deixa de existir como implementação própria** e passa a ser o storefront real em iframe.

Regra: nenhuma vitrine, em nenhuma superfície, inventa dado. O que não vier do lojista tem fallback explícito e visível para ele no dashboard.

---

## 3. Fases

### Fase 0 — Contrato compartilhado em `packages/lib` · ~1 semana · pré-requisito de tudo

**Entregas**
1. `store-theme/vitrines.ts`: `VITRINES` (código → arquétipo, categorias elegíveis, molde de barra A/B, nome de exibição) e `resolveVitrine(preset, categoriaSlug): VitrineCodigo | null`. Consumer passa a importar daqui (remove as flags de `[slug].tsx` L279-335). Teste: todo arquétipo com vitrine no disco do consumer está na tabela, e vice-versa.
2. `store-theme/conteudo.ts`: schema Zod de `StoreConteudo` v1 para a nova coluna `stores.conteudo` JSONB:
   `{ v:1, campanha?: {eyebrow, titulo, subtitulo?, cta?}, manifesto?, galeria_casa?: string[], destaques?: productId[] }`. Defaults reproduzem o comportamento atual (copy derivada de banner + maior desconto), para zero regressão.
3. `catalog/product-metadata.ts`: schema Zod único de `products.metadata` (`galeria`, `recorte`, `especificacoes`, `unidade`, `tags`, `exige_receita`, `duracao_min`), unificando o `metadataSchema` de `apps/web/lib/actions/produtos.ts`. Decisão embutida: **`metadata.estoque` morre**; vitrines leem `stock_quantity`.
4. `horarios.ts`: `abertoAgora(horarios, agora)` e `horarioDeHoje(horarios)`, extraídos das 4 vitrines que já calculam.
5. Migration: `stores.conteudo jsonb`; views `public_catalog_stores` expõem `conteudo`, `categoria_slug` e `horarios` (verificar o que já está lá).
6. Higiene: whitelist do teste de `onboard-tenant` para 21; roadmap 07 corrigido; `provider.tsx` removido ou adotado.

**Pronto quando:** consumer compila usando `resolveVitrine` da lib com comportamento idêntico; `pnpm --filter @mallevo/lib test` verde.

**Status 2026-09-19 — ✅ implementada e migration aplicada no Supabase (`supabase db push`, view `public_catalog_stores` já expõe `conteudo`; tipos gerados conferidos contra os editados à mão — só diferenças de formatação do gerador).**
- `store-theme/vitrines.ts`: `VITRINES` (15), `resolveVitrine`, `getVitrineDoArquetipo`, `ARQUETIPOS_SEM_VITRINE`. Consumer `[slug].tsx` perdeu 148 linhas de flags e usa a tabela; teste de paridade lib ↔ disco do consumer e lib ↔ `mapping.ts` (toda categoria de vitrine oferece o arquétipo).
- `loja/horarios.ts`: `abertoAgora` (turno noturno e véspera cobertos), `horarioDeHoje`, `normalizarHorarios`. Feira/Forno/Horta/Passarela e o layout padrão do consumer adotaram ("Fechado agora" quando os horários dizem).
- `loja/conteudo.ts`: `StoreConteudo` v1 (zod), `normalizeStoreConteudo` com recuperação campo a campo.
- `catalogo/metadata-produto.ts`: `metadataProdutoSchema` único (templates + `galeria`/`recorte`/`especificacoes`/`unidade`/`duracao_min`); `apps/web/lib/actions/produtos.ts` passou a importá-lo. `metadata.estoque` fora do contrato.
- Migration `20260919120000_stores_conteudo.sql` + `packages/types/src/supabase.ts` (`conteudo` em `stores` e na view). Aplicada em 2026-09-19.
- Higiene: whitelist do teste de `onboard-tenant` com 21; `provider.tsx` removido; roadmap 07 e comentários "11 arquétipos" corrigidos. `zod` entrou como dependência da lib (já estava no store do pnpm).
- Validação: lib 135 testes verdes (eram 91); tsc limpo em lib, consumer e storefront. **Web tem 1 erro de tsc pré-existente** (`(dashboard)/layout.tsx:80`, `TemplateProvider` — `@types/react` 19 da lib vazando para o web em React 18, desde a migração SDK 57). Fica para a Fase 1 (isolar `@types/react` da lib ou alinhar o web).

### Fase 1 — O dashboard produz o que as vitrines consomem · ~2 semanas · paralelo à Fase 2

**1a. Produto** (`produto-form.tsx`, gate por `DashboardTemplate.produto.camposExtras`)
- Galeria: multi-upload em `product-images`, ordenação por arrastar, grava `metadata.galeria`.
- Recorte: upload de PNG transparente com validação de alpha, grava `metadata.recorte` (templates food/generic).
- Especificações: editor de pares rótulo/valor (casa-decoração, floricultura, outros).
- Unidade de venda: select kg/g/un/L/ml (templates food/market), grava `metadata.unidade`.

**1b. Minha Loja** (`minha-loja-editor.tsx`, `loja-vitrine.ts`)
- Seção "Conteúdo da vitrine": campanha, manifesto, fotos da casa, destaques (picker de produtos). Grava `stores.conteudo`.
- Badge "Vitrine ativada: Forno" (ou aviso "este estilo usa o layout padrão") ao lado do arquétipo, via `resolveVitrine`.
- Slug editável aqui também; URL única `https://<slug>.mallevo.com.br` lendo `stores.domain` quando houver. Remover `mallevo.app/`.
- Card de saúde da loja (`saude-loja-card.tsx`) ganha itens "banner", "descrição", "galeria em N produtos", "campanha".

**1c. Conteúdo (posts) no web** — novo módulo `/conteudo`
- Listagem de `store_posts` do tenant: grade, status, moderação, curtidas/comentários/views.
- Ações: ocultar, remover, vincular produto, editar legenda/tags.
- Publicar foto (upload direto em `explore-media`) e vídeo (TUS, portando `apps/mobile-partner/lib/conteudo.ts` para `packages/lib`). Gate por plano (`max_posts`).
- Sidebar + command palette.

**1d. Limpeza:** apagar `preview-loja.tsx`, `botao-copiar-link.tsx`, `atualizarImagensLoja`.

**Status Fase 1 em 2026-09-19 — parcial:** feitos o badge "Vitrine ativada / Layout padrão" no editor (`AvisoVitrine` em `minha-loja-editor.tsx`, lendo `resolveVitrine`/`getVitrineDoArquetipo`), a URL única no campo de slug (`https://` + `.mallevo.com.br`, em vez de `mallevo.app/`) e a limpeza 1d. **1a feita em código (2026-09-19):** bloco "Mídia e vitrine" no formulário de produto (`components/dashboard/produto-midia-vitrine.tsx`): galeria (multi-upload, manter/remover, teto 10), recorte PNG/WebP (trocar/remover), ficha técnica em pares (teto 12) e unidade de venda (`UNIDADES_VENDA` da lib; só templates food/generic). Servidor: `aplicarMidiaVitrine` em `lib/actions/produtos.ts` sobe em `product-images/{tenant}/galeria-*|recorte-*` e resolve `metadata.galeria`/`metadata.recorte` honrando `galeria_mantida`/`remover_recorte`; `especificacoes`/`unidade` seguem no `metadata` JSON validado pelo `metadataProdutoSchema`. Validação: **e2e verde no dashboard real** (`pnpm qa:local`: Supabase local + seed + Playwright) — o produto Margherita do seed mostra galeria, recorte e ficha; adicionar uma linha e salvar persiste. **1b conteúdo feito em código (2026-09-19):** seção "Conteúdo da vitrine" em Minha Loja (`components/dashboard/conteudo-vitrine.tsx`): campanha (sobrelinha/título/subtítulo/botão com contadores dos `CONTEUDO_LIMITES`), texto da casa, destaques (busca no catálogo, ordem por setas, teto 6) e fotos da casa (upload, manter/remover, teto 8). `publicarVitrine` valida com `storeConteudoSchema`, sobe fotos em `store-assets/{tenant}/casa-*`, filtra destaques para produtos da própria loja e grava `stores.conteudo` (ou `null` quando vazio). A página carrega `conteudo` e um catálogo leve (200 itens) para o seletor. **e2e verde**: badge "Vitrine ativada: Forno", conteúdo do seed carregado, editar título + publicar + recarregar persiste. **Saúde da loja feita (2026-09-20):** `getSaudeLoja` ganhou endereço público (`stores.domain` × slug — erro com CTA "Provisionar"), banner, descrição, campanha e "galeria em N produtos"; Configurações › Identificação mostra o estado do endereço com "Provisionar agora" (`provisionarEnderecoPublico`, idempotente) e trocar o slug provisiona antes de gravar. **Decisão:** o slug NÃO ficou editável em Minha Loja — trocar slug = provisionar domínio na Cloudflare/Vercel (o incidente de TLS de 2026-09-20 nasceu de um slug trocado sem provisionar), então há um único ponto de escrita, em Configurações; Minha Loja mostra o endereço e leva para lá. **1c feito em código (2026-09-20):** módulo `/conteudo` no dashboard (`apps/web/app/(dashboard)/conteudo/`): listagem em grade de cartazes 9:14 com badge de estado (`badgeDoPost`), pílulas de duração/views, KPIs (posts no ar, views, curtidas, comentários — somente leitura), filtros por tipo e estado via searchParams, barra de uso do plano quando `plans.max_posts` tem teto, card de uploads órfãos; `/conteudo/[id]` edita legenda/tags/produto vinculado, alterna visibilidade (published ⇄ hidden) e remove com confirmação dupla (soft delete + remoção best-effort no bucket); `/conteudo/novo` publica foto (redimensionada no Canvas: mídia 1440px + thumb 720px, upload simples) e vídeo (TUS resumível, frame de 1s como capa, ≤60s/50MB) direto do navegador no bucket `explore-media`, e a server action `criarPost` grava `store_posts` (trigger do plano vira mensagem; RLS confere tenant+loja; produto vinculado tem que ser da loja). Gate `tenantPodePublicar` (recebimentos ativos) como no partner. Sidebar (Operar → Conteúdo) e command palette (Conteúdo, Publicar no Explorar). **Porte para a lib:** `packages/lib/src/conteudo/posts.ts` (tipos, `LIMITES_POST`, `badgeDoPost`, `normalizarTag`, `caminhosDoPost`, `orfaosDoPrefixo`, schemas zod `dadosPostSchema`/`novoPostSchema`, `mensagemErroPost`) e `tus.ts` (`criarUploadTUS`, `tus-js-client` como dependência da lib); o partner passou a consumir os três (`upload.ts`, `posts.ts`, `conteudo.ts` viraram fachadas). Seed ganhou um post publicado e o tenant QA com recebimentos ativos; e2e `apps/web/e2e/conteudo.spec.ts` (lista+filtra, edita+oculta, publica foto pelo navegador). Validação: tsc em lib/web/partner/consumer/storefront, 151 testes na lib (16 novos), `next build` do web. **E2e não rodado nesta sessão (Docker parado)** — rodar `pnpm qa:local` na próxima. Sem vídeo real testado no navegador ainda.

**Pronto quando:** um lojista sem celular consegue, só pelo web, montar uma loja que acende todos os elementos da sua vitrine no app.

### Fase 2 — O storefront veste as vitrines · ~3 a 4 semanas · o maior bloco

**2a. Infraestrutura (1ª semana)**
- `lib/tenant.ts` carrega `categoria_slug`, `conteudo`, `horarios`; `app/page.tsx` chama `resolveVitrine`.
- `StoreThemeRoot` em **todas** as rotas (checkout, pedido, auth). Decidido 2026-09-19: no storefront o checkout **veste a pele da loja** (diferente do app, onde o checkout é Mallevo). Corrigir os 12 `bg-accent text-ink` → `text-accent-ink`.
- Sincronizar tokens neutros com `consumer-design.ts` (ou mover os neutros Mallevo para `packages/lib`).
- `middleware.ts` resolve `stores.domain` além do subdomínio.
- Primitivas compartilhadas em `components/vitrines/_base/`: hero (full-bleed, cartão, bloco), lista de seção com âncoras, grade 2/3/4 col, fecho com relógio vivo (`abertoAgora`), barra de navegação nos dois moldes (fixa / pílula), pager. As vitrines RN já convergiram nesses primitivos; replicar o vocabulário evita 15 implementações do zero.
- Fontes: `next/font/google` para as 12 famílias de token + as 4 fontes-DNA (Archivo Black, Baloo 2 800, Caveat, Shrikhand).
- Layout padrão premium: hero real com `conteudo.campanha`, status por `horarios`, seções ancoradas. Cobre os 6 arquétipos sem vitrine e qualquer fallback.

**Status 2a em 2026-09-19 — ✅ implementada.**
- Route group `app/(loja)/` (catálogo, produto, checkout, pedido, auth) com `layout.tsx` que veste a pele UMA vez: `StoreThemeRoot` passou a escrever as CSS vars no `:root` (body, overscroll e portais herdam) e a coluna central de 480px vive no layout. Páginas legais e "loja não encontrada" ficam fora do grupo (Mallevo).
- `lib/tenant.ts`: `buscarStore` (nullable, cacheado) + `getStore` (notFound); `Store` ganhou `categoria_slug` e `conteudo`. `select('*')` de propósito: seleção nomeada de `conteudo` derrubava toda loja em 404 num banco sem a migration (aconteceu no teste contra o Supabase real).
- `lib/vitrine.ts` (`resolveVitrineDaLoja`) + `components/vitrines/{index,tipos,Padrao}.tsx`: registro `VITRINES_WEB` (vazio até a 2b) e `escolherVitrineWeb` → padrão. `/produto/[id]` usa a mesma vitrine com `initialProdutoId`.
- Layout padrão premium: `_base/HeroLoja` (banner com véu ou bloco accent; voz de `stores.conteudo.campanha`, senão nome/descrição; CTA para `#catalogo`), `_base/StatusAberto` (relógio vivo por minuto, hora de parede da loja via `relogioDaLoja`), `_base/NavSecoes` (chips grudados, IntersectionObserver), `_base/FechoLoja`. `StoreHeader` removido. `MenuSection` ancorável.
- Contraste: 14 pontos `bg-accent text-ink` / `bg-ink text-accent` → `bg-accent text-accent-ink`. Auth (`/entrar`, `/verificar`) saiu do cinza fixo para `canvas/surface` da pele; cartão de status do pedido usa `bg-ink text-canvas`. Tokens `surfaceDark*`/`line.dark` removidos.
- Tokens neutros sincronizados com o consumer (`canvas #F1F1F3`, `canvasAlt #E7E7EA`, `line #E4E4E7`); corpo da página segue `--font-body`.
- Testes: vitest no storefront (`pnpm --filter storefront test`), tasks `test`/`typecheck` no turbo, `pnpm test` na raiz. `next build` verde; smoke test contra o Supabase real (loja `guaimbes`): pele no `:root`, fontes do arquétipo, hero, "Aberto até 12:00", régua, fecho; `/checkout` e `/entrar` vestidos.
- **Decisões tomadas na execução:** (1) `stores.domain` no middleware NÃO foi feito — o provisionamento só cria `<slug>.mallevo.com.br`, então não há domínio próprio a resolver; volta quando houver produto para isso. (2) Fontes continuam via `<link>` do Google Fonts por tenant (o mecanismo já funciona); as 4 fontes-DNA entram por vitrine na 2b. (3) A barra de 4 abas do consumer não existe no web: o storefront é loja única, o header é a navegação e o fecho leva ao apex; quando o saguão existir (Fase 5) o header ganha "voltar ao shopping". (4) `next lint` nunca foi configurado no storefront (prompt interativo) — fora deste ciclo.

**2b. Vitrines, em ondas por peso de mercado em Divinópolis**
1. Alimentação e mercado: `smash`, `slice` (forno), `roast` (torra), `noir`, `garden` (horta), `ritual`, `fresh` (feira).
2. Moda e beleza: `editorial`, `mono` (passarela), `raw`, `volt`, `serene`.
3. Demais: `clinic`, `artisan`, `magazine`.

Cada vitrine = `components/vitrines/<codigo>/{Vitrine,Pdp}.tsx`, server component com ilhas client, PDP própria em `/produto/[id]` (hoje é catálogo + modal). Spec de referência: `docs/store-theme/05` §5.6, que já descreve cada uma em detalhe.

**Desktop (decidido 2026-09-19):** vitrines de loja saem com coluna central de 480px sobre o fundo da pele (fiel à spec mobile, sem redesenho). Layouts desktop nativos ficam para depois, começando pelas 3 ou 4 vitrines mais usadas. O saguão do apex (Fase 5) é a exceção: nasce responsivo nativo.

**Ferramenta de QA (2026-09-19):** com `STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true` no ambiente, `?preset=slice&categoria=alimentos-bebidas` em qualquer loja troca a pele e a categoria só naquele request (middleware → headers `x-preview-*` → `lib/tenant.ts`). Permite ver qualquer vitrine sobre um catálogo real sem tocar no banco. É a base do `/_preview` da Fase 3. Nunca ligar em produção.

**Costuras de 2b:** `components/store/ProdutoModalHost.tsx` (dono do produto aberto + `ProductModal` + `TrocaLojaDialog`, render-prop `abrir(id)`), `_base/Sacola.tsx` (botão da sacola no DNA da vitrine + `CartDrawer`, sem FAB), `_base/FonteDna.tsx` (fontes-DNA por vitrine via Google Fonts).

**Status 2b em 2026-09-19 — ✅ onda 1 completa: `forno`, `smash`, `torra`, `noir`, `horta`, `ritual`, `feira` portadas e registradas** (7 de 15; guarda do registro exige ≤ 8 faltantes). As sete respondem 200 sobre a loja real com o override de QA, sem erros no servidor. Início da onda: (`components/vitrines/forno/`, `components/vitrines/smash/`, registradas em `VITRINES_WEB`; teste de guarda `components/vitrines/__tests__/registro.test.ts`). Validação: tsc, `next build` e smoke test HTML sobre a loja real com o override de QA (`?preset=slice|smash&categoria=alimentos-bebidas`) — sem revisão visual em navegador ainda. Adaptações registradas nos componentes: barra de menu do app omitida; PDP continua no `ProductModal` (`// TODO(2b): PDP própria`); pôster do forno virou pager scroll-snap; `conteudo.campanha/manifesto/destaques` alimentam wordmark, manchete, statement e molduras com a derivação da RN como fallback. Bug pego no smoke: `Store.tempo_entrega` estava tipado `string` (a view devolve minutos como número) — corrigido em `lib/tenant.ts`. **Onda 2 completa (2026-09-19):** `editorial`, `passarela`, `raw`, `volt`, `serena` portadas, registradas (12 de 15; guarda exige ≤ 3 faltantes), build verde, fumaça 200 e revisão visual com Firefox headless (topo + página inteira). Um ajuste da revisão: na Passarela, sem seção "destaques" nomeada, a coluna passa a eleger a primeira seção com fotos (e a remove da grade quando mostra todos os itens) — antes repetia as mesmas três peças na coluna e na grade. Passarela tem ADIÇÃO RÁPIDA na grade (item sem variação vai direto para a sacola via `useCartStore`; com variação abre o modal). Próxima: onda 3 — `clinica`, `artesa`, `magazine`. **Revisão visual da onda 1 (2026-09-19) — feita** com Firefox headless (`--screenshot`, viewport 480×900 e 480×3200, host `guaimbes.mallevo.localhost` + override de QA). Achados e correções: (1) imagens de hero com `loading="lazy"` no Forno (disco) e na Horta (foto-adesivo) — hero é LCP, virou `eager`/`fetchPriority=high` via prop `carregamento`; (2) heros em `min-h-[Nsvh]` sem teto inflavam em telas altas — Forno `min(82svh,760px)`, Horta `min(70svh,680px)`; (3) Feira: header sticky nascia depois do `pt-[66px]` do `main` e cobria o nome da loja — `-mt-[66px] mb-[66px]`; discos de categoria (acima da dobra) ficaram `eager`. Smash, Torra, Noir, Ritual e o layout padrão passaram sem ajuste. Pendência transversal da 2b: PDP própria por vitrine (hoje `ProductModal`). **Onda 3 completa (2026-09-20): `clinica`, `artesa`, `magazine` portadas e registradas — 15 de 15.** `VITRINES_WEB` virou `Record` completo (vitrine nova na lib sem porte web quebra o typecheck) e a guarda `registro.test.ts` exige paridade total. Motor de hero-carrossel compartilhado extraído para `_base/useCarrossel.ts` (`useCarrossel`, `useHeroEmCena`, `comCopiaDeLoop`) + `_base/movimento.ts` (`prefereMenosMovimento`, `useReduzirMovimento`) — as três novas usam; as 12 anteriores continuam com o motor local (refatorar quando forem tocadas). Adaptações: Clínica e Magazine têm ADIÇÃO RÁPIDA (item com `exige_receita`, com variação/modificador ou com sacola de outra loja abre o detalhe; flash "adicionado"/"Na sacola"); Artesã trocou o "Aberto" literal da RN pelo `StatusAberto`, o statement em dois tons lê `conteudo.manifesto` antes da descrição e `galeria_casa` ganha uma seção numerada "A casa"; coração de favorito fora (web não tem favoritos). Validação: tsc, vitest (19), `next build`, fumaça 200 nas três com o override de QA sobre a loja real, revisão visual Firefox headless (topo + página inteira) — um ajuste: numeração das seções da Artesã seguia a ordem de render dos filhos, não a da página (bandas calculadas no pai agora). A moldura "App Mallevo" do preview passa a mostrar a vitrine real para as três.

**2c. Qualidade**
- vitest + testing-library no storefront; task `test` e `typecheck` no `turbo.json`.
- Teste-guarda: toda entrada de `VITRINES` tem implementação web (espelho do guard de barra de menu).
- Playwright com screenshot por arquétipo contra o seed demo (ver §4).

**Pronto quando:** a mesma loja demo abre visualmente equivalente no app e em `<slug>.mallevo.localhost`, para cada uma das 15 vitrines.

### Fase 3 — Preview do dashboard = storefront real · ~1 semana · depende de 2a

- Rota `/_preview` no storefront: renderiza a loja do tenant e aceita `theme` e `conteudo` de rascunho via `postMessage` (não persiste).
- Dashboard troca o celular JSX por um iframe (390px) com toggle desktop. "O que vejo é o que publico" passa a ser literal, com dados reais (horários, taxa, pagamentos, produtos do lojista).
- Remove ~870 linhas de `minha-loja-editor.tsx`.

**Status 2026-09-19 — ✅ implementada.** Storefront: rota `/preview` (`app/(loja)/preview/page.tsx` + `lib/rascunho.ts`) aplica `?draft=` (tema + conteúdo + categoria, base64url) só no request, `noindex`, CSP `frame-ancestors` restrito ao dashboard. Web: `components/dashboard/preview-vitrine.tsx` (iframe com molduras celular 390px e computador 1280px, telas Início/Produto, debounce de 600ms, aviso de mídia não publicada) substitui o celular JSX; `painel-vitrine.tsx` ("Sua vitrine": vitrine ativada ou, no padrão, quais estilos têm vitrine para a categoria, com atalho); `lib/storefront-url.ts` é a fonte única da URL pública (botão "Ver loja pública" incluso). O e2e sobe web + storefront contra o Supabase local e exige que o iframe carregue a vitrine com o rascunho (`pnpm qa:local`). O editor caiu de 1565 para ~790 linhas. O rascunho não carrega logo/banner/fotos novas (blobs locais) — aparecem após publicar, e o painel avisa. **Moldura "App Mallevo" (2026-09-20):** terceira opção no preview, ao lado de Celular e Computador — a MESMA página do storefront com `?app=1`, que veste o chrome do app em volta da vitrine (`apps/storefront/components/store/ShellApp.tsx`): status bar (branca em `mix-blend-mode: difference`, vira sozinha sobre hero claro/escuro), botão de voltar só no layout padrão (as vitrines já têm o botão da casa no canto) e a barra de menu Início/Explorar/Pedidos/Perfil no molde da tabela `VITRINES` (`fixa` na pele; `pilula` com o DNA de Forno/Smash/Ritual). O chrome `sticky top-0` das vitrines desce 47px (o `insets.top` do app). Não é o app RN rodando: é o porte web da vitrine com o chrome do app — desde a onda 3 da 2b (2026-09-20) as 15 vitrines têm porte web, então a moldura mostra sempre a vitrine que o app veste. E2e cobre a troca de moldura e a barra dentro do iframe.

### Fase 4 — Consumer sai do mock e converge · ~1 a 2 semanas · paralelo após a Fase 0

- Seed SQL em `supabase/seed/` com 1 loja demo por vitrine, portado de `lib/mock/dataset.ts` (com galeria, recorte, especificações, unidade, conteúdo, posts). Serve ao consumer, ao storefront, ao Playwright e ao preview.
- `EXPO_PUBLIC_USE_MOCK=false` no dev contra o Supabase local/staging.
- Correções que o mock escondia: `[slug].tsx` não seleciona `slug`; "Aberto" literal no layout padrão; `metadata.estoque` → `stock_quantity`; favoritos locais das vitrines → `useFavoritos`; realtime e `rpc` inertes no mock.
- Vitrines para os arquétipos sem layout, por prioridade: `heritage` (default de alimentação), `market`, `soft`. Implementar primeiro no RN, com spec no §5.6, depois no web.

**Status 2026-09-20 — parcial (seed + correções feitos; vitrines novas pendentes).** `scripts/gerar-seed-vitrines.mjs` (`pnpm seed:vitrines`) porta do mock do consumer 18 lojas-demo para o `seed.sql` — uma por vitrine (15) + `heritage`/`market`/`soft` — com lojista próprio, catálogo com metadata de vitrine, estoque real e posts do Explorar (tabela em `docs/dev/qa-local.md`). Correções que o mock escondia: `[slug].tsx` seleciona `slug`, `track_stock` e `stock_quantity`; Passarela lê o estoque real (`metadata.estoque` morreu); o "Aberto" literal saiu das 6 vitrines restantes (Editorial, Ritual, Smash, Noir, Artesã, Torra) e do layout padrão via `statusAbertura` (novo na lib, adotado também pelo `StatusAberto` do storefront); o home do consumer usa `agruparPorPiso`/`SUBTITULO_POR_PISO` da lib (mesma tabela do saguão). Favoritos locais das vitrines ficaram como estão: `useFavoritos` é de POSTS, não de produtos — não há store de favoritos de produto para convergir (decisão: manter o coração cosmético). `EXPO_PUBLIC_USE_MOCK=false` já é o `.env.local.example`; o runbook diz como apontar o app para o Supabase local. **Não verificado nesta sessão:** `supabase db reset` com o seed novo (Docker parado) e o app rodando contra ele. **Vitrine `heritage` feita (2026-09-20): `mesa`** — `LojaMesa` + `ProdutoMesa` no consumer (hero full-bleed com serifa em creme, selo de tradição, ornamentos, trilho de pratos, cardápio-livro com linha pontilhada, barra fixa) e porte web em `components/vitrines/mesa/` (16 vitrines registradas; `ARQUETIPOS_SEM_VITRINE` = market, playful, soft, tech, utility). Spec em `docs/store-theme/05` §5.6 e entrada no `02`. Validação: tsc consumer/storefront, 161 testes na lib, 20 no storefront, `next build`, fumaça 200 e revisão visual Firefox (topo + página inteira) sobre a loja real com `?preset=heritage&categoria=alimentos-bebidas`. O default de alimentação — a maior categoria — deixou de cair no layout padrão. **Pendente:** vitrines `market` e `soft` (RN + web).

### Fase 5 — Saguão web no apex · ~2 semanas · paralelo à Fase 2b, depende de 2a

Decisão 2026-09-19: entra neste ciclo.

- `middleware.ts`: apex `mallevo.com.br` (e `www`) deixa de cair em `notFound()` e roteia para o saguão; subdomínio e `stores.domain` continuam resolvendo loja.
- `app/(saguao)/`: Home com diretório de pisos (`PISOS` de `@mallevo/lib`, mesmo vocabulário do consumer: placas de wayfinding + corredores com fachadas vestidas pela pele da própria loja), Explorar com posts de `public_explore_feed` (grade de cartazes em retrato, player de vídeo, link para a loja e para o produto), página de piso com todas as lojas.
- Fachada de loja web = componente compartilhado com o storefront (`components/vitrines/_base/Fachada.tsx`) usando `resolveTheme`; é o mesmo tijolo do consumer (`FachadaLoja.tsx`) traduzido para web.
- Sem login no saguão: seguir/favoritar ficam para depois; o saguão é vitrine e porta de entrada.
- SEO: `sitemap.ts` do apex lista lojas ativas; metadata por piso.
- **Desktop nativo desde o início** (ao contrário das vitrines de loja): grid de pisos e corredores em 3 a 4 colunas, porque o apex é a página que mais recebe tráfego de busca em desktop.

**Pronto quando:** `mallevo.com.br` apresenta os pisos, as lojas ativas com a pele certa e os posts recentes, e cada fachada leva para `<slug>.mallevo.com.br`.

**Status 2026-09-20 — ✅ implementada.** `middleware.ts`: host sem slug (apex, `www`, `localhost` no dev) reescreve `/`, `/explorar` e `/piso/<slug>` para `app/saguao/` (URL canônica preservada; `/saguao*` direto redireciona 308; num host de loja o grupo não existe → 404). `lib/saguao.ts` lê só views públicas (`public_catalog_stores`, `public_catalog_products` — 3 destaques por loja numa query —, `public_explore_feed`) e resolve `urlDaLoja(slug)` pelo host (`https://<slug>.mallevo.com.br` / `http://<slug>.mallevo.localhost:3002`). Lib ganhou o agrupamento e o vocabulário dos pisos compartilhados com o consumer (`pisoDaCategoria`, `agruparPorPiso`, `NOME_CURTO_POR_PISO`, `SUBTITULO_POR_PISO`, `VOZ_POR_PISO`, `NOME_POR_CATEGORIA` — as views não expõem nome de categoria; 6 testes). UI: `components/saguao/{ChromeSaguao,Diretorio,Corredor,CartazPost,VisorPost,FontesDasLojas}` e a **`components/vitrines/_base/Fachada.tsx`** (o `FachadaLoja` do consumer: pele da loja via `resolveTheme` → CSS vars inline escopadas no card, então `bg-canvas`/`text-ink`/`font-display` leem a loja; véu que dissolve na cor do card com `color-mix`; sem Seguir — o saguão não tem login). Home = statement + diretório (âncoras) + "Agora no Explorar" + um corredor por piso (4 fachadas, "Ver todas" → `/piso/<slug>`); Explorar = grade de cartazes com visor (`?post=`) que toca o vídeo e leva à loja e ao produto, paginação keyset `?antes=`; desktop nativo (grade 2–4 colunas) e celular em coluna. SEO: metadata por página, `sitemap.xml` do apex (home, Explorar, pisos com loja, home de cada loja) e `robots.txt` liberado. Validação: tsc, 157 testes na lib, `next build`, fumaça (apex 200 nas 3 rotas, piso inexistente 404, host de loja intacto), revisão visual Firefox desktop 1280 e celular 480 — um bug corrigido (identidade da fachada pintada sob o véu do hero; banners acima da dobra viraram `eager`). Não feito: "voltar ao shopping" no header das vitrines (o fecho já leva ao apex) e o consumer ainda não consome `agruparPorPiso` da lib (mantém a cópia local).

---

## 4. Transversais

- **Seed demo** é infraestrutura de todas as fases: sem lojas reais com dados completos, nenhuma vitrine é testável fora do mock. **Feito em 2026-09-19:** `supabase/seed.sql` (lojista QA + Forno Demo com catálogo, metadata e conteúdo) + `scripts/qa-local.sh` + Playwright em `apps/web/e2e/` — runbook em `docs/dev/qa-local.md`. Depende do Docker daemon local para rodar.
- **CI**: adicionar `test` e `typecheck` ao `turbo.json`; hoje só `build/dev/lint`.
- **Docs**: atualizar `docs/store-theme/07` (21/44, vitrines, `StoreDesignProvider`), criar §5.7 em `05` para o storefront, registrar `stores.conteudo` em `03-design-tokens-e-schema.md` e em `docs/03-schema`.

## 5. Ordem de execução sugerida (primeiros 10 passos)

1. Migration `stores.conteudo` + views públicas com `categoria_slug`, `horarios`, `conteudo`.
2. `resolveVitrine` + `VITRINES` na lib; consumer passa a usar; teste de paridade.
3. Schema Zod de `product-metadata` na lib; `produtos.ts` do web adota.
4. `abertoAgora` na lib; consumer e storefront adotam (mata o "Aberto" literal).
5. Seed SQL demo (1 loja por vitrine).
6. Storefront 2a: `categoria_slug` no tenant, `StoreThemeRoot` global, contraste, tokens, primitivas.
7. Web 1a: galeria + recorte + especificações + unidade no form de produto.
8. Web 1b: conteúdo da vitrine + badge de vitrine + slug/URL únicos.
9. Storefront 2b onda 1 (alimentação), com PDP própria.
10. Web 1c: módulo `/conteudo`.
11. Storefront Fase 5: apex roteado + saguão (pisos, explorar, fachadas), em paralelo à onda 2 das vitrines.
12. Storefront 2b ondas 2 e 3; Fase 3 (preview em iframe); Fase 4 (consumer fora do mock).

## 5b. Achados do QA autenticado (2026-09-19)

Rodar o dashboard de verdade, logado, contra um banco reproduzido do zero revelou três problemas que nenhum `tsc` pegaria:

1. **Embed ambíguo `categoria:categories(...)` em `stores` (bug de PRODUÇÃO, corrigido).** Há duas relações entre `stores` e `categories` (a categoria da loja e as seções de cardápio), e o PostgREST devolve PGRST201 — confirmado também contra o projeto de produção. Efeitos: dashboard sempre no template genérico e badge sempre "Layout padrão"; onboarding sugerindo o arquétipo default; e no consumer fora do mock o select da loja falhava e a Home não carregava lojas. Correção: `categories!stores_categoria_id_fkey(...)` nos 8 pontos (web e consumer). O storefront nunca foi afetado (lê `categoria_slug` da view).
2. **Histórico de migrations não reproduzia do zero** (`push_tokens` criada na 004 e na 011; trigger de estoque criado na 005 e na 012). Corrigido tornando 011 e 012 idempotentes — sem efeito em produção (CLI rastreia por versão), e `supabase db reset` volta a funcionar para qualquer dev.
3. **Tutorial de boas-vindas bloqueia a interação** de tenant novo (modal). O seed marca `tutorial_template_visto` e os testes dispensam o tour se aparecer.

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| 15 vitrines web é muito código | Primitivas compartilhadas (2a) antes de qualquer vitrine; ondas por mercado real; layout padrão premium cobre o resto desde o dia 1 |
| Lojista real com dados vazios deixa a vitrine feia | Fallbacks explícitos em cada vitrine + card de saúde da loja apontando o que falta |
| Sair do mock expõe RLS e views incompletas | Seed + teste de integração das views públicas na Fase 0 |
| Vídeo no web (TUS, 50MB) | Portar a lógica do partner para `packages/lib`, não reescrever |
| Desktop sem spec | Coluna central 480px primeiro; desktop nativo só depois, e só onde há tráfego |

## 7. Decisões do dono do produto (fechadas em 2026-09-19)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Checkout do storefront | **Veste a pele da loja.** No app o checkout continua Mallevo (o app é o shopping; o storefront é a loja) |
| 2 | Desktop | **Coluna central de 480px** nas vitrines de loja; desktop nativo só depois e só nas mais usadas. Saguão do apex nasce responsivo nativo |
| 3 | Ordem das vitrines web | **Onda 1 = alimentação e mercado**, confirmada. Revalidar contra as categorias dos lojistas piloto quando existirem |
| 4 | Expor forma, modo escuro e fontes ao lojista | **Não.** Arquétipo + paleta + accent preservam a autoria dos arquétipos |
| 5 | Saguão web no apex | **Agora** (Fase 5 ativada, paralela à Fase 2b) |
| 6 | Multi-loja no dashboard web | **Fora deste ciclo** (recomendação; ver nota abaixo). Entra quando um lojista real tiver mais de uma unidade |

**Nota sobre multi-loja (decisão 6):** um tenant (CNPJ) pode ter várias `stores` (duas unidades da mesma padaria, ou um restaurante e um mercado do mesmo dono). O schema, a `@mallevo/lib` e o `apps/mobile-partner` já suportam isso (`SeletorLoja`, `lojaAtivaId`). O `apps/web` assume uma loja por tenant: toda action em `lib/actions/lojas.ts` faz `.single()`. Entrar no ciclo significaria um seletor de loja na sidebar e escopar todas as queries por `store_id`. Como nenhuma feature deste plano depende disso e não há lojista piloto multi-unidade, fica no backlog. Guarda-corpo: código novo deste ciclo recebe `store_id` explícito em vez de assumir "a loja do tenant", para a migração futura ser barata.
