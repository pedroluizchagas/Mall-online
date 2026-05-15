# ADR 0001 — Backend único Supabase com isolamento por RLS por ator

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Data** | 2026-05-15 (retroativo — decisão original em `docs/02`) |
| **Decisor** | Arquitetura |
| **Specs afetadas** | Todas as que tocam dados |

## Contexto

Quatro atores (plataforma, lojista, consumidor, entregador) e três frontends
(web, mobile-consumer, mobile-courier) precisam compartilhar dados em tempo
real (pedidos, localização) com baixo custo operacional para um produto
regional em estágio inicial.

## Decisão

Um único projeto Supabase serve os três apps. A separação de contexto entre
atores é feita por **Row Level Security**, não por projetos/bancos separados.
O `role` do ator vive em `user_metadata` do JWT; policies filtram por
`role` + ID correspondente (`my_tenant_id()`, `my_consumer_id()`,
`my_courier_id()`).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Um projeto Supabase por ator | Custo e complexidade de sincronização; quebra realtime cross-ator. |
| Backend próprio (Node) + Postgres | Mais controle, muito mais infra e tempo; sem ganho no estágio atual. |

## Consequências

**Positivas:** custo baixo, realtime nativo entre atores, um único deploy de
schema, consistência forte.

**Negativas / dívidas aceitas:** RLS vira ponto único de falha de segurança —
exige teste de isolamento obrigatório (ver constituição §2.5). Toda tabela
sensível **precisa** de RLS explícita.

**Impacto na constituição:** origem das regras §2.1–§2.5.
