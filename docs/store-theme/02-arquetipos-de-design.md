# 02 — Arquétipos de design

> Este doc absorve e estrutura o antigo `design-lojas.md`. As ~25 referências do Framer não são 25 designs distintos — elas colapsam em **6 arquétipos**. Cada loja parceira veste **um arquétipo + uma paleta**; o nicho sugere o default.

## 2.1 Por que arquétipos (e não um design por loja)

Implementar e manter 25 layouts é inviável. Mas as referências, quando agrupadas por linguagem visual (paleta, tipografia, estrutura, mood), revelam **6 famílias**. Isso reduz o trabalho de "25 designs" para "6 presets parametrizáveis por paleta" — e dá ao lojista variedade real sem explosão de manutenção.

## 2.2 Os 6 arquétipos

### A. Heritage — `heritage`
- **Nichos:** restaurantes, churrascarias, cafeterias boutique.
- **DNA:** serifa de display em destaque; neutros quentes/creme **ou** versão dark; foto de comida full-bleed; selos de tradição ("Since 1980"); muito respiro; CTA discreto.
- **Mood:** sofisticado, atemporal, acolhedor, exclusivo.
- **Refs-âncora:** [Veloria](https://veloriarestaurant.framer.website/), [Savoria](https://savoriarestro.framer.website/), [Bistora](https://bistora.framer.website/), [La Paloma](https://lapaloma.framer.website/), [Multiple Influence](https://multiple-influence-475025.framer.app/).

### B. Raw / Street — `raw`
- **Nichos:** moda masculina/sport, streetwear.
- **DNA:** sans pesada e condensada; alto contraste; fundo dark; copy provocativa ("Wear the hype raw"); grid de "drops" com badges; lifestyle.
- **Mood:** ousado, urbano, rebelde, premium-cru.
- **Refs-âncora:** [Rawline](https://rawline.framer.website/), [Wearix](https://wearix.framer.website/), [Wearvo](https://wearvo.framer.website/).

### C. Editorial Minimal — `editorial`
- **Nichos:** moda feminina elegante, unissex, simples; default genérico.
- **DNA:** sans clean; paleta neutra (preto/branco/cinza); seções numeradas (01·02·03); foto de produto editorial; whitespace generoso; badges "New/Sale".
- **Mood:** sofisticado, minimalista, curado, aspiracional.
- **Refs-âncora:** [Veonn](https://veonn.framer.website/), [Zaro](https://zaro.framer.website/), [Marion](https://marionshop.framer.website/), [AXM](https://axm.framer.website/), [Axels](https://axels.framer.website/).

### D. Noir Luxe — `noir`
- **Nichos:** acessórios de luxo, joias, automóveis premium.
- **DNA:** fundo preto; acentos metálicos; imagem domina o texto; tipografia de alto contraste com tracking largo; restrição máxima ("simplicity signals confidence").
- **Mood:** luxuoso, exclusivo, dramático, contemporâneo.
- **Refs-âncora:** [Caelora](https://caelora.framer.website/), [Aurum](https://aurum-frameship-template.framer.website/), [Esteem](https://esteem.framer.website/).

### E. Soft Care — `soft`
- **Nichos:** petshop, serviços/salões, farmácia.
- **DNA:** cantos bem arredondados; acentos quentes e suaves; sans amigável; stats de prova social ("1.200+ pets"); tiers de preço; tom acolhedor e seguro.
- **Mood:** caloroso, confiável, amigável, profissional.
- **Refs-âncora:** [Groomerly](https://groomerly.framer.website/), [PetPals](https://petpals.framer.website/).

### F. Artisan Warm — `artisan`
- **Nichos:** móveis e artigos de decoração.
- **DNA:** neutros naturais e tons de madeira; matte; narrativa de materialidade ("solid European oak, hand-oiled"); seções numeradas; foto tátil; ritmo calmo.
- **Mood:** refinado, calmo, artesanal, minimalista-luxe.
- **Refs-âncora:** [Graft](https://graft.framer.website/), [Drivoxe](https://drivoxe.framer.website/) (variante padrão automotiva).

## 2.3 Mapa nicho → arquétipo

Espelha a tabela de sugestão em [01 §1.4](01-conceito-e-relacao-templates.md). O default é o que o onboarding pré-seleciona; as alternativas são as peles compatíveis oferecidas.

| Nicho | Default | Alternativas |
|---|---|---|
| `food` | Heritage | Soft Care |
| `fashion` | Editorial Minimal | Raw, Noir |
| `pharmacy` | Soft Care | Editorial |
| `pet` | Soft Care | Editorial |
| `services` | Soft Care | Editorial |
| `generic` | Editorial Minimal | qualquer |

## 2.4 Eixo de paleta (independente do arquétipo)

Cada arquétipo tem uma **paleta default** mas aceita troca. As paletas devem ser derivadas, idealmente, da logo do lojista (ver [06](06-onboarding-e-extracao-cor.md)); na ausência, oferecemos presets de paleta por arquétipo. Cada paleta precisa resolver, no mínimo:

- `bg` / `surface` / `surfaceAlt` — fundos.
- `ink` / `inkMuted` — texto.
- `accent` / `accentInk` — ação (botões/CTA) e seu texto legível.
- `line` — divisores.
- `success` / `warning` / `danger` — semânticos (podem ser fixos do Mallevo).

Hex concretos por arquétipo ficam em [03-design-tokens-e-schema.md](03-design-tokens-e-schema.md).

## 2.5 Como evoluir esta lista

Novas referências devem ser **classificadas num arquétipo existente** antes de se cogitar um 7º. Só criar arquétipo novo quando uma loja não couber em nenhum DNA atual (ex.: um nicho com estrutura de layout genuinamente diferente). Cada arquétipo carrega seu conjunto de paletas — é aí que entra a variedade, não em novos arquétipos.

## 2.6 Referências completas (fonte: design-lojas.md)

Catálogo bruto original, agora rotulado por arquétipo:

- **Praça de alimentação** → Heritage: Veloria, Savoria, Bistora (churrascaria), La Paloma + Multiple Influence (cafeteria boutique).
- **Vestuário masculino / sport** → Raw: Wearix, Rawline, Wearvo.
- **Vestuário feminino elegante / simples / unissex** → Editorial: Veonn, Zaro, Marion, AXM.
- **Acessórios** → Editorial (padrão: Axels) / Noir Luxe (luxo: Caelora, Aurum).
- **Petshop** → Soft Care: Groomerly (elegante/minimalista), PetPals (padrão).
- **Automóveis** → Noir Luxe (luxo: Esteem) / Artisan-Padrão (Drivoxe).
- **Móveis e decoração** → Artisan Warm: Graft.
</content>
