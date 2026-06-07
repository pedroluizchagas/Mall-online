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

Cada nicho do `DashboardTemplate` tem um arquétipo visual **default sugerido**, mas o lojista pode trocar dentro de um conjunto compatível:

| Nicho (`DashboardTemplate`) | Arquétipo sugerido | Alternativas oferecidas |
|---|---|---|
| `food` | Heritage | Soft Care (casual) |
| `fashion` | Editorial Minimal | Raw/Street, Noir Luxe |
| `pharmacy` | Soft Care | Editorial Minimal |
| `pet` | Soft Care | Editorial Minimal |
| `services` | Soft Care | Editorial Minimal |
| `generic` | Editorial Minimal | qualquer um |

Detalhe dos arquétipos em [02-arquetipos-de-design.md](02-arquetipos-de-design.md).

## 1.5 Contrato conceitual (resumo)

O `StoreTheme` persistido evolui de `{ template, paleta }` para um contrato de tokens. Forma conceitual (schema concreto em [03](03-design-tokens-e-schema.md)):

```ts
interface StoreTheme {
  preset: ArquetiptoCodigo          // 'heritage' | 'raw' | 'editorial' | 'noir' | 'soft' | 'artisan'
  palette: PaletteTokens            // cores resolvidas (do preset ou override do lojista)
  typography: TypographyTokens      // par de fontes + escala
  shape: ShapeTokens                // raios, densidade
  // estrutura NÃO entra aqui — vem do DashboardTemplate (nicho)
}
```

## 1.6 O que NÃO muda

- `DashboardTemplate` e `packages/lib/src/templates/` permanecem como estão. Nenhuma migração funcional.
- `layoutPdp` continua sendo a fonte da estrutura do PDP.
- As categorias (`categories`) e o `categoria_id` da loja seguem iguais.

O StoreTheme é **aditivo**: substitui apenas o conteúdo do campo `stores.theme` e adiciona o theme engine que hoje não existe.
</content>
