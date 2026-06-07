# StoreTheme — Design Premium das Lojas Parceiras

> **O que é este conjunto de docs.** A especificação do sistema de **design visual por loja** do Mallevo: o tema premium que faz o storefront (web) e o app consumidor (mobile) **se transformarem na cara da loja parceira** quando o cliente entra nela — em vez do layout genérico de hoje.

## A ideia em uma frase

O Mallevo é um shopping online de delivery. Na home, as lojas aparecem por pisos. Ao **entrar** numa loja, a interface deve assumir o **design daquela loja** — e o **mesmo design** vale para o storefront web. Esse design é o **StoreTheme**.

## Os dois sistemas (e por que não se confundem)

O código tem dois conceitos que ambos já se chamaram "template". Eles são complementares, não concorrentes:

| | `DashboardTemplate` | `StoreTheme` (este doc) |
|---|---|---|
| Responde | "Que **ferramentas** o lojista vê" | "Qual a **aparência** da loja pro cliente" |
| Indexado por | Nicho (`food`, `fashion`, `pharmacy`, `pet`, `services`, `generic`) | Arquétipo de design + paleta |
| Onde vive | `packages/lib/src/templates/` | `stores.theme` (JSONB) + theme engine compartilhado |
| Quem consome | Dashboard web (sidebar, form de produto), e `layoutPdp` no mobile | Storefront + app consumidor (tela inteira da loja) |
| Status | ✅ Implementado e mantido | 🔴 A construir — é o foco destes docs |

`DashboardTemplate` **permanece intacto**. O StoreTheme **deriva sugestões** dele (o nicho sugere o arquétipo), mas é um eixo próprio.

Ver detalhes em [01-conceito-e-relacao-templates.md](01-conceito-e-relacao-templates.md).

## Índice

| Doc | Conteúdo |
|---|---|
| [01 — Conceito e relação com templates](01-conceito-e-relacao-templates.md) | StoreTheme × DashboardTemplate, modelo híbrido, contrato conceitual |
| [02 — Arquétipos de design](02-arquetipos-de-design.md) | Os 6 arquétipos extraídos das referências, DNA visual, mapa nicho→arquétipo, links de referência |
| [03 — Design tokens e schema](03-design-tokens-e-schema.md) | Tokens (cores, tipografia, raios, densidade) e a evolução de `stores.theme` |
| [04 — Theme engine](04-theme-engine.md) | Provider compartilhado web (CSS vars) + mobile (RN context); fim das cópias duplicadas de `consumer-design.ts` |
| [05 — Aplicação storefront e consumer](05-aplicacao-storefront-consumer.md) | Onde cada token é consumido: header, cards, PDP, navegação |
| [06 — Onboarding e extração de cor](06-onboarding-e-extracao-cor.md) | Wizard, sugestão por nicho, paleta a partir da logo |
| [07 — Roadmap de implementação](07-roadmap-implementacao.md) | Fases: schema → engine → storefront → mobile → onboarding |

## Estado atual (diagnóstico que originou estes docs)

- `stores.theme` (JSONB) **existe** mas guarda apenas `{ template, paleta }` genéricos (`market|boutique|artesanal|neon` + paletas tipo `midnight|ocean`).
- O lojista **escolhe e salva** tema em `apps/web/components/dashboard/minha-loja-editor.tsx`, mas **nada lê** esse campo para renderizar: o storefront carrega `theme` e descarta (`apps/storefront/lib/tenant.ts`); o mobile nem carrega.
- Storefront e mobile usam **cópias hardcoded** de `consumer-design.ts` — mesma paleta neon para toda loja.
- Os designs premium das referências (`design-lojas.md`) nunca foram traduzidos em código.

Este conjunto de docs corrige isso: transforma o `StoreTheme` num sistema de tokens reais, aplicado de ponta a ponta.
</invoke>
