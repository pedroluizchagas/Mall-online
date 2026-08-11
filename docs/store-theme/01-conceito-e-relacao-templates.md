# 01 — Conceito e relação com DashboardTemplate

## 1.1 O problema que o StoreTheme resolve

Hoje, ao entrar numa hamburgueria, numa boutique de moda ou num petshop, a interface do app/storefront é **visualmente idêntica**: mesma cor neon `#D8FF3E`, mesmo header, mesmos cards. A única coisa que muda é o miolo do modal de produto (via `layoutPdp`). A "transformação no design da loja" prometida não acontece.

O **StoreTheme** é a camada que faz a interface vestir a identidade da loja — cores, tipografia, raios, densidade e estrutura — no storefront **e** no app consumidor, a partir de uma única fonte de verdade (`stores.theme`).

## 1.2 Dois eixos ortogonais

A confusão histórica foi tratar "template" como uma coisa só. São dois eixos independentes:

```
                FUNÇÃO (o que o lojista opera)        APARÊNCIA (o que o cliente vê)
                ──────────────────────────────        ──────────────────────────────
   Conceito     DashboardTemplate                     StoreTheme
   Indexa por   nicho (categoria da loja)             arquétipo de design + paleta
   Define       módulos do dashboard, campos do        cores, tipografia, raios,
                produto, labels, layoutPdp             densidade, estrutura de seções
   Fonte        packages/lib/src/templates/            stores.theme (JSONB)
   Derivado de  categories.slug                        sugerido pelo nicho, escolhido no onboarding
```

Um restaurante (nicho `food`) **sempre** terá o dashboard de food. Mas pode vestir o arquétipo **Heritage** (clássico, serifado) ou um mais casual — sem trocar de nicho.

## 1.3 O modelo híbrido (decisão de arquitetura)

> **Decisão:** o StoreTheme é **híbrido** — a *estrutura* de layout segue o nicho; a *pele* é livre.

Isso reconcilia duas verdades:

1. **Estrutura segue o nicho.** Um cardápio (grupos + modificadores) é estruturalmente diferente de uma grade de moda (produto × variação) ou de uma agenda de serviços. Essa estrutura **deriva do `DashboardTemplate`** (já é assim no `layoutPdp`). Não faz sentido um cardápio numa loja de roupas.
2. **Pele é livre.** Cor, tipografia, raios e o arquétipo visual são **escolha do lojista** — sugeridos pelo nicho no onboarding, mas livremente alteráveis. Isso atende ao doc de onboarding: *"isso será apresentado como apenas uma sugestão, o usuário pode alterar as cores da maneira que quiser."*

Na prática:

```
StoreTheme.estrutura  ← derivada de DashboardTemplate (nicho)        [travada]
StoreTheme.pele       ← preset (arquétipo) + paleta + tipografia     [escolhível / sugerida]
```

## 1.4 A ponte: nicho → arquétipo sugerido

Cada **categoria** tem um arquétipo visual **default sugerido**, mas o lojista pode trocar dentro de um conjunto compatível. O mapeamento é por categoria (mais fino que por template) — a matriz completa das 20 categorias está em [02 §2.3](02-arquetipos-de-design.md) e em código em `packages/lib/src/store-theme/mapping.ts`. Visão por template funcional:

| Nicho (`DashboardTemplate`) | Default típico | Observação |
|---|---|---|
| `food` | Heritage | casual/rápido → Market ou Soft |
| `fashion` | Editorial / Noir | sport → Raw |
| `pharmacy` | **Clinic** | clínico/confiança, não fofo |
| `pet` | Soft Care | infantil → Playful |
| `services` | Soft / **Clinic** / **Utility** | beleza→Soft, saúde/vet→Clinic, oficina→Utility |
| `generic` | varia por categoria | tech→Tech, mercado→Market, construção→Utility, brinquedos→Playful, decoração→Artisan |

São **20 arquétipos** no total (15 de referência + 5 desenhados internamente para fechar lacunas de saúde, tech, mercado, utilidade e lúdico). Detalhe em [02-arquetipos-de-design.md](02-arquetipos-de-design.md).

## 1.5 Contrato conceitual (resumo)

O `StoreTheme` persistido evolui de `{ template, paleta }` para um contrato de tokens. Forma conceitual (schema concreto em [03](03-design-tokens-e-schema.md)):

```ts
interface StoreThemeConfig {        // persistido em stores.theme; schema real em [03 §3.5]
  v: 2
  preset: ArquetipoCodigo           // 1 de 11: heritage|raw|editorial|noir|soft|artisan|clinic|tech|market|utility|playful
  color?: Partial<ColorTokens>      // overrides de cor do lojista (do preset, por padrão)
  fonts?: { display?; body? }       // override de família tipográfica
  shape?: Partial<ShapeTokens>      // raios, densidade
  mode?: 'light' | 'dark'
  // estrutura NÃO entra aqui — vem do DashboardTemplate (nicho)
}
```

## 1.6 O que NÃO muda

- `DashboardTemplate` e `packages/lib/src/templates/` permanecem como estão. Nenhuma migração funcional.
- `layoutPdp` continua sendo a fonte da estrutura do PDP.
- As categorias (`categories`) e o `categoria_id` da loja seguem iguais.

O StoreTheme é **aditivo**: substitui apenas o conteúdo do campo `stores.theme` e adiciona o theme engine que hoje não existe.
