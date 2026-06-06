# Partner App — Documentação de Implementação

> App mobile dedicado do lojista para **gravar, enviar e gerenciar os vídeos
> do Explorar direto do celular** — projeto Expo próprio (`apps/mobile-partner`),
> isolado do runtime do Dashboard (`apps/web`).

## Problema que este app resolve

Hoje o Explorar (`apps/mobile-consumer/app/(tabs)/explorar.tsx`) é um feed
TikTok-style **alimentado por mock** (`const REELS: Reel[] = [...]`). Não existe
tabela, bucket nem fluxo de publicação. Para o lojista publicar um vídeo o
caminho real seria: gravar no celular → subir pra nuvem → baixar no computador →
abrir o Dashboard web → enviar. Inviável na prática.

O Partner App fecha o ciclo no aparelho onde o vídeo nasce: **gravar → revisar →
escrever legenda → vincular produto → publicar**, em segundos, sem sair do
celular.

> ⚠️ **Premissa que muda o escopo:** o Explorar **não tem backend**. Este
> projeto entrega tanto o app do parceiro quanto a fundação de dados do
> Explorar (tabela, storage, view pública) e religa o consumer ao dado real.
> Não é "só mais um app" — é a feature Explorar inteira saindo do mock.

## Modelo de produto: 4 superfícies, 1 cérebro

O Mallevo já opera **frontends isolados sobre um backend compartilhado** (ver
[`docs/storefront/00-INDEX.md`](../storefront/00-INDEX.md)). O Partner App é a
quarta superfície:

| Superfície | App | Público | Frontend | Backend |
|---|---|---|---|---|
| Aba "loja"/Explorar no app | `apps/mobile-consumer` | consumidor | isolado | **compartilhado** |
| Storefront `{loja}.mallevo.com.br` | `apps/storefront` | consumidor (web) | isolado | **compartilhado** |
| Dashboard do lojista | `apps/web` | lojista (autenticado) | isolado | **compartilhado** |
| **Partner App (Explorar studio)** | **`apps/mobile-partner`** (novo) | **lojista (mobile)** | **isolado** | **compartilhado** |

**Regra de ouro (idêntica ao storefront):** isolamento é de
**runtime / deploy / frontend**, NUNCA de dados. Supabase, auth do lojista
(`tenants`/`stores`), Storage e a futura tabela `store_videos` são um só backend.

## Decisões de arquitetura (fechadas)

1. **Projeto Expo separado** `apps/mobile-partner` (gêmeo de
   `apps/mobile-courier`), não tela nova no `apps/web` nem no consumer.
2. **Mesma stack mobile do monorepo**: Expo SDK 54, expo-router 6, RN 0.81,
   React 19, NativeWind 4, Zustand, `@supabase/supabase-js`, `@mallevo/lib`,
   `@mallevo/types`. Reaproveita `lib/supabase.ts` e o bootstrap de sessão do
   `_layout.tsx` do courier.
3. **Auth = usuário lojista existente** (`auth.users` → `tenants.user_id`).
   Mesmo login do Dashboard (`signInWithPassword`). Sem cadastro novo.
4. **Vídeo pertence à `store`** (`store_videos.store_id`), não ao `tenant`. O
   feed do consumer já é por loja (`loja_slug`, `loja_nome`). Tenant com várias
   lojas escolhe a loja ao publicar.
5. **Storage bucket dedicado `explore-videos`**, privado-por-escrita /
   público-por-leitura, prefixado por `{tenant_id}/{store_id}/`, mesmo padrão
   RLS de `store-assets` (`my_tenant_id()`).
6. **Upload resumível (TUS)** via `supabase.storage`, não multipart simples —
   vídeos de celular passam fácil de 50 MB e conexão móvel cai.
7. **Compressão no cliente** antes do upload (alvo ~1080p / ~8 Mbps / ≤60 s).
   Sem pipeline de transcode server-side no MVP (decisão revisável — ver `01`).
8. **Catálogo público via view dedicada** `public_explore_feed`, NUNCA abrindo
   `store_videos` ao papel `anon` — mesma decisão #4 do storefront.
9. **Estado de publicação explícito** (`processing | published | hidden |
   removed`) + moderação leve (flag), não publicação direta sem trilha.

## Índice

- `01-arquitetura-e-decisoes.md` — decisões, isolado vs compartilhado, riscos, alternativas
- `02-stage-0-backend.md` — **BLOQUEANTE**: tabela `store_videos`, RLS, bucket, view pública, contrato com o consumer
- `03-stage-1-scaffold.md` — scaffold do `apps/mobile-partner`
- `04-stage-2-auth-gate.md` — login lojista + gate (tenant ativo, loja existente)
- `05-stage-3-captura-upload.md` — câmera/galeria, compressão, upload TUS, criar registro
- `06-stage-4-gestao-conteudo.md` — listar/editar/remover vídeos próprios, métricas
- `07-stage-5-integracao-consumer.md` — trocar o mock `REELS` pelo feed real
- `08-prompts-execucao.md` — prompts auto-contidos para o agente executor
- `09-workflow-tech-lead.md` — ciclo executar → resumir → revisar → merge

## Como usar esta documentação

Mesmo modelo do storefront: o tech lead mantém `01`–`07` como fonte da verdade;
para cada stage entrega ao executor o prompt de `08`; o executor implementa,
commita na branch da feature e resume; o resumo volta ao tech lead que valida
contra o doc do stage (`09`).

## Status dos stages

| Stage | Descrição | Status |
|---|---|---|
| 0 | Backend: `store_videos`, RLS, bucket, view pública | ⬜ não iniciado |
| 1 | Scaffold `apps/mobile-partner` | ⬜ não iniciado |
| 2 | Auth lojista + gate | ⬜ não iniciado |
| 3 | Captura + compressão + upload TUS | ⬜ não iniciado |
| 4 | Gestão de conteúdo + métricas | ⬜ não iniciado |
| 5 | Integração do feed real no consumer | ⬜ não iniciado |

> Atualizar esta tabela ao fim de cada stage (responsabilidade do tech lead).
