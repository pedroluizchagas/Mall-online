# Partner App — App do Lojista Mallevo

> App mobile dedicado do lojista (`apps/mobile-partner`, projeto Expo próprio,
> isolado do runtime do Dashboard `apps/web`) com **dois pilares**:
>
> 1. **Pilar Gestão** — o lojista faz no celular **tudo que faz no Dashboard
>    web**: pedidos em tempo real, catálogo, financeiro, relatórios e operação
>    da loja.
> 2. **Pilar Conteúdo** — o lojista **grava, publica e gerencia fotos e vídeos
>    no estilo Reels** direto do celular, alimentando o Explorar do consumer.

## Evolução de escopo (registrada em 20/07/2026)

A primeira versão desta documentação escopava o Partner App apenas como
"Explorar studio" (vídeos). O escopo foi **expandido para o app completo do
lojista**: paridade funcional com o Dashboard + publicação de conteúdo
(agora fotos **e** vídeos — tabela `store_posts` com `tipo`, não mais
`store_videos`). Os stages foram renumerados; as decisões de arquitetura do
pilar Conteúdo permanecem válidas e estão em `01`.

## Problema que este app resolve

**Gestão:** o Dashboard web é excelente no balcão/desktop, mas o lojista vive
no celular. Pedido novo chega quando ele está no estoque, na rua, no caixa —
ele precisa aceitar, acompanhar e resolver do bolso, com push e som, sem abrir
navegador.

**Conteúdo:** o Explorar (`apps/mobile-consumer/app/(tabs)/explorar.tsx`) é um
feed TikTok-style **alimentado por mock** (`const REELS: Reel[] = [...]`). Não
existe tabela, bucket nem fluxo de publicação. Para publicar um vídeo o caminho
real seria: gravar no celular → subir pra nuvem → baixar no computador → abrir
o Dashboard web → enviar. Inviável. O Partner App fecha o ciclo no aparelho
onde o conteúdo nasce: **capturar → revisar → legenda → vincular produto →
publicar**, em segundos.

> ⚠️ **Premissa que muda o escopo do pilar Conteúdo:** o Explorar **não tem
> backend**. Este projeto entrega também a fundação de dados do Explorar
> (tabela `store_posts`, storage, view pública) e religa o consumer ao dado
> real. O pilar Gestão, ao contrário, **não cria backend novo**: consome as
> mesmas tabelas, RLS, Realtime e Edge Functions que o Dashboard já usa.

## Modelo de produto: 5 superfícies, 1 cérebro

O Mallevo opera **frontends isolados sobre um backend compartilhado** (ver
[`docs/storefront/00-INDEX.md`](../storefront/00-INDEX.md)). O Partner App é a
quinta superfície:

| Superfície | App | Público | Frontend | Backend |
|---|---|---|---|---|
| Aba "loja"/Explorar no app | `apps/mobile-consumer` | consumidor | isolado | **compartilhado** |
| Storefront `{loja}.mallevo.com.br` | `apps/storefront` | consumidor (web) | isolado | **compartilhado** |
| Dashboard do lojista | `apps/web` | lojista (desktop) | isolado | **compartilhado** |
| App do entregador | `apps/mobile-courier` | entregador | isolado | **compartilhado** |
| **Partner App (app do lojista)** | **`apps/mobile-partner`** (novo) | **lojista (mobile)** | **isolado** | **compartilhado** |

**Regra de ouro (idêntica ao storefront):** isolamento é de
**runtime / deploy / frontend**, NUNCA de dados. Supabase, auth do lojista
(`tenants`/`stores`), pedidos, catálogo, Storage e a futura tabela
`store_posts` são um só backend. Dashboard e Partner App são **duas janelas
para o mesmo estado** — mudou num, refletiu no outro via Realtime.

## Decisões de arquitetura (fechadas)

1. **Projeto Expo separado** `apps/mobile-partner` (gêmeo de
   `apps/mobile-courier`), não tela nova no `apps/web` nem no consumer.
2. **Mesma stack mobile do monorepo**: Expo SDK 54, expo-router 6, RN 0.81,
   React 19, NativeWind 4, Zustand, `@supabase/supabase-js`, `@mallevo/lib`,
   `@mallevo/types`. Reaproveita `lib/supabase.ts` e o bootstrap de sessão do
   `_layout.tsx` do courier.
3. **Mesmo design system dos apps mobile**: `partner-design.ts` espelha a DNA
   de `courier-design.ts` / `consumer-design.ts` (canvas `#F3F3F1`, ink
   `#111216`, accent `#D8FF3E`, radius 14/20/28/34/pill) — tokens e
   justificativas em `docs/system-design/consumer/01-tokens.md`. Nenhuma
   paleta nova.
4. **Auth = usuário lojista existente** (`auth.users` → `tenants.user_id`).
   Mesmo login do Dashboard (`signInWithPassword`). Sem cadastro novo.
5. **Paridade Gestão sem backend novo**: o app consome as mesmas tabelas sob
   as mesmas RLS do Dashboard, via `supabase-js` direto (gabarito courier) e
   Edge Functions existentes. **Nenhuma regra de negócio duplicada no
   cliente** — gate, limites de plano e ownership vivem em RLS /
   `packages/lib`.
6. **Post pertence à `store`** (`store_posts.store_id`), não ao `tenant`. O
   feed do consumer é por loja (`loja_slug`, `loja_nome`). Tenant com várias
   lojas escolhe a loja ao publicar.
7. **Conteúdo = fotos e vídeos** (`store_posts.tipo IN ('video','foto')`) no
   mesmo feed vertical. Vídeo: ≤60 s, compressão client, H.264/AAC. Foto:
   JPEG/WebP, 1 imagem por post no MVP (carrossel é pós-MVP).
8. **Storage bucket dedicado `explore-media`**, escrita privada / leitura
   pública, prefixado por `{tenant_id}/{store_id}/`, mesmo padrão RLS de
   `store-assets` (`my_tenant_id()`).
9. **Upload resumível (TUS)** via `supabase.storage` para vídeo, não multipart
   simples — vídeos de celular passam fácil de 50 MB e conexão móvel cai.
10. **Compressão no cliente** antes do upload (alvo ~1080p / ~8 Mbps / ≤60 s).
    Sem pipeline de transcode server-side no MVP (decisão revisável — ver `01`).
11. **Catálogo público via view dedicada** `public_explore_feed`, NUNCA
    abrindo `store_posts` ao papel `anon` — mesma decisão do storefront.
12. **Estado de publicação explícito** (`processing | published | hidden |
    removed`) + moderação leve (flag), não publicação direta sem trilha.

## Índice

| Arquivo | Conteúdo |
|---|---|
| `01-arquitetura-e-decisoes.md` | decisões, paridade com o Dashboard, mapa funcional, riscos |
| `02-stage-0-backend.md` | **BLOQUEANTE do pilar Conteúdo**: `store_posts`, RLS, bucket, view pública, contrato com o consumer |
| `03-stage-1-scaffold.md` | scaffold do `apps/mobile-partner` (navegação completa do app) |
| `04-stage-2-auth-gate.md` | login lojista + gate (tenant ativo, loja existente, billing) |
| `05-stage-3-pedidos.md` | pedidos em tempo real: Realtime, push, som, status, entregador |
| `06-stage-4-catalogo.md` | produtos (fotos, variações), categorias, estoque |
| `07-stage-5-financeiro-relatorios.md` | KPIs, repasses, antecipação, assinatura, relatórios |
| `08-stage-6-operacao-loja.md` | minha loja, horários, avaliações, mensagens, agenda, entregadores, ajuda |
| `09-stage-7-captura-upload.md` | câmera/galeria (foto+vídeo), compressão, upload TUS, criar post |
| `10-stage-8-gestao-conteudo.md` | listar/editar/remover posts próprios, métricas |
| `11-stage-9-integracao-consumer.md` | trocar o mock `REELS` pelo feed real (fotos+vídeos) |
| `12-prompts-execucao.md` | prompts auto-contidos para o agente executor |
| `13-workflow-tech-lead.md` | ciclo executar → resumir → revisar → merge |

## Ordem e dependências

```
Stage 0 (backend Conteúdo) ─┐            pilar Gestão
Stage 1 (scaffold) ─────────┼─→ 2 (auth+gate) → 3 (pedidos) → 4 (catálogo)
                            │                  → 5 (financeiro) → 6 (operação)
                            │
                            └──────────── pilar Conteúdo
                                          7 (captura+upload) → 8 (gestão posts)
                                                             → 9 (consumer)
```

- **Gestão primeiro** (stages 3–6): entrega o valor diário do lojista (pedido
  no bolso) e não depende de backend novo. **Conteúdo em seguida** (7–9).
  O Stage 0 é puro SQL e roda primeiro mesmo assim — destrava decisões e não
  bloqueia ninguém. Decisão revisável pelo tech lead: o pilar Conteúdo pode
  ser antecipado sem custo estrutural, pois só depende de 0–2.
- O Stage 9 é o único que toca `apps/mobile-consumer`.

## Como usar esta documentação

Mesmo modelo do storefront: o tech lead mantém `01`–`11` como fonte da
verdade; para cada stage entrega ao executor o prompt de `12`; o executor
implementa, commita na branch da feature e resume; o resumo volta ao tech lead
que valida contra o doc do stage (`13`).

## Status dos stages

| Stage | Pilar | Descrição | Status |
|---|---|---|---|
| 0 | Conteúdo | Backend: `store_posts`, RLS, bucket, view pública | ✅ implementado (`f7ce09d`; validação `db reset` pendente de Docker) |
| 1 | — | Scaffold `apps/mobile-partner` | ✅ implementado (`1d27e44`) |
| 2 | — | Auth lojista + gate | ✅ implementado (`48b3c41`) |
| 3 | Gestão | Pedidos em tempo real | ✅ implementado (`6e1a4e8`; mini-mapa ficou como última posição + ligar — decisão registrada) |
| 4 | Gestão | Catálogo: produtos, categorias, estoque | ✅ implementado (`e2c4209`) |
| 5 | Gestão | Financeiro e relatórios | ✅ implementado (`af4a76e`; agregados extraídos p/ `@mallevo/lib` — fonte única web+app) |
| 6 | Gestão | Operação da loja | ⬜ não iniciado |
| 7 | Conteúdo | Captura + compressão + upload TUS | ⬜ não iniciado |
| 8 | Conteúdo | Gestão de conteúdo + métricas | ⬜ não iniciado |
| 9 | Conteúdo | Integração do feed real no consumer | ⬜ não iniciado |

> Atualizar esta tabela ao fim de cada stage (responsabilidade do tech lead).
