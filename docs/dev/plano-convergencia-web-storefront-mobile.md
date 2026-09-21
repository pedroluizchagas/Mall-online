# Plano — Convergência web · storefront · mobile (StoreTheme e vitrines)

> Criado em 2026-09-19. **Revisado em 2026-09-21 após auditoria completa** (código, testes, build, smoke contra o Supabase real, capturas e estado da Vercel).
> Branch: `claude/partner-app` (13 commits à frente de `main`, tudo pushado).
> Objetivo: tudo o que foi construído nas vitrines e arquétipos do consumer passa a ser
> **controlado pelo lojista no `apps/web`** e **refletido no `apps/storefront`**, com os três
> renderizadores lendo o mesmo contrato de dados.

Como ler este documento:
- **§0** é o estado atual em uma página. Se você só tem cinco minutos, leia só ele.
- **§1 e §2** são o diagnóstico original e o princípio arquitetural (histórico e regras).
- **§3** são as Fases 0 a 5 com o status **auditado**, não o status declarado.
- **§4** é o resultado da auditoria: cada achado com evidência, causa, correção e critério de pronto.
- **§5** é a Fase 6, o plano de fechamento do ciclo, em ondas.
- **§6 a §8** são ordem de execução, riscos e decisões. **Apêndice A** tem os comandos de verificação que funcionam neste repo.

---

## 0. Estado em uma página (2026-09-21)

**Veredito:** as seis fases estão implementadas em código e as entregas estruturais são reais (18 vitrines nos três lados, contrato na lib, dashboard produzindo mídia e conteúdo, preview em iframe, seed com 18 lojas, saguão no apex). O ciclo **não está pronto para ser chamado de concluído**: há um XSS refletido reproduzível no `/preview`, limpezas declaradas como feitas ficaram pela metade no consumer, a Fase 2c não existe, não há CI, e as validações que dependem de Docker nunca rodaram. Produção está quatro commits atrás da branch.

### 0.1 Fase a fase

| Fase | Entregue | Provado em 2026-09-21 por | Pendências que contradizem o plano |
|---|---|---|---|
| 0 Contrato na lib | ✅ `VITRINES` (18), `resolveVitrine`, horários, `StoreConteudo`, `metadataProdutoSchema`, migration, higiene | 165 testes na lib; tsc; view `public_catalog_stores` de **produção** expõe `conteudo`, `categoria_slug`, `horarios` | `statusAbertura` erra o "até HH:MM" no turno da véspera (A-18); não existe schema para `stores.theme` (A-01) |
| 1 Dashboard produz | ✅ 1a mídia, 1b conteúdo + saúde, 1c `/conteudo`, 1d limpeza | tsc; `next build`; e2e rodou pela última vez em 2026-09-19 (só `vitrine.spec`) | Storage nunca limpa órfãos (A-04); URLs de mídia sem checagem de origem (A-03); gate de mídia hardcoded (A-17); fachadas do partner duplicam a lib (A-17); `conteudo.spec` nunca rodou |
| 2 Storefront veste | 2a ✅; 2b 18/18 portadas; **2c ❌** | tsc; 22 testes; `next build`; smoke: 18 vitrines com 200 e HTML distinto; capturas Firefox | PDP própria 0/18; 18/18 `'use client'`; duplicação de motores; sem `error.tsx`/`loading.tsx`; sem testing-library nem Playwright por arquétipo |
| 3 Preview = storefront | ✅ funcional, moldura App inclusa | smoke do `/preview?draft=` aplica tema e campanha; `?app=1` veste a barra; CSP `frame-ancestors` presente | **XSS refletido (A-01)**; 500 com `shape` inválido (A-02); CSP leva `localhost` para produção (A-13) |
| 4 Consumer converge | seed ✅ (19 lojas); Mesa, Gôndola e Cuidado ✅; correções **parciais** | tsc consumer; seed determinístico e idempotente | `metadata.estoque` vivo em `ProdutoPassarela` (A-05); "ABERTO" inventado em 6 vitrines (A-06); `db reset` e app fora do mock nunca rodados; vocabulário de pisos duplicado (A-19) |
| 5 Saguão no apex | ✅ | smoke apex (home, Explorar, piso, sitemap, robots, 308, 404); capturas desktop e celular | sem cache (A-12); destaques por corte global (A-12); visor sem gestão de foco (A-20); apex `mallevo.com.br` continua na LP (D-07) |
| Transversais | seed ✅; tasks no `turbo.json` ✅ | | sem CI (A-08); `apps/web` e mobile sem `test`/`typecheck` (A-08); docs do §4 não feitos (A-16) |

### 0.2 O que foi verificado nesta auditoria

| Verificação | Comando (Apêndice A) | Resultado |
|---|---|---|
| Typecheck | tsc local de web, storefront, consumer, partner, lib | exit 0 nos 5 |
| Testes unitários | `vitest run` em `packages/lib` e `apps/storefront` | 165 e 22 verdes |
| Build | `next build` em web e storefront | verdes (o do web falhou uma vez por rede do Google Fonts e passou na segunda) |
| Smoke contra o Supabase real | `next start` + override de QA na loja `guaimbe` | 18 vitrines com HTTP 200 e HTML distinto entre si; layout padrão para `tech`/`playful`; `/produto/[id]`, `/checkout`, `/entrar` 200 |
| Saguão | host sem slug | `/`, `/explorar`, `/piso/casa-vida`, `/sitemap.xml`, `/robots.txt` 200; `/saguao` 308; `/piso/inexistente` 404; host de loja + `/explorar` 404 |
| Preview | `/preview?draft=<base64url>` e `&app=1` | tema, sobrelinha, título e manifesto do rascunho no HTML; `noindex`; CSP presente; moldura com Início/Explorar/Pedidos/Perfil |
| XSS | draft com `color.accent = "red}</style><script>…"` | **reproduzido**: o `</style><script>` sai literal no HTML |
| Produção | REST anônimo na view pública; `curl` nos hosts | colunas novas presentes; `guaimbe.mallevo.com.br` serve o storefront novo; `mallevo.com.br` serve a LP |
| Visual | Firefox headless 480 e 1280 | saguão, Artesã, Mesa, Gôndola, Cuidado, Forno, padrão e moldura App renderizam |

### 0.3 O que NÃO foi verificado (e nunca foi, em nenhuma sessão)

- `pnpm qa:local`: as 5 specs Playwright do dashboard (`vitrine.spec` rodou verde em 2026-09-19, antes da moldura App; `conteudo.spec` nunca rodou).
- `supabase db reset` com o seed de 18 lojas geradas.
- O consumer rodando contra o Supabase local (`.env.local` do dev ainda está em `EXPO_PUBLIC_USE_MOCK=true`).
- Vídeo real publicado pelo navegador (TUS) no `/conteudo`.

Motivo: os três dependem do Docker daemon, que estava parado; `sudo` pede senha em sessão autônoma.

### 0.4 Estado do deploy

- Vercel: os deploys de **produção** de `storefront-mallevo` e `mall-online-web` são de 2026-09-20 por volta das 19h08, **anteriores** aos quatro últimos commits (fix do slug que reprovisiona o domínio, saúde da loja completa, Gôndola e Cuidado). Esses existem só como Preview.
- `main` está 13 commits atrás da branch.
- O apex `mallevo.com.br` e `www` continuam no projeto da LP; o saguão só responde em `storefront-mallevo.vercel.app`.
- A rota `/preview` **está em produção** (Fase 3 foi deployada), então o XSS A-01 é explorável hoje em qualquer `<slug>.mallevo.com.br/preview?draft=…`.
- Produção tem 3 lojas ativas; uma é `loja-teste-*`, sem tema, e aparece no saguão. O feed do Explorar está vazio.

---

## 1. Diagnóstico original (2026-09-19, histórico)

### 1.1 Três renderizadores, um só sabia o que é uma vitrine

| Superfície | O que renderizava | Onde decidia o layout |
|---|---|---|
| `apps/mobile-consumer` | 21 peles + 15 vitrines com layout próprio | Gate `preset × categoria_slug` hardcoded em `app/loja/[slug].tsx` |
| `apps/storefront` | 21 peles sobre um único layout genérico | Não decidia; nem carregava `categoria_slug` |
| `apps/web` (preview) | Celular desenhado à mão em JSX (~870 linhas), só cores/raio/fonte | Não decidia; estrutura fixa com "Aberto · 8h–20h" literal |

Consequências: o lojista escolhia um arquétipo sem saber que ele ativa uma vitrine; a mesma loja era visualmente diferente entre app e web; o preview era uma terceira implementação da UI de loja.

### 1.2 O consumer rodava em mock, e as vitrines dependiam de dados que só o mock produzia

| Dado lido pelas vitrines | Produtor real no web (em 09-19) | Efeito sem o dado |
|---|---|---|
| `products.metadata.galeria` | nenhum | PDP com 1 foto |
| `products.metadata.recorte` | nenhum | "produto flutuando" nunca acende |
| `products.metadata.especificacoes` | nenhum | ficha técnica vazia |
| `products.metadata.unidade` | nenhum | preço sem unidade |
| `products.metadata.estoque` | nenhum; a coluna real é `stock_quantity` | chip de escassez nunca acende |
| Copy de hero, manifesto, destaques | não existia campo | texto fixo para toda loja |
| `stores.horarios` | existia | layout padrão e storefront mostravam "Aberto" literal |

### 1.3 Conteúdo (posts) só nascia no celular do lojista

O `apps/web` tinha zero referências a `store_posts`; só o `apps/mobile-partner` publicava.

### 1.4 Lacunas do storefront

Sem gate de vitrine; `StoreThemeRoot` só em `/` e `/produto/[id]`; 12 componentes com `bg-accent text-ink`; tokens neutros divergentes; apex caía em "loja não encontrada"; zero testes.

### 1.5 Lacunas do dashboard

Preview infiel; slug só em `/configuracoes`; duas URLs na UI (`mallevo.app/` vs `<slug>.mallevo.com.br`); código morto (`preview-loja.tsx`, `botao-copiar-link.tsx`, `atualizarImagensLoja`); dashboard mono-loja.

### 1.6 Lacunas da engine e dos docs

6 dos 21 arquétipos sem vitrine (`heritage`, `soft`, `tech`, `market`, `utility`, `playful`); whitelist de 11 presets no teste de `onboard-tenant`; roadmap 07 desatualizado; `provider.tsx` da lib sem consumidor.

---

## 2. Princípio arquitetural e regras de engenharia

**Uma fonte de verdade, um decisor, três renderizadores.**

1. **Fonte de verdade** = banco: `stores.theme` (pele), `categories.slug` (nicho), `stores.conteudo` (editorial), catálogo com `metadata` validado, `store_posts`.
2. **Decisor** = `@mallevo/lib`: `resolveTheme` + `resolveVitrine(preset, categoriaSlug)` + schemas Zod do contrato de dados.
3. **Renderizadores** = consumer (RN), storefront (Next) e o preview do dashboard, que é o storefront real em iframe.

Regra original: nenhuma vitrine, em nenhuma superfície, inventa dado. O que não vier do lojista tem fallback explícito e visível para ele no dashboard.

**Regras adicionadas pela auditoria de 2026-09-21** (valem para todo código novo e para as correções do §4):

| # | Regra | Por quê |
|---|---|---|
| R1 | **Tema é entrada não confiável.** Venha do banco ou de `?draft=`, passa por `storeThemeConfigSchema` antes de virar CSS. `hasExplicitPreset` não é validação. | A-01, A-02 |
| R2 | **Toda referência a mídia gravada pelo servidor é validada por prefixo do tenant e por bucket.** URL "parece https" não é critério. | A-03 |
| R3 | **Substituir ou remover mídia apaga o objeto antigo.** Nada fica órfão no Storage. | A-04 |
| R4 | **Nenhuma superfície inventa status.** Sem horários, sem chip; nunca "ABERTO" como fallback. | A-06 |
| R5 | **Toda guarda vira teste de disco.** Se a regra é "não usar X", existe um teste que faz grep e falha. | A-05, A-06, A-09 |
| R6 | **Uma fase só recebe ✅ com data e comando.** tsc + testes + build + e2e rodado naquela data, registrado no status. Sem e2e rodado, o status é "em código". | §0.3 |
| R7 | **Código novo do storefront nasce server component com ilhas.** `'use client'` só no componente que tem interação. | A-10 |
| R8 | **Helper repetido em duas vitrines vai para `_base/`.** Terceira cópia é bug. | A-11 |
| R9 | **Toda escrita no web recebe `store_id` explícito.** Guarda-corpo do multi-loja (decisão 6). | §8 |

---

## 3. Fases — entregas e status auditado

### Fase 0 — Contrato compartilhado em `packages/lib` · concluída

**Entregas planejadas:** `store-theme/vitrines.ts` (`VITRINES`, `resolveVitrine`), `loja/conteudo.ts` (`StoreConteudo` v1), `catalogo/metadata-produto.ts` (schema único; `metadata.estoque` morre), `loja/horarios.ts` (`abertoAgora`, `horarioDeHoje`), migration `stores.conteudo` + views, higiene (whitelist 21, roadmap 07, `provider.tsx`).

**Status auditado em 2026-09-21:**
- ✅ `packages/lib/src/store-theme/vitrines.ts`: **18** entradas (não 15, como o status anterior dizia), cada uma com `codigo`, `nome`, `arquetipo`, `categorias`, `barra` (`fixa`/`pilula`), `componentes`, `descricao`; `resolveVitrine`, `getVitrineDoArquetipo`, `ARQUETIPOS_SEM_VITRINE` derivado = `playful`, `tech`, `utility`. Os testes conferem de verdade a paridade lib ↔ disco do consumer ↔ `mapping.ts`.
- ✅ `loja/horarios.ts`: `normalizarHorarios`, `horarioDeHoje`, `abertoAgora` (turno noturno de hoje e da véspera), `statusAbertura`, `relogioDaLoja` (fuso da loja para servidor em UTC). ⚠️ A-18: aberta pelo turno da véspera com turno próprio hoje mostra o `fecha` errado.
- ✅ `loja/conteudo.ts`: `CONTEUDO_LIMITES`, `storeConteudoSchema`, `normalizeStoreConteudo` com recuperação campo a campo, `hasConteudo`.
- ✅ `catalogo/metadata-produto.ts`: `UNIDADES_VENDA`, `metadataProdutoSchema` (galeria ≤ 10, recorte, especificações ≤ 12, unidade, templates), `lerMetadataProduto`. `estoque` fora do schema. `apps/web/lib/actions/produtos.ts` importa e apenas aliasa.
- ✅ Migration `20260919120000_stores_conteudo.sql` aplicada em produção; `packages/types/src/supabase.ts` com `conteudo` em `stores` e na view.
- ✅ Whitelist de 21 no teste e na function `onboard-tenant`; `zod` e `tus-js-client` nas dependências da lib.
- ⚠️ "`provider.tsx` removido" vale para `store-theme/provider.tsx`. O `templates/provider.tsx` (`TemplateProvider`/`useTemplate`) continua existindo **e é necessário** pelo `(dashboard)/layout.tsx`.
- ✅ O erro de tsc do web (`@types/react` 19 vazando) foi resolvido com `paths` no `tsconfig.json` do app e `types/react-experimental.d.ts`. Voltar a quebrar = alguém removeu os `paths`.
- ❌ **Faltou** o que a auditoria mostrou ser o item mais importante do contrato: um schema Zod para `StoreThemeConfig`. Hoje `resolveTheme` espalha `color`, `fonts` e `shape` crus (A-01).

**Validação registrada:** lib 165 testes; tsc limpo nos 5 pacotes (2026-09-21).

### Fase 1 — O dashboard produz o que as vitrines consomem · em código; e2e parcial

**Entregas planejadas:** 1a mídia do produto (galeria, recorte, ficha técnica, unidade); 1b conteúdo da vitrine, badge de vitrine, URL única, saúde da loja; 1c módulo `/conteudo`; 1d limpeza.

**Status auditado em 2026-09-21:**

*1a — Produto* ✅ em código.
- `components/dashboard/produto-midia-vitrine.tsx`: galeria (multi-upload, manter/remover, teto 10), recorte PNG/WebP, ficha técnica em pares (teto 12), unidade de venda via `UNIDADES_VENDA`.
- `aplicarMidiaVitrine` em `lib/actions/produtos.ts`: valida MIME e tamanho no servidor, sobe em `product-images/{tenant}/galeria-*|recorte-*`, honra `galeria_mantida` e `remover_recorte`; `criarProduto`/`atualizarProduto` escopam por tenant.
- ⚠️ O gate não é por `DashboardTemplate.produto.camposExtras` como planejado: só a unidade tem gate, hardcoded por `template.codigo === 'food' || 'generic'` em `produto-form.tsx`; galeria, recorte e ficha aparecem para todos os templates (A-17).
- ❌ Nenhuma limpeza de órfãos: galeria removida, recorte trocado e `excluirProduto` deixam objetos no bucket (A-04). `galeria_mantida` aceita qualquer `https?://` (A-03). Extensão do objeto vem do nome do arquivo, não do MIME (A-17).

*1b — Minha Loja* ✅ em código.
- `components/dashboard/conteudo-vitrine.tsx`: campanha com contadores, texto da casa, destaques ≤ 6 com busca e ordem, fotos da casa ≤ 8. `publicarVitrine` valida com `storeConteudoSchema`, sobe em `store-assets/{tenant}/casa-*`, filtra destaques para produtos da loja, grava `null` quando vazio.
- O badge de vitrine chama-se **`PainelVitrine`** (`components/dashboard/painel-vitrine.tsx`), não `AvisoVitrine` como o status anterior registrava.
- Saúde da loja (`getSaudeLoja` em `lib/actions/home.ts`): endereço público `domain × slug` com CTA "Provisionar", banner, descrição, campanha, "galeria em N produtos". `provisionarEnderecoPublico` é idempotente; `atualizarDadosGerais` provisiona antes de gravar o slug.
- **Decisão mantida:** slug NÃO é editável em Minha Loja (trocar slug = provisionar domínio; o incidente de TLS de 2026-09-20 nasceu de um slug trocado sem provisionar). Único ponto de escrita em Configurações.
- ⚠️ `publicarVitrine` grava `conteudo = null` sempre que o FormData não traz o campo, e ignora `galeria_casa` nesse caso (A-17). Logo/banner/fotos da casa substituídos nunca são apagados (A-04). `galeria_casa_mantida` aceita qualquer URL (A-03).

*1c — `/conteudo`* ✅ em código.
- Listagem em grade com `badgeDoPost`, KPIs, filtros por searchParams, barra de uso do plano, card de órfãos; `[id]` edita legenda/tags/produto, alterna `published ⇄ hidden`, remove com confirmação dupla e delete best-effort no bucket; `novo` publica foto (Canvas 1440/720) e vídeo (TUS ≤ 60 s/50 MB, frame de 1 s como capa) direto no `explore-media`; `criarPost` confere tenant, `tenantPodePublicar`, loja e produto da loja. Sidebar e command palette.
- Porte para a lib: `packages/lib/src/conteudo/posts.ts` e `tus.ts`. ⚠️ As "fachadas" do partner são parciais: `detectarOrfaos` reimplementa `orfaosDoPrefixo`; `conteudo.ts` duplica `CAP_BUCKET_BYTES`, montagem de caminhos e a mensagem do trigger (A-17).
- ❌ `criarPost` aceita `media_path`/`media_url` sem conferir prefixo do tenant nem bucket (A-03). `listarPosts` roda duas vezes por render da listagem (A-17).
- ⚠️ `e2e/conteudo.spec.ts` cobre lista + filtro, edição + ocultar, foto pelo navegador. Não cobre vídeo, remoção, órfãos nem limite de plano. **Nunca rodou.**

*1d — Limpeza* ✅. `preview-loja.tsx`, `botao-copiar-link.tsx` e `atualizarImagensLoja` não existem mais; `mallevo.app/` só sobrevive num comentário de `lib/storefront-url.ts`.

**Validação registrada:** tsc e `next build` do web (2026-09-21). `vitrine.spec` verde em 2026-09-19 (antes da moldura App). `conteudo.spec` nunca executado.

### Fase 2 — O storefront veste as vitrines · 2a e 2b concluídas; 2c não iniciada

**2a — Infraestrutura** ✅
- Route group `app/(loja)/` (catálogo, `produto/[id]`, `checkout` + `pix`, `pedido/[id]`, `entrar`, `verificar`, `preview`) com `layout.tsx` que monta `StoreThemeRoot` uma vez; as CSS vars vão para `:root`; coluna central de 480px. Páginas legais, `loja-nao-encontrada` e `saguao/` ficam fora do grupo.
- `lib/tenant.ts`: `buscarStore` (nullable, `cache()`) + `getStore` (`notFound`); `Store` com `categoria_slug`, `conteudo`, `horarios`, `tempo_entrega: number | null`; `select('*')` de propósito (seleção nomeada derrubava lojas num banco sem a migration). Lê `x-preview-preset`/`x-preview-categoria`.
- `lib/vitrine.ts` + `components/vitrines/{index,tipos,Padrao}.tsx`: `VITRINES_WEB` é `Record<VitrineCodigo, …>` completo; `escolherVitrineWeb` → `VitrinePadrao`.
- `_base/`: `HeroLoja`, `StatusAberto` (relógio por minuto, `statusAbertura` + `relogioDaLoja`), `NavSecoes` (IntersectionObserver), `FechoLoja`, `Sacola` (sem FAB), `FonteDna`, `useCarrossel.ts`, `movimento.ts`, `Fachada.tsx`; `components/store/ProdutoModalHost.tsx`.
- Contraste: zero `bg-accent text-ink` e `bg-ink text-accent`. Tokens neutros sincronizados (`canvas #F1F1F3`, `canvasAlt #E7E7EA`, `line #E4E4E7`); `body` em `--font-body`. ⚠️ `lib/consumer-design.ts` ficou morto, ainda com `surfaceDark` (A-21).
- `middleware.ts`: descarta `x-preview-*` do cliente e só reinjeta com `STOREFRONT_ALLOW_PREVIEW_OVERRIDE === 'true'`; sem a env é impossível ativar. `stores.domain` não é resolvido (decisão registrada abaixo).
- **Decisões tomadas na execução (mantidas):** (1) `stores.domain` no middleware não foi feito, o provisionamento só cria `<slug>.mallevo.com.br`. (2) Fontes via `<link>` do Google Fonts por tenant; fontes-DNA por vitrine via `FonteDna`. (3) A barra de 4 abas do app não existe no web fora da moldura App; o fecho leva ao apex. (4) `next lint` nunca foi configurado no storefront.
- ❌ Não existe `error.tsx`, `global-error.tsx` nem `loading.tsx` em `app/`, `(loja)` ou `saguao` (A-07).

**2b — Vitrines** ✅ 18/18 portadas (ondas 1 a 3 mais Mesa, Gôndola e Cuidado da Fase 4), com ressalvas de arquitetura.
- Cada vitrine vive em `components/vitrines/<codigo>/{Vitrine<Nome>.tsx, <codigo>-ui.tsx}` e está registrada; a guarda `registro.test.ts` exige paridade total com a lib.
- Adaptações registradas: barra de menu do app só na moldura App; pôster do Forno virou pager scroll-snap; `conteudo.campanha/manifesto/destaques` alimentam wordmark, manchete, statement e molduras com a derivação da RN como fallback; Passarela elege a primeira seção com fotos como coluna; ADIÇÃO RÁPIDA em Passarela, Clínica, Magazine e Gôndola (`useCartStore.adicionarItem`, `pendingTrocaLoja`, item com variação ou `exige_receita` abre o detalhe); Artesã usa `StatusAberto`, lê `conteudo.manifesto` e mostra `galeria_casa` numerada; coração de favorito fora (web não tem favoritos). Bug pego no smoke: `Store.tempo_entrega` era `string` (a view devolve número).
- Revisão visual das três ondas com Firefox headless; correções: heros com `loading="lazy"` no Forno e na Horta viraram `eager`/`fetchPriority=high` via prop `carregamento`; heros em `svh` ganharam teto; header sticky da Feira corrigido; numeração das seções da Artesã calculada no pai.
- ❌ **PDP própria: 0 de 18.** As 18 têm `// TODO(2b): PDP própria` e usam `ProdutoModalHost` → `ProductModal`; `/produto/[id]` renderiza a vitrine inteira com `initialProdutoId`. O texto original "Cada vitrine = `{Vitrine,Pdp}.tsx`" não é verdade para nenhuma (A-14).
- ❌ **18/18 são `'use client'` inteiras** (500 a 1.438 linhas cada, 17,8 mil no total). A promessa "server component com ilhas client" não se cumpriu (A-10).
- ⚠️ Só 3 vitrines (Artesã, Clínica, Magazine) usam `_base/useCarrossel`; 6 mantêm motor local (Editorial, Noir, Raw, Serena, Volt, Torra). `prefereMenosMovimento` está copiada em 8 arquivos; relógios locais em Horta e Ritual; `exigeEscolha` ×4, `precoFinalDe` ×9, `repartirDescricao` ×3 (A-11).
- ⚠️ Feira: a foto do hero (`DiscoFoto`) está `loading="lazy"`; é a imagem de LCP (A-09).
- ✅ Sem elementos interativos aninhados nas 18.

**2c — Qualidade** ❌ não iniciada.
- Não há `@testing-library/*`; `vitest.config.ts` é `environment: 'node'` e só inclui `*.test.ts`. Os 22 testes são: gate `resolveVitrineDaLoja` (2) e registro lido como **texto** por regex (20). Zero teste de componente, de `ShellApp`, de `rascunho.ts` ou de `StoreThemeRoot`.
- Não existe `apps/storefront/e2e/`; nenhum `toHaveScreenshot`; o único screenshot é de evidência da loja Forno no `vitrine.spec` do web.
- `turbo.json` tem `test` e `typecheck`, mas só storefront e lib implementam os scripts (A-08).

**Ferramenta de QA (mantida):** com `STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true`, `?preset=<arquetipo>&categoria=<slug>` troca pele e categoria só naquele request. Nunca ligar em produção.

**Desktop (decisão mantida):** coluna central de 480px nas vitrines de loja; desktop nativo só depois e só nas mais usadas; saguão nasce responsivo.

**Validação registrada:** tsc, 22 testes, `next build`, smoke das 18 com 200 e HTML distinto, capturas (2026-09-21).

### Fase 3 — Preview do dashboard = storefront real · concluída, com falha de segurança

**Entregas planejadas:** rota de preview que aceita tema e conteúdo de rascunho sem persistir; dashboard troca o celular JSX por iframe com molduras; remoção de ~870 linhas do editor.

**Status auditado em 2026-09-21:**
- ✅ `app/(loja)/preview/page.tsx` + `lib/rascunho.ts`: `?draft=` (base64url com `theme`, `conteudo`, `categoria`) aplicado só no request, `force-dynamic`, `robots: noindex`, `robots.txt` bloqueia `/preview`, CSP `frame-ancestors` em `next.config.mjs`.
- ✅ `?app=1` → `components/store/ShellApp.tsx`: status bar em `mix-blend-mode: difference`, botão de voltar só no layout padrão, barra Início/Explorar/Pedidos/Perfil no molde de `VITRINES` (`fixa`/`pilula`). ⚠️ O deslocamento de 47px é uma regra CSS global `[data-shell-app] .sticky.top-0 { top: 47px }`, acoplada à string `sticky top-0`; os `scroll-mt-*` das âncoras não ganham os 47px (A-15).
- ✅ Web: `components/dashboard/preview-vitrine.tsx` (molduras Celular 390, Computador 1280, App Mallevo 390×844; telas Início/Produto; debounce 600 ms; aviso de mídia não publicada; iframe com `sandbox`), `painel-vitrine.tsx`, `lib/storefront-url.ts` como fonte única de href. `minha-loja-editor.tsx` tem 797 linhas (era 1.565). ⚠️ `key={src}` remonta o iframe a cada debounce (A-21).
- ✅ E2e `vitrine.spec` cobre iframe com `draft`, título do rascunho no `h1` e troca para a moldura App. Não cobre Celular↔Computador nem a tela Produto. Rodou pela última vez em 2026-09-19.
- ❌ **A-01 (crítico):** `aplicarRascunho` só confere `preset`; `resolveTheme` espalha `color`, `fonts` e `shape` crus; `StoreThemeRoot` concatena tudo em `<style dangerouslySetInnerHTML>`. Payload com `</style><script>` executa no host da loja. Reproduzido em 2026-09-21.
- ❌ **A-02 (alto):** `shape.radius`/`density` fora do enum → `TypeError` em `to-css-vars.ts` → 500.
- ⚠️ **A-13:** `frame-ancestors` leva `http://localhost:3000` e `:3100` para produção; as demais rotas não têm `frame-ancestors`/`X-Frame-Options` (clickjacking possível no checkout).

### Fase 4 — Consumer sai do mock e converge · seed e 3 vitrines concluídos; correções parciais

**Entregas planejadas:** seed com 1 loja por vitrine; `EXPO_PUBLIC_USE_MOCK=false`; correções que o mock escondia; vitrines para `heritage`, `market`, `soft`.

**Status auditado em 2026-09-21:**
- ✅ `scripts/gerar-seed-vitrines.mjs` (`pnpm seed:vitrines`) lê `lib/mock/dataset.ts` e `feed.ts` via esbuild, é determinístico (UUID e CNPJ por md5) e gera um bloco delimitado no `supabase/seed.sql` com `ON CONFLICT DO NOTHING`: 18 lojas geradas + `forno-demo` manual = 19; produtos com `galeria` (163), `recorte` (7), `especificacoes` (58), `unidade` (20), `track_stock`/`stock_quantity` reais; 10 posts. ⚠️ O `conteudo` das 18 geradas é só `{v:1, destaques, galeria_casa}`, sem `campanha` nem `manifesto`; o cabeçalho imprime `(+ arquétipos )` vazio (A-21).
- ✅ `app/loja/[slug].tsx` usa `resolveVitrine` da lib, seleciona `slug`, `track_stock`, `stock_quantity`, e despacha as 18 vitrines + `BarraMenuPadrao`. ⚠️ `useState<any>` para a loja e `as any` em produto; o dispatch são cadeias de 14 e 18 ternários (A-19).
- ✅ `LojaMesa`/`ProdutoMesa`, `LojaGondola`/`ProdutoGondola`, `LojaCuidado`/`ProdutoCuidado` com `BarraMenu<X>` próprias; portes web registrados; specs no `05` §5.6 e entradas no `02`.
- ❌ **A-05:** `ProdutoPassarela.tsx` ainda lê `metadata.estoque`; só a listagem (`LojaPassarela`) migrou para `stock_quantity`. O status anterior ("`metadata.estoque` morreu") estava errado.
- ❌ **A-06:** "ABERTO" inventado sobrevive: incondicional em `LojaRaw`, `LojaRitual` ("Aberto para pedidos" + `'ABERTO'`) e `LojaHorta`; como fallback sem horários em `LojaForno`, `LojaFeira` e `LojaPassarela`. Nove vitrines RN não usam `statusAbertura` (Clínica, Feira, Forno, Horta, Magazine, Passarela, Raw, Serena, Volt). O status anterior ("o Aberto literal saiu das 6 vitrines restantes") cobria só Editorial, Ritual, Smash, Noir, Artesã e Torra, e mesmo Ritual ficou pela metade.
- ✅ A home do consumer **usa** `agruparPorPiso` e `SUBTITULO_POR_PISO` da lib (o status da Fase 5 dizia o contrário; estava errado). ⚠️ `FachadaLoja.tsx` redeclara `VOZ_POR_PISO` e `Diretorio.tsx` redeclara `NOME_CURTO`, cópias idênticas da lib (A-19).
- ⚠️ Favoritos: coração cosmético com `useState<Set>` local em Editorial, Magazine, Serena, Raw e Volt; ausente nas outras 13. Decisão mantida (não há store de favoritos de produto), mas é UI que promete o que não guarda; registrar como decisão de produto (D-11).
- ⚠️ `.env.local.example` tem `EXPO_PUBLIC_USE_MOCK=false`; o `.env.local` da máquina de dev ainda está em `true`. O app nunca rodou contra o seed.
- ⚠️ `docs/dev/qa-local.md` ainda diz "layout padrão" para `sabor-mineiro`, `tintas-aurora` e `esmalteria-lilas`, que hoje têm Mesa, Gôndola e Cuidado (A-16).

**Validação registrada:** tsc consumer; capturas web das três vitrines novas (2026-09-21). `db reset` e app fora do mock: nunca.

### Fase 5 — Saguão web no apex · concluída, sem cache

**Entregas planejadas:** apex e `www` roteados para o saguão; Home com diretório de pisos e corredores com fachadas vestidas; Explorar; página de piso; fachada compartilhada; SEO; desktop nativo.

**Status auditado em 2026-09-21:**
- ✅ `middleware.ts`: host sem slug reescreve `ROTAS_SAGUAO` (`/`, `/explorar`, `/piso/<slug>`) para `app/saguao/`; `/saguao*` direto → 308; num host de loja o `saguao/layout.tsx` chama `notFound()`. ⚠️ `getSubdomain` reconhece só `MAIN_DOMAINS`; qualquer host desconhecido (preview da Vercel, IP) vira saguão com URLs de loja inválidas no sitemap; sem `toLowerCase()` no host (A-21).
- ✅ `lib/saguao.ts` lê só `public_catalog_stores`, `public_catalog_products` e `public_explore_feed`; `urlDaLoja` e `urlDoShopping` são host-aware. ❌ As três páginas são `force-dynamic`, o client lê `cookies()`, e não há `revalidate`/`unstable_cache`: 3 queries por hit na página que mais recebe tráfego anônimo (A-12). ⚠️ `carregarDestaques` ordena globalmente por `ordem` e corta em `n × 12`; uma loja com `ordem` altos pode ficar sem destaque (A-12).
- ✅ `components/saguao/{ChromeSaguao,Diretorio,Corredor,CartazPost,VisorPost,FontesDasLojas}` e `components/vitrines/_base/Fachada.tsx` (pele via `resolveTheme` → CSS vars inline escopadas). ⚠️ `FontesDasLojas` deduplica por href mas rende um `<link>` por família dentro do body (A-21).
- ✅ Lib: `PISOS`, `pisoDaCategoria`, `agruparPorPiso`, `NOME_CURTO_POR_PISO`, `SUBTITULO_POR_PISO`, `VOZ_POR_PISO`, `NOME_POR_CATEGORIA`, com 6 testes.
- ✅ SEO por host: sitemap da loja (home + `/produto/[id]`) ou do saguão (home, Explorar, pisos com loja, home de cada loja); `robots.txt` bloqueia `/preview` e `/saguao`; `generateMetadata` com canonical nas 3 páginas.
- ⚠️ Explorar: `?post=` abre o visor com `role="dialog"`, Escape e scroll lock, mas sem foco inicial, sem focus trap, sem restauração de foco; foto do post com `alt=""` (A-20).
- Não feito e registrado: "voltar ao shopping" no header das vitrines (o fecho já leva ao apex).

**Validação registrada:** smoke apex e capturas 1280/480 (2026-09-21).

---

## 4. Auditoria de 2026-09-21 — achados e correções

Formato: **ID · severidade · superfície**. Cada item traz onde está, o que acontece, por que importa, como resolver e quando está pronto. As referências `arquivo:linha` valem para o commit `3a8a12a`.

### 4.1 Segurança

**A-01 · Crítico · storefront + lib — XSS refletido em `/preview?draft=`**
- Onde: `apps/storefront/lib/rascunho.ts:30-42` (`aplicarRascunho` aceita `theme` só com `hasExplicitPreset`); `packages/lib/src/store-theme/resolve.ts:60-70` (`normalizeTheme` faz cast de `color`, `fonts`, `shape`) e `:95-118` (`resolveTheme` espalha); `apps/storefront/components/store/StoreThemeRoot.tsx:47-54` (`:root{--accent:${v}}` em `<style dangerouslySetInnerHTML>`).
- O que acontece: `?draft=` com `color.accent = "red}</style><script>…</script><style>"` sai literal no HTML servido em `<slug>.mallevo.com.br`. Reproduzido no `next start` local contra a loja real. `fonts.display` malicioso também vai para `--font-display` e para o `href` do Google Fonts. Sem limite de tamanho do draft.
- Por que importa: executa no domínio da loja, onde vive a sessão do consumidor; `/preview` está em produção; o próprio dashboard oferece "Abrir o preview em nova aba". `frame-ancestors` não protege quem abre a URL direto.
- Como resolver:
  1. Criar `packages/lib/src/store-theme/schema.ts` com `storeThemeConfigSchema` (zod, `.strict()`): `preset` em `PRESETS`; `palette` string ≤ 40; `color` objeto parcial com cada chave em `^#[0-9A-Fa-f]{6}$`; `fonts.display`/`fonts.body` em allowlist das famílias suportadas por `google-fonts.ts`; `shape.radius` e `shape.density` nos enums de `RADIUS_STEPS_PX`/`DENSITY_SPACE_PX`; `mode` em `light|dark`. Exportar `parseStoreTheme(raw): StoreThemeConfig | null`.
  2. `normalizeTheme` (lib) passa a usar `parseStoreTheme`; entrada inválida cai no arquétipo original. Assim banco e rascunho passam pelo mesmo portão (R1).
  3. `aplicarRascunho` usa `parseStoreTheme`; inválido → mantém o tema publicado. Rejeitar `draft` com mais de 8 KB antes do `JSON.parse`.
  4. Defesa em profundidade em `StoreThemeRoot`: só emitir valores que casem `^[#\w\s,.%()"'-]+$`; qualquer outro é descartado. Alternativa: escrever as vars como atributo `style` de `<html>` via `next/headers` em vez de `<style>`.
  5. Testes: na lib, `schema.test.ts` rejeita `</style>`, hex inválido, fonte fora da allowlist e `radius` desconhecido; no storefront, `rascunho.test.ts` com os mesmos payloads garante que `aplicarRascunho` devolve o tema publicado; e2e do preview com draft hostil verifica que o HTML não contém `<script>` fora dos bundles do Next.
- Pronto quando: os testes acima estão verdes, o payload de prova devolve a loja com o tema publicado, e o deploy de produção contém a correção (A-22).
- Esforço: 1 dia.

**A-02 · Alto · lib — `/preview` cai em 500 com `shape` inválido**
- Onde: `packages/lib/src/store-theme/to-css-vars.ts:38-39,55-63` (`RADIUS_STEPS_PX[t.shape.radius]` com chave desconhecida → `undefined.sm`).
- Como resolver: coberto pelo schema de A-01; além disso `toCssVars` usa `RADIUS_STEPS_PX[radius] ?? RADIUS_STEPS_PX.md` (defensivo).
- Pronto quando: draft com `shape.radius: 'nope'` devolve 200 com o raio do arquétipo.

**A-03 · Alto · web + lib + banco — referências a mídia aceitas sem checagem de origem**
- Onde: `apps/web/lib/actions/conteudo.ts:113-160` (`criarPost` grava `media_path`, `media_url`, `thumb_*` como vieram); `packages/lib/src/conteudo/posts.ts:200-214` (`novoPostSchema` só exige `min(1)` e `.url()`); `apps/web/lib/actions/produtos.ts:198-210` (`galeria_mantida` filtra só `^https?://`); `apps/web/lib/actions/loja-vitrine.ts:195` (`galeria_casa_mantida` idem).
- O que acontece: um lojista autenticado pode gravar no feed público uma URL externa, ou o objeto de outro tenant, ou colocar qualquer URL em `metadata.galeria`/`conteudo.galeria_casa`.
- Como resolver:
  1. Lib: `caminhoPertenceAoTenant(path, tenantId, storeId)` e `urlPublicaDoBucket(bucket, path)`; `novoPostSchema` ganha `.superRefine` que exige `media_path` com o prefixo de `caminhosDoPost` e `media_url === urlPublicaDoBucket('explore-media', media_path)`; mesmo para `thumb_*`.
  2. Web: `criarPost` chama o refine com `tenant.id`/`loja.id` reais; `galeria_mantida` e `galeria_casa_mantida` só aceitam URLs que começam pela URL pública do bucket + `/${tenant.id}/` (uma função `filtrarUrlsDoTenant(urls, bucket, tenantId)` em `lib/upload-servidor.ts`).
  3. Banco: migration com `CHECK (media_path LIKE tenant_id::text || '/' || store_id::text || '/%')` em `store_posts` (e o equivalente para `thumb_path` quando não nulo).
  4. Partner: reutiliza os mesmos helpers da lib (fecha a duplicação de A-17).
- Pronto quando: teste de unidade rejeita URL externa e prefixo de outro tenant; e2e do `/conteudo` publica foto e o post gravado tem `media_path` com o prefixo do tenant; migration aplicada.
- Esforço: 1 dia.

**A-13 · Médio · storefront — CSP e clickjacking**
- Onde: `apps/storefront/next.config.mjs:8-13` (`frame-ancestors 'self' https://app.mallevo.com.br http://localhost:3000 http://127.0.0.1:3000 http://localhost:3100 http://127.0.0.1:3100`, aplicado só a `/preview`).
- Como resolver: origens de dev entram por `process.env.PREVIEW_FRAME_ANCESTORS` (vazio em produção); todas as demais rotas recebem `Content-Security-Policy: frame-ancestors 'none'` e `X-Frame-Options: DENY`.
- Pronto quando: `curl -I` em `/checkout` mostra os dois headers e `/preview` em produção não lista `localhost`.

### 4.2 Integridade de dados e Storage

**A-04 · Alto · web — mídia substituída ou removida nunca é apagada do bucket**
- Onde: `apps/web/lib/actions/produtos.ts:177-243` (`aplicarMidiaVitrine`: galeria antiga menos `mantidas` e recorte substituído não sofrem `.remove()`), `:1012-1016` (`excluirProduto` apaga só `foto_url`); `apps/web/lib/actions/loja-vitrine.ts:64-90` (`uploadAsset` não remove logo/banner anterior) e `:180-229` (`montarConteudo` não remove fotos da casa retiradas).
- Como resolver:
  1. `lib/upload-servidor.ts` ganha `removerObjetosDoTenant(bucket, urls, tenantId)` (resolve URL pública → path, confere prefixo, `.remove()` best-effort com log estruturado).
  2. `aplicarMidiaVitrine` calcula `removidas = galeriaAntiga − mantidas` e `recorteAntigo` quando trocado/removido, e chama o helper após gravar o produto. `excluirProduto` inclui `metadata.galeria` e `metadata.recorte`.
  3. `uploadAsset` recebe a URL anterior e remove após o upload bem-sucedido; `montarConteudo` remove `galeria_casa` retiradas.
  4. Reconciliação: uma Edge Function agendada lista `product-images/{tenant}/` e `store-assets/{tenant}/` e remove o que nenhuma linha referencia (reutiliza `orfaosDoPrefixo`), com dry-run primeiro.
- Pronto quando: teste de unidade da função de diff; e2e do produto troca o recorte e a listagem do bucket não contém o antigo.
- Esforço: 1,5 dia.

**A-17 · Médio · web + partner — comportamentos parciais do dashboard**
- `publicarVitrine` zera `stores.conteudo` quando o FormData não traz `conteudo` (`loja-vitrine.ts:170,207-208`) e ignora `galeria_casa` nesse caso → separar "não enviou" de "enviou vazio": só gravar `null` quando `conteudo === ''` explícito.
- Gate de mídia hardcoded (`produto-form.tsx:372`) → `DashboardTemplate.produto` ganha `midia: { galeria, recorte, especificacoes, unidade }` por template no registry da lib; o form lê daí.
- Extensão do objeto derivada do nome do arquivo (`produtos.ts:185`) → usar `extensaoSegura(mime)` já existente em `loja-vitrine.ts:46-54` (mover para `lib/upload-servidor.ts`).
- `listarPosts` executado duas vezes na listagem (`conteudo/page.tsx:59` e `detectarOrfaosConteudo` em `conteudo.ts:290`) → passar a lista já carregada.
- Fachadas do partner: `apps/mobile-partner/lib/posts.ts:88-110` (`detectarOrfaos` → `orfaosDoPrefixo`), `lib/conteudo.ts:29,146,159-163,213-216` (`LIMITES_POST.bytes`, `caminhosDoPost`, `mensagemErroPost`; `gerarUuid` para a lib).
- `createServerClient<any>` (`apps/web/lib/supabase/server.ts:7,31`; storefront idem) → `createServerClient<Database>` com `packages/types`, eliminando os `as any` de `produtos.ts`.
- Leituras em `conteudo.ts` sem filtro explícito de tenant (`getPost`, `listarPosts`, `getProdutoResumo`, `buscarProdutosParaPost`) → adicionar `.eq('tenant_id', tenant.id)`; RLS é a segunda linha, não a primeira.
- Acessibilidade: `<label>` sem `htmlFor` em `produto-midia-vitrine.tsx:113,158,205,247` e `conteudo-vitrine.tsx:262`; inputs da ficha técnica só com placeholder; textarea do manifesto, busca de destaques e input de fotos sem rótulo; `seletor-produto.tsx` usa `<p>` como rótulo → rótulos reais ou `aria-label`.
- Cores fora dos tokens em `post-card.tsx`, `publicar-form.tsx`, `post-editor.tsx`, `orfaos-card.tsx`, `novo/page.tsx`, `endereco-publico.tsx`, `conteudo-vitrine.tsx:274`, `gate-publicacao.tsx` → tokens do dashboard.
- Pronto quando: cada item tem teste ou está coberto pelo e2e; `grep -rn "as any" apps/web/lib/actions` devolve vazio.
- Esforço: 2 dias.

### 4.3 Consumer — limpezas incompletas

**A-05 · Alto · consumer — `metadata.estoque` ainda vivo**
- Onde: `apps/mobile-consumer/components/loja/ProdutoPassarela.tsx:94-101`.
- Como resolver: ler `produto.track_stock && produto.stock_quantity` como `LojaPassarela.tsx:104-106` já faz; `[slug].tsx` já seleciona as colunas. Guarda (R5): teste em `packages/lib/src/store-theme/__tests__/store-theme.test.ts` (que já lê o disco do consumer) falha se `components/loja/**` contiver `metadata.estoque` ou `estoque?:`.
- Pronto quando: chip "Só N na loja" acende no seed (Passarela) com `EXPO_PUBLIC_USE_MOCK=false`.

**A-06 · Alto · consumer — status "ABERTO" inventado em 6 vitrines**
- Onde: incondicional em `LojaRaw.tsx:254`, `LojaRitual.tsx:405` (pílula "Aberto para pedidos") e `:673`, `LojaHorta.tsx:1236`; fallback sem horários em `LojaForno.tsx:1001`, `LojaFeira.tsx:806`, `LojaPassarela.tsx:978` (`hoje ? 'HOJE …' : 'ABERTO'`). Sem `statusAbertura`: Clínica, Feira, Forno, Horta, Magazine, Passarela, Raw, Serena, Volt.
- Como resolver: `const status = statusAbertura(loja.horarios)`; renderizar o chip só quando `status !== null`; nos marquees que listam `['ABERTO', tempo, hora]`, entra `status?.texto` no lugar da string. Clínica, Magazine, Serena e Volt ganham o chip via `statusAbertura` onde a spec do `05` §5.6 prevê status. Guarda (R5): teste falha se qualquer `Loja*.tsx` contiver `'ABERTO'`, `"Aberto"` ou `Aberto para pedidos`.
- Pronto quando: com a loja do seed sem `horarios`, nenhuma vitrine mostra "aberto"; com horários, todas mostram a frase de `statusAbertura`.
- Esforço: 1 dia (A-05 + A-06).

**A-19 · Médio · consumer — duplicação e tipagem**
- `FachadaLoja.tsx:106-125` redeclara `VOZ_POR_PISO`; `Diretorio.tsx:44` redeclara `NOME_CURTO` → importar `VOZ_POR_PISO` e `NOME_CURTO_POR_PISO` da lib e apagar as cópias.
- `[slug].tsx:104,139,161` (`useState<any>`, `as any`) e o dispatch em cadeias de 14 e 18 ternários (`:286-312`, `:326-360`, `:370-393`) → `const VITRINES_RN: Record<VitrineCodigo, { Loja: ComponentType<…>; Pdp: ComponentType<…> }>` num arquivo próprio (`components/loja/registro.ts`), tipado; o `[slug].tsx` só faz `VITRINES_RN[codigo]`. Nota do napkin: a união genérica estoura a inferência do JSX a partir de ~14 membros, por isso o registro precisa ser um `Record` com props explícitas, não uma união.
- `(produto.metadata as any)?.galeria` em 17 `Produto*.tsx` → `lerMetadataProduto(produto.metadata)` da lib, que já existe; `(supabase as any).from` → tipos gerados.
- Pronto quando: `grep -rn "as any" apps/mobile-consumer/components/loja apps/mobile-consumer/app/loja` devolve vazio; teste de paridade continua verde.
- Esforço: 1,5 dia.

### 4.4 Storefront — robustez e arquitetura

**A-07 · Alto · storefront — sem `error.tsx` nem `loading.tsx`**
- Como resolver: `app/(loja)/error.tsx` (client; usa as CSS vars já no `:root`, botão "Tentar de novo" e link para o apex), `app/(loja)/loading.tsx` (esqueleto na pele: hero, régua, 6 cartões), `app/saguao/error.tsx` e `loading.tsx`, `app/global-error.tsx` (Mallevo). Registrar o erro com `console.error` estruturado (mensagem, slug, rota) até haver Sentry no storefront.
- Pronto quando: derrubar o Supabase local e abrir uma loja mostra a tela de erro vestida, não a genérica do Next.
- Esforço: 0,5 dia.

**A-09 · Médio · storefront — Feira carrega o hero com `lazy`**
- Onde: `components/vitrines/feira/feira-ui.tsx:252-255` (`DiscoFoto`).
- Como resolver: prop `carregamento` como em Forno e Horta; a primeira foto da colagem `eager` + `fetchPriority="high"`. Guarda: teste que lê cada `Vitrine*.tsx` e exige pelo menos um `fetchPriority="high"` (ou `carregamento="eager"`) por vitrine.
- Pronto quando: captura Firefox da Feira mostra a foto do hero; teste verde.

**A-10 · Médio · storefront — 18/18 vitrines são `'use client'`**
- O que acontece: cada vitrine de 500 a 1.438 linhas vai inteira para o bundle e hidrata no cliente; a promessa "server component com ilhas" (2b) não foi cumprida.
- Como resolver (R7), em ondas e sem reescrever de uma vez:
  1. Definir o contrato: `Vitrine<Nome>.tsx` é server (recebe `store`, `secoes`, `detalhes`, decide estrutura e copy) e importa ilhas de `<codigo>-ui.tsx` marcadas `'use client'` (hero-carrossel, nav grudada, sacola, adição rápida, relógio, pager).
  2. Começar por Mesa, Gôndola e Cuidado (as mais novas e as que já usam `_base`), como referência; medir com `next build` o "First Load JS" por rota antes e depois. Meta: vitrine ≤ 60 kB próprios sobre o shared.
  3. Migrar as outras 15 quando forem tocadas por A-11 ou A-14, uma onda por sprint.
- Pronto quando: `grep -l "'use client'" components/vitrines/*/Vitrine*.tsx` devolve vazio; tabela de First Load JS por vitrine registrada aqui.
- Esforço: 1 semana para as 3 de referência; 2 a 3 semanas para as demais, diluídas.

**A-11 · Médio · storefront — duplicação entre vitrines**
- Motores locais de hero-carrossel em Editorial, Noir, Raw, Serena, Volt e Torra → `_base/useCarrossel` (`useCarrossel`, `useHeroEmCena`, `comCopiaDeLoop`).
- 8 cópias de `prefereMenosMovimento` (Editorial, Feira, Forno, Horta, Noir, Passarela, Raw, Torra) e os hooks `useMenosMovimento` (Torra) e `useReduzirMovimento` homônimo (Volt) → `_base/movimento`.
- Relógios locais em `VitrineHorta.tsx:162-170` e `VitrineRitual.tsx:112-120` → `_base/StatusAberto`.
- `exigeEscolha` ×4, `precoFinalDe` ×9, `repartirDescricao` ×3 → `_base/catalogo.ts`.
- Guarda (R5, R8): teste no storefront falha se `components/vitrines/<x>/` declarar `function prefereMenosMovimento`, `function precoFinalDe`, `function exigeEscolha` ou `setInterval(` fora de `_base/`.
- Pronto quando: teste verde; tamanho total de `components/vitrines` reduzido e registrado.
- Esforço: 2 dias.

**A-12 · Médio · storefront — saguão sem cache e destaques por corte global**
- Onde: `app/saguao/page.tsx:19`, `explorar/page.tsx:15`, `piso/[slug]/page.tsx:12` (`force-dynamic`); `lib/supabase/server.ts:5` (`cookies()`); `lib/saguao.ts:94-114` (`carregarDestaques` corta `storeIds.length * 12` ordenado globalmente).
- Como resolver:
  1. O saguão é anônimo: criar `lib/supabase/publico.ts` (client anon sem cookies) e usá-lo em `lib/saguao.ts`; páginas passam a `export const revalidate = 60` (Explorar 30). `urlDoShopping`/`urlDaLoja` continuam lendo `headers()`, então manter `dynamic` só onde o host é necessário, ou derivar a base de `NEXT_PUBLIC_APEX_HOST` em produção.
  2. Destaques: RPC `destaques_por_loja(store_ids uuid[], n int)` com `row_number() over (partition by store_id order by ordem nulls last, nome) <= n`, ou uma view `public_catalog_destaques`. `carregarDestaques` passa a chamá-la.
  3. Invalidação: `revalidateTag('saguao')` na server action `publicarVitrine` e no `criarPost`/`atualizarPost` do web (o partner já dispara pelo trigger de views; aceitar o TTL).
- Pronto quando: `curl -I` no apex mostra `x-nextjs-cache: HIT` na segunda chamada; loja do seed com `ordem` 100+ aparece com 3 destaques.
- Esforço: 1 dia.

**A-14 · Médio · storefront — PDP própria por vitrine (0 de 18)**
- Estado: `/produto/[id]` renderiza a vitrine com `initialProdutoId` e abre o `ProductModal`; metadata da página é gerada no servidor, então SEO básico está coberto.
- Decisão a tomar (D-10): manter o modal como PDP definitiva do web (e apagar os 18 `TODO(2b)`), ou construir `Pdp.tsx` por vitrine. Recomendação: **manter o modal neste ciclo** e fechar o TODO, porque as vitrines RN já têm `Produto*.tsx` e o custo de 18 PDPs web é de 2 a 3 semanas sem ganho de conversão comprovado. Reabrir quando houver dado de tráfego em `/produto/[id]`.
- Se D-10 escolher PDP própria: server component por vitrine (`components/vitrines/<codigo>/Pdp<Nome>.tsx`), portando `Produto<Nome>.tsx` da RN, com `carregarDetalhesCatalogo([id])` só do produto aberto.

**A-15 · Médio · storefront — deslocamento de 47px da moldura App por seletor global**
- Onde: `components/store/ShellApp.tsx:113` (`[data-shell-app] .sticky.top-0 { top: 47px }`).
- Como resolver: `ShellApp` define `--inset-top: 47px` no wrapper; as vitrines e o `NavSecoes` usam `top-[var(--inset-top,0px)]` e `scroll-mt-[calc(var(--inset-top,0px)+Xpx)]`. Guarda: teste que exige `var(--inset-top` em cada `Vitrine*.tsx` que tenha `sticky`.
- Pronto quando: na moldura App, clicar num chip de seção pára abaixo do chrome, não embaixo dele.

**A-20 · Baixo · storefront — acessibilidade do visor do Explorar**
- Onde: `components/saguao/VisorPost.tsx` (`role="dialog"`, Escape e scroll lock existem; falta gestão de foco; foto com `alt=""`; `autoPlay` sem `muted`).
- Como resolver: mover o foco para o diálogo ao abrir, focus trap (Tab não alcança a grade atrás), restaurar o foco ao fechar, `alt` com a legenda do post, `muted` no `autoPlay`. Reaproveitar o padrão do `ProductModal` se já tiver trap; senão, `inert` no conteúdo de fundo.
- Pronto quando: navegação só por teclado abre, percorre e fecha o visor sem sair dele.

**A-21 · Baixo · storefront — pequenos**
- `lib/consumer-design.ts` morto (ainda com `surfaceDark`) → apagar e limpar o comentário em `lib/status-pedido.ts:6`.
- `Padrao.tsx:36` mantém `CartFab` → `_base/Sacola` no header, como nas vitrines.
- `lib/catalog.ts`: `carregarCatalogo`/`carregarDetalhesCatalogo` sem `cache()` e carregando modificadores/variantes de todos os produtos em toda visita → `cache()` nas duas e detalhes sob demanda (fetch no `ProdutoModalHost` ao abrir, com prefetch dos destaques).
- `getSubdomain` sem `toLowerCase()`; host desconhecido vira saguão → normalizar e, fora de `MAIN_DOMAINS`, responder `notFound()` a menos que `NEXT_PUBLIC_ALLOW_UNKNOWN_HOST=true` (previews da Vercel).
- Sitemap da loja em dev sai sem porta (`baseUrl()` em `app/sitemap.ts`) → usar o mesmo helper host-aware de `lib/saguao.ts`.
- `FontesDasLojas` rende `<link>` no body → `<link rel="stylesheet" precedence="default">` (React 19) ou limitar às famílias das 4 primeiras fachadas por corredor.
- Metadata ausente em `checkout`, `pedido`, `entrar`, `verificar` → `generateMetadata` com o nome da loja.
- `preview-vitrine.tsx:196` `key={src}` remonta o iframe a cada debounce → atualizar `src` via ref e mostrar "Atualizando…" só até o `load`.
- Seed: cabeçalho com `(+ arquétipos )` vazio e linhas em branco duplicadas; `conteudo` das 18 lojas geradas sem `campanha`/`manifesto` → o gerador deriva uma campanha do mock (`hero`/`manifesto` já existem no dataset) para exercitar o caminho editorial.

### 4.5 Qualidade, automação e verificação

**A-08 · Alto · repo — sem CI; web e mobile sem `test`/`typecheck`**
- Onde: `.github/` não existe; `apps/web/package.json`, `apps/mobile-consumer`, `apps/mobile-partner`, `apps/admin` sem `test`/`typecheck`; root `pnpm test` = `pnpm -r --if-present test` (pula quem não tem); não há `typecheck` na raiz. Memória do projeto: `npx tsc` na raiz é um pacote stub que sai 0.
- Como resolver:
  1. Scripts: `apps/web` `typecheck: tsc --noEmit -p tsconfig.json`, `test: vitest run` (com um primeiro teste de unidade para `filtrarUrlsDoTenant` de A-03); `apps/mobile-*` `typecheck: tsc --noEmit -p tsconfig.json`; root `typecheck: turbo run typecheck`, `test: turbo run test`, `build: turbo run build --filter=web --filter=storefront`.
  2. `.github/workflows/ci.yml`: job `check` (pnpm install `--frozen-lockfile`, `turbo run typecheck test build`); job `e2e` (Docker disponível no runner: `supabase start`, `bash scripts/qa-local.sh --ci`, artefatos Playwright); job `storefront-visual` (A-08b). Cache do pnpm store e do `.next`.
  3. Branch protection em `main`: CI verde obrigatória.
- Pronto quando: um PR com `'ABERTO'` numa vitrine ou com `as any` novo fica vermelho sem intervenção humana.
- Esforço: 1 dia + ajustes do `qa-local.sh` para modo CI.

**A-08b · Médio · storefront — Fase 2c de verdade**
- `@testing-library/react` + `jsdom` no storefront; `vitest.config.ts` com `environment: 'jsdom'` para `*.test.tsx`. Primeiros testes: `StoreThemeRoot` (não emite valor fora do padrão; A-01), `aplicarRascunho` com payload hostil, `ShellApp` (barra no molde certo por vitrine), `StatusAberto` (frase por horário).
- `apps/storefront/e2e/vitrines.spec.ts` (Playwright): para cada uma das 18 lojas do seed, abrir `http://<slug>.mallevo.localhost:3002/`, exigir 200, sem erro de console, `toHaveScreenshot` do topo e da página inteira em 480; repetir com `/preview?app=1`. Baselines commitadas em `e2e/__screenshots__/`. Incluído no `qa-local.sh`.
- `scripts/smoke-storefront.sh`: o roteiro do Apêndice A (override de QA sobre a loja real), para rodar sem Docker.
- Pronto quando: `pnpm --filter storefront test` renderiza componentes; `pnpm qa:local` produz 36 capturas comparadas.
- Esforço: 2 dias.

**A-16 · Médio · docs e plano — afirmações erradas e itens não feitos**
- `docs/store-theme/05-aplicacao-storefront-consumer.md`: criar **§5.7 Storefront** (route group, `StoreThemeRoot` no `:root`, `_base/`, moldura App, override de QA, `/preview`, regras R1 a R8).
- `docs/store-theme/03-design-tokens-e-schema.md` e `docs/03-schema-completo-de-banco-de-dados.md`: documentar `stores.conteudo` (schema v1, limites, quem grava, quem lê) e o `CHECK` de A-03.
- `docs/dev/qa-local.md:69-71`: `sabor-mineiro` = Mesa, `tintas-aurora` = Gôndola, `esmalteria-lilas` = Cuidado; adicionar o roteiro do smoke sem Docker.
- Este plano: corrigido nesta revisão ("VITRINES (15)" → 18; "151 testes" → 165; `AvisoVitrine` → `PainelVitrine`; "consumer não consome `agruparPorPiso`" → consome; "`metadata.estoque` morreu" → parcial; "Aberto literal saiu das 6 vitrines" → parcial).
- Pronto quando: `grep -c conteudo` nos dois docs de schema > 0; `05` tem `## 5.7`.
- Esforço: 0,5 dia.

**A-18 · Baixo · lib — `statusAbertura` no turno da véspera**
- Onde: `packages/lib/src/loja/horarios.ts:152` usa `hoje.fecha` mesmo quando a abertura veio do turno noturno de ontem.
- Como resolver: `abertoAgora` devolve também o turno que abriu (`{ aberta, turno }`), e `statusAbertura` usa `turno.fecha`. Teste: sexta 22:00–02:00 e sábado 10:00–18:00, às 01:00 de sábado → "Aberto até 02:00".

### 4.6 Deploy e produção

**A-22 · Alto · operação — produção atrás da branch e apex na LP**
- Estado: deploys de produção de 2026-09-20 ~19h08 (antes dos 4 últimos commits); `main` 13 commits atrás; apex no projeto da LP; `/preview` em produção com A-01 aberto; `loja-teste-*` ativa e visível no saguão; feed vazio.
- Como resolver:
  1. Após A-01 e A-02 (mesmo dia): merge da branch em `main` e deploy de produção dos dois projetos; conferir com `vercel inspect <url>` que o commit é o esperado.
  2. `loja-teste-*`: desativar (`ativo = false`) ou marcar `stores.is_demo` e excluir da view pública. Recomendação: coluna `is_demo` (o seed local também a usa), filtrada em `public_catalog_stores`.
  3. Apex: decisão D-07 (mover `mallevo.com.br` para o storefront, ou manter a LP e publicar o saguão em `shopping.mallevo.com.br`). Até lá, o "Pronto quando" da Fase 5 não é atingível em produção.
  4. Registrar em `docs/dev/deploy.md` o mapa: `mall-online-web` (root `apps/web`, `app.mallevo.com.br`), `storefront-mallevo` (root `apps/storefront`, `*.mallevo.com.br`), LP (apex), branch de produção, e o passo de `vercel domains add` por slug.
- Pronto quando: `vercel ls --prod` dos dois projetos aponta para o commit de `main` com A-01 corrigido; saguão sem loja de teste.

---

## 5. Fase 6 — Endurecimento e fechamento do ciclo

Nada da Fase 6 é feature nova. É o que separa "implementado" de "funcionando de maneira profissional". Ondas em ordem de dependência; cada onda tem um "pronto quando" verificável.

### 6a — Bloqueadores de release · 3 dias
1. A-01 schema de tema + A-02 defensivo em `toCssVars` + testes.
2. A-13 CSP por ambiente e `frame-ancestors 'none'` fora do preview.
3. Subir o Docker e rodar `pnpm qa:local` inteiro; consertar o que quebrar (é a primeira vez que `conteudo.spec`, a moldura App e o seed de 18 lojas rodam juntos). Registrar aqui a data e o resultado.
4. `supabase db reset` com o seed e o consumer com `EXPO_PUBLIC_USE_MOCK=false` contra o Supabase local: abrir as 18 lojas do seed no app e anotar o que o mock escondia.
5. A-22 passos 1 e 2: merge em `main`, deploy, loja de teste fora do saguão.

**Pronto quando:** payload de prova do A-01 devolve a loja com o tema publicado em produção; `pnpm qa:local` verde com data neste documento; produção no commit de `main`.

### 6b — Dívidas que contradizem o plano · 1 semana
1. A-05 e A-06 no consumer, com as guardas de disco.
2. A-03 origem de mídia (lib + web + `CHECK` no banco + partner).
3. A-04 limpeza de órfãos + Edge Function de reconciliação em dry-run.
4. A-17 (`publicarVitrine`, gate por template, extensão por MIME, `listarPosts`, fachadas do partner, tipos do Supabase, filtros de tenant, rótulos).
5. A-18 na lib.

**Pronto quando:** guardas verdes; `grep -rn "as any" apps/web/lib/actions apps/mobile-consumer/components/loja` vazio; e2e do produto prova a remoção no bucket.

### 6c — Automação · 1 semana
1. A-08 scripts + `ci.yml` + branch protection.
2. A-08b testing-library, `vitrines.spec.ts` com 36 capturas, `scripts/smoke-storefront.sh`.
3. `qa-local.sh --ci` (sem prompts; sobe web e storefront, roda as duas suítes, guarda artefatos).

**Pronto quando:** CI verde no PR desta onda; um PR de sabotagem (`'ABERTO'` numa vitrine) fica vermelho.

### 6d — Arquitetura do storefront · 2 a 3 semanas, diluída
1. A-07 `error.tsx`/`loading.tsx` (0,5 dia; pode entrar na 6a se sobrar tempo).
2. A-09 Feira, A-15 `--inset-top`, A-21 (`consumer-design`, `CartFab`, `catalog.ts` com `cache()`, `getSubdomain`, sitemap, fontes, metadata, iframe).
3. A-12 cache do saguão + RPC de destaques.
4. A-11 dedupe para `_base/` com guardas.
5. A-10 server + ilhas: Mesa, Gôndola e Cuidado primeiro; as outras 15 conforme forem tocadas.
6. A-14 conforme D-10.

**Pronto quando:** tabela de First Load JS por vitrine registrada; `x-nextjs-cache: HIT` no apex; guardas de dedupe verdes.

### 6e — Docs e decisões · 0,5 dia
1. A-16 (§5.7, `stores.conteudo` nos schemas, `qa-local.md`).
2. `docs/dev/deploy.md` (A-22 passo 4).
3. Fechar D-07 a D-11 no §8 com data.

---

## 6. Ordem de execução revisada

Os 12 passos originais foram cumpridos (§3). A ordem daqui para frente:

1. A-01 + A-02 + A-13 (6a.1, 6a.2).
2. Docker: `pnpm qa:local`, `db reset`, consumer fora do mock (6a.3, 6a.4).
3. Merge em `main` + deploy + loja de teste fora (6a.5).
4. Consumer: A-05, A-06 com guardas (6b.1).
5. Mídia: A-03 e A-04 (6b.2, 6b.3).
6. CI: A-08 (6c.1).
7. Dashboard: A-17 (6b.4) e lib A-18 (6b.5).
8. Storefront: A-07, A-09, A-15, A-21 (6d.1, 6d.2).
9. Fase 2c: A-08b (6c.2, 6c.3).
10. Saguão: A-12 (6d.3).
11. Dedupe e ilhas: A-11, A-10 (6d.4, 6d.5).
12. Docs: A-16 + `deploy.md` + decisões (6e).

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| A-01 é explorado antes da correção chegar a produção | 6a.1 é o primeiro item; deploy no mesmo dia; até lá, `robots` já bloqueia `/preview`, mas isso não impede link direto |
| `pnpm qa:local` nunca rodou com o seed de 18 lojas: pode quebrar em cascata | Rodar cedo (6a.3) e registrar; o seed é idempotente, então regenerar é barato |
| Refatorar 18 vitrines para server + ilhas reintroduz bugs visuais | Só depois das 36 capturas de referência (6c.2) existirem; uma onda por sprint; comparar capturas |
| Limpeza de órfãos apaga objeto ainda referenciado | Helper confere prefixo do tenant e só remove o que saiu do diff; reconciliação começa em dry-run com relatório |
| Cache do saguão mostra loja recém-publicada com atraso | TTL de 60 s + `revalidateTag` nas actions do web; aceitável para o apex |
| Lojista real com dados vazios deixa a vitrine feia | Mantido: fallbacks explícitos + card de saúde da loja |
| Desktop sem spec | Mantido: coluna central 480px; desktop nativo só onde há tráfego |
| Multi-loja no web | Mantido: `store_id` explícito em todo código novo (R9) |

---

## 8. Decisões do dono do produto

Fechadas em 2026-09-19 (mantidas):

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Checkout do storefront | Veste a pele da loja. No app o checkout continua Mallevo |
| 2 | Desktop | Coluna central de 480px nas vitrines; desktop nativo depois e só nas mais usadas. Saguão nasce responsivo |
| 3 | Ordem das vitrines web | Onda 1 = alimentação e mercado (cumprida) |
| 4 | Expor forma, modo escuro e fontes ao lojista | Não. Arquétipo + paleta + accent |
| 5 | Saguão web no apex | Neste ciclo (entregue em código) |
| 6 | Multi-loja no dashboard web | Fora deste ciclo; `store_id` explícito em código novo |

**Pendentes, abertas pela auditoria de 2026-09-21:**

| # | Pergunta | Recomendação |
|---|---|---|
| D-07 | Apex: mover `mallevo.com.br` da LP para o storefront (saguão), ou publicar o saguão em outro host? | Mover o apex; a LP vira `/sobre` ou `lojistas.mallevo.com.br`. Sem isso o "pronto quando" da Fase 5 é inatingível |
| D-08 | Promover produção agora ou só após a 6a? | Só após A-01 e A-02; os dois cabem num dia |
| D-09 | Refatorar as 18 vitrines web para server + ilhas neste ciclo? | Sim, mas diluído: 3 de referência agora, o resto conforme forem tocadas, com orçamento de bundle por vitrine |
| D-10 | PDP própria por vitrine no web ou modal como definitivo? | Modal definitivo neste ciclo; apagar os `TODO(2b)`; reabrir com dado de tráfego |
| D-11 | Coração de favorito cosmético em 5 vitrines RN: remover ou implementar favoritos de produto? | Remover até existir store de favoritos de produto; UI não promete o que não guarda |

**Nota sobre multi-loja (decisão 6, mantida):** um tenant pode ter várias `stores`; schema, lib e partner suportam; o `apps/web` assume uma loja por tenant. Fica no backlog; código novo recebe `store_id` explícito.

---

## Apêndice A — Como verificar (comandos que funcionam neste repo)

Ver também `.claude/napkin.md` e `docs/dev/qa-local.md`.

**Typecheck** (o `npx tsc` da raiz é um pacote stub que sai 0; use o binário do app):
```bash
cd apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
cd apps/storefront && ./node_modules/.bin/tsc --noEmit -p tsconfig.json   # rm -rf .next antes, se moveu rotas
cd apps/mobile-consumer && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
cd apps/mobile-partner && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
apps/mobile-consumer/node_modules/typescript/bin/tsc --noEmit -p packages/lib/tsconfig.json
```

**Testes e build:**
```bash
cd packages/lib && npx vitest run          # 165 em 2026-09-21
cd apps/storefront && npx vitest run       # 22 em 2026-09-21
cd apps/web && npx playwright test --list  # valida as specs sem Docker (5 em 2026-09-21)
cd apps/web && npx next build              # se falhar em next/font: é rede do Google Fonts; repetir
cd apps/storefront && npx next build
```

**Smoke do storefront contra o Supabase real** (o `.env.local` do storefront aponta para produção; só leitura):
```bash
cd apps/storefront && STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true npx next start -p 3002 &
curl -s --retry 90 --retry-delay 1 --retry-connrefused -o /dev/null localhost:3002/robots.txt
H="guaimbe.mallevo.localhost"
# apex
for p in / /explorar /piso/casa-vida /sitemap.xml /robots.txt /saguao; do curl -s -o /dev/null -w "$p %{http_code}\n" "localhost:3002$p"; done
# 18 vitrines: exigir 200 e md5 distinto do HTML (prova que o gate troca o layout)
for par in editorial:vestuario-calcados raw:vestuario-calcados serene:beleza-cosmeticos artisan:casa-decoracao noir:alimentos-bebidas volt:vestuario-calcados clinic:farmacia-medicamentos roast:alimentos-bebidas smash:alimentos-bebidas ritual:alimentos-bebidas magazine:outros garden:alimentos-bebidas slice:alimentos-bebidas mono:vestuario-calcados heritage:alimentos-bebidas market:mercado-conveniencia soft:saloes-estetica fresh:mercado-conveniencia; do
  IFS=: read -r preset cat <<< "$par"
  printf "%-10s " "$preset"; curl -s -H "Host: $H" "localhost:3002/?preset=$preset&categoria=$cat" -w " %{http_code} " -o /tmp/v.html; sed -E 's/nonce="[^"]*"//g' /tmp/v.html | md5sum | cut -c1-8
done
# preview com rascunho e moldura App
DRAFT=$(printf '%s' '{"theme":{"preset":"smash","palette":"smash-1"},"conteudo":{"v":1,"campanha":{"eyebrow":"QA","titulo":"Titulo QA"}},"categoria":"alimentos-bebidas"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
curl -s -D - -o /tmp/p.html -H "Host: $H" "localhost:3002/preview?draft=$DRAFT&app=1" | grep -i content-security-policy; grep -c "Titulo QA" /tmp/p.html
fuser -k 3002/tcp
```
Notas: o slug do piso é o do **piso** (`casa-vida`, `praca-alimentacao`…), não o da categoria; `?app=1` só existe em `/preview`.

**Prova do A-01 (deve passar a devolver a loja com o tema publicado após a correção):**
```bash
DRAFT=$(printf '%s' '{"theme":{"preset":"smash","color":{"accent":"red}</style><script>window.__xss=1</script><style>"}}}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
curl -s -H "Host: $H" "localhost:3002/preview?draft=$DRAFT" | grep -c '</style><script>window.__xss'   # esperado após o fix: 0
```

**Capturas** (Firefox headless; imagens `loading="lazy"` de produto podem sair cinza, só hero/eager são confiáveis; `/checkout` é ilha client e sai em branco):
```bash
firefox --headless --no-remote --profile /tmp/ffqa --window-size=480,1400 --screenshot /tmp/mesa.png "http://guaimbe.mallevo.localhost:3002/?preset=heritage&categoria=alimentos-bebidas"
```

**E2e autenticado** (exige Docker; login `qa@mallevo.local` / `mallevo-qa-2026`; loja `forno-demo`):
```bash
sudo systemctl start docker && pnpm qa:local
```

**Produção:**
```bash
npx vercel ls storefront-mallevo --prod --limit 2 ; npx vercel ls mall-online-web --prod --limit 2
npx vercel inspect <url>   # conferir "created" contra o git log
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/public_catalog_stores?select=slug,categoria_slug,conteudo&limit=3" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

## Apêndice B — Histórico de status (resumo)

| Data | O que foi feito |
|---|---|
| 2026-09-19 | Fase 0; Fase 1a/1b/1d; Fase 2a; 2b ondas 1 e 2; Fase 3 (preview em iframe); seed manual + `qa-local.sh` + e2e do dashboard (rodado verde); fix do embed ambíguo `stores → categories` (PGRST201, bug de produção); migrations 011/012 idempotentes |
| 2026-09-20 | 2b onda 3 (15/15); moldura App; Fase 1c (`/conteudo`); Fase 5 (saguão); Fase 4 (seed gerado, correções parciais, Mesa, Gôndola, Cuidado → 18 vitrines); saúde da loja completa; slug reprovisiona domínio; tipos do React isolados por app (build da Vercel) |
| 2026-09-21 | Auditoria completa (§0, §4); XSS A-01 reproduzido; plano reestruturado; Fase 6 definida |
