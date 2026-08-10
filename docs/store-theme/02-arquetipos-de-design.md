# 02 — Arquétipos de design

> Este doc absorve e estrutura o antigo `design-lojas.md`. As referências do Framer colapsam em **12 arquétipos**; mais **5 arquétipos desenhados internamente** cobrem os nichos sem referência (farmácia, eletrônicos, mercado, construção/oficinas, brinquedos). Total: **17 arquétipos que cobrem 100% das 20 categorias** do Mallevo. Cada loja veste **um arquétipo + uma paleta**; o nicho sugere o default.
>
> **Implementação:** `packages/lib/src/store-theme/presets.ts` (catálogo `ARQUETIPOS`).

## 2.1 Por que arquétipos (e não um design por loja)

Manter 25 layouts é inviável. Agrupadas por linguagem visual (paleta, tipografia, estrutura, mood), as referências revelam **famílias**. Isso reduz "25 designs" para "17 presets parametrizáveis por paleta" — variedade real sem explosão de manutenção. As referências cobriam só varejo boutique + alimentação; os nichos de **serviço, saúde, tecnologia, mercado e utilidade** exigiram arquétipos próprios, desenhados internamente segundo o mesmo método.

## 2.2 Os 17 arquétipos

### Derivados de referência (12)

#### A. Heritage — `heritage`
- **Nichos:** restaurantes, churrascarias, cafeterias boutique.
- **DNA:** serifa de display; neutros quentes/creme; foto de comida full-bleed; selos de tradição; muito respiro.
- **Mood:** sofisticado, atemporal, acolhedor.
- **Refs:** [Veloria](https://veloriarestaurant.framer.website/), [Savoria](https://savoriarestro.framer.website/), [Bistora](https://bistora.framer.website/), [La Paloma](https://lapaloma.framer.website/), [Multiple Influence](https://multiple-influence-475025.framer.app/).

#### A2. Roast — `roast`
- **Nichos:** cafeterias, confeitarias boutique e **açaíterias** (alternativa de `alimentos-bebidas`).
- **DNA:** pôster retrô — verde-floresta profundo + âmbar vibrante; tipografia gigante REPETIDA em degradê com o produto flutuando por cima; cardápio em CARTÕES ÂMBAR chapados com marca d'água do título; "MENU" gigante na vertical; cantos bem redondos.
- **Mood:** quente, retrô, espirituoso.
- **Refs:** [Kafoska](https://multiple-influence-475025.framer.app/).
- **Paletas:** verde+âmbar (default), Barro (café/terracota), Hortelã (verde-menta noturno), **Açaí (roxo profundo + orquídea — a pele das açaíterias)**. O degradê do pôster deriva do accent da paleta, então a vitrine serve todas sem código novo — a tese do §2.1 em ação.
- **Por que não é o Heritage:** heritage é serifa/creme/aconchego clássico; roast é cartaz — cor saturada, sans pesadíssima e humor gráfico. 2026-08: 14º arquétipo, com **vitrine própria** — ver [05 §5.6](05-aplicacao-storefront-consumer.md).

#### A5. Ritual — `ritual`
- **Nichos:** açaíterias, casas de matcha/smoothies e alimentação lifestyle (alternativa de `alimentos-bebidas`).
- **DNA:** rosa chiclete de página + roxo-açaí profundo + creme; toda seção é um CARTÃO de canto bem redondo FLUTUANDO no rosa (o gutter rosa aparece ao redor de tudo); caps condensadas (Anton) em quase todo texto — corpo quase inexistente — e wordmark GROOVY (Shrikhand) gigante sobre a foto; chrome reduzido a um único pill flutuante centrado; palavra da seção GIGANTE fixa atrás dos produtos recortados, com os nomes dos vizinhos rotacionados sangrando nos cantos; cardápio em cartão CREME puramente tipográfico (nome + preço, sem foto nem descrição).
- **Mood:** groovy, espirituoso, vibrante.
- **Refs:** [OCHA](https://ocha.framer.website/).
- **Paletas:** rosa+roxo-açaí (default), Matcha (o verde-profundo literal da referência), Pitaya (vinho-magenta tropical). A palavra gigante e o wordmark são pintados com `bg` sobre `accent`, então trocar de paleta repinta a vitrine inteira sem código novo — a tese do §2.1 outra vez.
- **Layout próprio no consumer:** vitrine ritual — ver [05 §5.6](05-aplicacao-storefront-consumer.md).
- **Por que não é o Roast:** os dois atendem açaíteria, e é exatamente aí que a regra do §2.5 decide — não basta a mesma comida, tem que ser a mesma gramática. Roast é pôster retrô DARK (verde-floresta + âmbar, título repetido em degradê, marca d'água no cartão, cardápio-cartaz). Ritual é LIGHT rosa e lifestyle: cartões flutuando na página, menu tipográfico creme, palavra-atrás-do-produto e humor groovy de "romantize sua rotina". Estrutura de layout e contexto de uso genuinamente diferentes — paleta nova não resolveria (o roast já tem a sua, **Açaí**, e continua sendo outro design). 2026-08: 17º arquétipo, 12º derivado de referência.

#### A3. Magazine — `magazine`
- **Nichos:** lojas de departamento / vende-tudo (Havan, Casas Bahia) — **default da categoria `outros`**.
- **DNA:** varejo clássico e confiável — branco quente, SERIFA de display (Spectral) nos títulos e wordmark, pills escuras, chips VERDES de oferta, hero com caixa emoldurada translúcida, tiles de categoria em foto cheia, "Adicionar" no próprio cartão.
- **Mood:** varejista, clássico, confiável.
- **Refs:** [Revive](https://revivebeauty.framer.website/).
- **Paletas:** preto (default), Framboesa (rosa-varejo), Azul magazine.
- **Layout próprio no consumer:** vitrine magazine — ver [05 §5.6](05-aplicacao-storefront-consumer.md). 2026-08: 15º arquétipo (market é supermercado denso; editorial é moda minimal — nenhum tinha a gramática de magazine).

#### A4. Smash — `smash`
- **Nichos:** hamburguerias, fast-food, lanchonetes de apetite (alternativa de `alimentos-bebidas`).
- **DNA:** bordô profundo + laranja vivo + folha CREME; manchete de apetite em caps pesadíssimas (Archivo); pills por toda parte (CTA, chips, header e barra de menu em PÍLULA FLUTUANTE); chips de categoria com ativa em OURO; cards de item em pager de um cartão com dots; faixa marquee dourada; ofertas em cards laranja com selo "ECONOMIZE" e itens em bullets; molduras coloridas (laranja/rosa/céu) nas fotos do hero.
- **Mood:** apetitoso, ousado, divertido.
- **Refs:** [Stack N Snack](https://stack-n-snack.framer.website/).
- **Paletas:** bordô+laranja (default), Mostarda (marrom-espresso + mostarda), Pimenta (fuligem quente + vermelho-pimenta).
- **Por que não é o Roast nem o Market:** roast é pôster retrô de cafeteria (contemplativo, marca d'água, cardápio-cartaz); market é utilidade de supermercado. Smash é APETITE — ritmo de lanchonete, cor de fome (bordô/laranja/ouro), humor de fast-food premium. 2026-08: 16º arquétipo, com **vitrine própria** — ver [05 §5.6](05-aplicacao-storefront-consumer.md).

#### B. Raw / Street — `raw`
- **Nichos:** moda masculina/sport, streetwear.
- **DNA:** sans pesada e condensada; alto contraste; fundo dark; grid de "drops" com badges.
- **Mood:** ousado, urbano, rebelde.
- **Refs:** [Rawline](https://rawline.framer.website/), [Wearix](https://wearix.framer.website/), [Wearvo](https://wearvo.framer.website/).

#### C. Editorial Minimal — `editorial`
- **Nichos:** moda elegante/unissex, cosméticos; **default neutro** de qualquer loja.
- **DNA:** sans clean; paleta neutra; seções numeradas; whitespace generoso; foto editorial.
- **Mood:** minimalista, curado, sofisticado.
- **Layout próprio no consumer:** em categorias de moda/beleza este arquétipo veste a **vitrine editorial** (hero full-bleed com autoplay, cards 3:4 sem chrome, PDP imersivo com cartão de vidro) — ver [05 §5.6](05-aplicacao-storefront-consumer.md).
- **Refs:** [Veonn](https://veonn.framer.website/), [Zaro](https://zaro.framer.website/), [Marion](https://marionshop.framer.website/), [AXM](https://axm.framer.website/), [Axels](https://axels.framer.website/).

#### D. Noir Luxe — `noir`
- **Nichos:** acessórios de luxo, joias, automóveis premium, beleza high-end, **restaurantes refinados** (fine dining — 2026-08).
- **DNA:** fundo preto; acentos metálicos; imagem domina o texto; tipografia de alto contraste; serifa ITÁLICA para nomes (itálicos verdadeiros do Cormorant carregados junto com o tema).
- **Mood:** luxuoso, exclusivo, dramático.
- **Layout próprio no consumer:** em alimentos & bebidas este arquétipo veste a **vitrine noir gastronômica** (cardápio-livro, carrossel central, preços em dourado) — ver [05 §5.6](05-aplicacao-storefront-consumer.md).
- **Refs:** [Caelora](https://caelora.framer.website/), [Aurum](https://aurum-frameship-template.framer.website/), [Esteem](https://esteem.framer.website/).

#### D2. Serene — `serene`
- **Nichos:** beleza feminina/skincare (**default**), joias delicadas, salões premium.
- **DNA:** tipografia em peso LEVE (a delicadeza vem do peso, não da cor); cards em cinza-névoa; botões fantasma de contorno fino; ardósia serena de acento; muito ar.
- **Mood:** delicado, sereno, elegante.
- **Refs:** [All Natural](https://all-natural.framer.website/).
- **Por que não é o Editorial:** o editorial constrói sofisticação com PESO (display 800, contraste agressivo); o serene constrói com LEVEZA (display 400, calma). São gramáticas opostas do mesmo minimalismo — 2026-08: adicionado como 12º arquétipo ao verificar que a referência não mapeava em nenhum dos 11.

#### D3. Volt — `volt`
- **Nichos:** fitness, esporte, suplementos (vestuário esportivo e saúde/performance).
- **DNA:** claro e enérgico — caps pesadíssimas (Archivo), palco cinza-claro para o produto, acento VOLT elétrico em micro-momentos (badges, ticker), pills por toda parte, faixa-anúncio e marquee de benefícios.
- **Mood:** energético, atlético, vivo.
- **Refs:** [Nivest](https://nivest-framlix.framer.website/).
- **Paletas:** volt (default), elétrico (azul-violeta), laranja-pista.
- **Layout próprio no consumer:** vestuário esportivo e saúde/bem-estar vestem a **vitrine volt** (faixa-anúncio, ticker marquee, grid de chips) — ver [05 §5.6](05-aplicacao-storefront-consumer.md). 2026-08: 13º arquétipo, criado ao verificar que fitness não mapeava em nenhum dos 12 (raw é dark, tech é clínico, playful é infantil).

#### E. Soft Care — `soft`
- **Nichos:** petshop, salões/estética, beleza-serviço.
- **DNA:** cantos bem arredondados; acentos quentes; sans amigável; stats + tiers; tom acolhedor.
- **Mood:** caloroso, amigável, confiável.
- **Refs:** [Groomerly](https://groomerly.framer.website/), [PetPals](https://petpals.framer.website/).

#### F. Artisan Warm — `artisan`
- **Nichos:** móveis, decoração, floricultura.
- **DNA:** neutros naturais e tons de madeira; matte; narrativa de materialidade; foto tátil. Display em sans ARREDONDADA suave (calibrado contra a ref em 2026-08 — o Graft não usa serifa; serifa é território do heritage).
- **Mood:** refinado, calmo, artesanal.
- **Refs:** [Graft](https://graft.framer.website/).
- **Layout próprio no consumer:** em casa/decoração e flores este arquétipo veste a **vitrine artesã** (seções numeradas, carrossel de peças com setas, PDP com ficha técnica) — ver [05 §5.6](05-aplicacao-storefront-consumer.md).

### Desenhados internamente (5) — fecham as lacunas

> Sem referência Framer; seguem o mesmo método (paleta + tipografia + forma + densidade coerentes com o contexto de uso e a jornada do nicho).

#### G. Clinic — `clinic`
- **Nichos:** **farmácia & medicamentos**, **saúde & bem-estar**, **veterinária**.
- **Problema que resolve:** saúde exige **credibilidade e legibilidade**, não fofura (Soft) nem luxo (Noir). Catálogos densos (bula, princípio ativo, validade) pedem alta densidade e contraste.
- **DNA:** limpo e clínico; paleta verde-água (saúde/confiança); alta legibilidade; densidade compacta; cantos suaves; ícones funcionais.
- **Mood:** clínico, confiável, sereno.

#### H. Tech — `tech`
- **Nichos:** **eletrônicos & tecnologia**.
- **Problema que resolve:** eletrônicos têm linguagem própria — grade de specs, comparação, precisão. Editorial é minimalista demais; falta o "tom techy".
- **DNA:** cantos retos; grade densa; acento azul elétrico; tipografia geométrica (display) + neutra (corpo); ênfase em especificação.
- **Mood:** moderno, preciso, tecnológico.

#### I. Market — `market`
- **Nichos:** **mercado & conveniência** (e alimentação casual/rápida como alternativa).
- **Problema que resolve:** compra de mercado é **escaneável e por preço/oferta** — grade densa, muitos itens, destaque de promoção. Nenhum arquétipo boutique serve.
- **DNA:** brilhante e eficiente; acento verde fresco; densidade compacta; ênfase em preço; chips de categoria.
- **Mood:** eficiente, fresco, direto.

#### J. Utility — `utility`
- **Nichos:** **construção & ferramentas**, **oficinas & manutenção**, **autopeças**.
- **Problema que resolve:** público técnico/profissional quer **robustez e função**, não estética boutique. Precisa transmitir resistência e confiança operacional.
- **DNA:** aço escuro + âmbar de segurança; cantos retos; alta densidade; sans forte; foco em SKU/compatibilidade.
- **Mood:** robusto, industrial, direto.

#### K. Playful — `playful`
- **Nichos:** **brinquedos & presentes**, **papelaria & livraria** (e cursos infantis).
- **Problema que resolve:** público família/criança responde a **cor e energia**; Soft é calmo demais, Editorial é frio.
- **DNA:** cantos bem arredondados; acento violeta energético; sans amigável e divertida (display); ilustração/cor vibrante.
- **Mood:** vibrante, lúdico, energético.

## 2.3 Matriz de cobertura — 20 categorias → arquétipo

> Fonte de verdade do mapeamento em código: `packages/lib/src/store-theme/mapping.ts` (`CATEGORIA_SLUG_TO_ARQUETIPO`). `default` = pré-seleção do onboarding; `alternativas` = peles compatíveis também oferecidas (modelo híbrido, [01](01-conceito-e-relacao-templates.md)).

| Categoria (slug) | Template funcional | Arquétipo default | Alternativas |
|---|---|---|---|
| `alimentos-bebidas` | food | **heritage** | noir, roast, ritual, smash, market, soft |
| `vestuario-calcados` | fashion | **editorial** | raw, noir, volt |
| `acessorios-joias` | fashion | **noir** | serene, editorial |
| `farmacia-medicamentos` | pharmacy | **clinic** | market |
| `beleza-cosmeticos` | generic | **serene** | editorial, noir, soft |
| `saloes-estetica` | services | **soft** | serene, noir, editorial |
| `saude-bem-estar` | services | **clinic** | soft, volt |
| `pet-shop` | pet | **soft** | playful |
| `veterinaria` | services | **clinic** | soft |
| `eletronicos-tecnologia` | generic | **tech** | editorial |
| `casa-decoracao` | generic | **artisan** | editorial |
| `construcao-ferramentas` | generic | **utility** | market |
| `papelaria-livraria` | generic | **playful** | editorial |
| `brinquedos-presentes` | generic | **playful** | soft |
| `floricultura-plantas` | generic | **artisan** | soft, editorial |
| `automotivo` | generic | **utility** | noir |
| `mercado-conveniencia` | generic | **market** | utility |
| `oficinas-manutencao` | services | **utility** | market |
| `aulas-cursos` | services | **editorial** | playful, soft |
| `outros` | generic | **magazine** | editorial, market, soft |

**Garantias (testadas em `__tests__/store-theme.test.ts`):**
- Toda categoria do seed tem sugestão (zero lacunas) — `satisfies Record<CategoriaSlug, …>`.
- Todo arquétipo é usado por ≥1 categoria (sem preset órfão).
- `default`/`alternativas` referenciam apenas arquétipos existentes.

## 2.4 Eixo de paleta (independente do arquétipo)

Cada arquétipo tem **paleta default** (hex em [03](03-design-tokens-e-schema.md)) e aceita troca — idealmente derivada da logo do lojista ([06](06-onboarding-e-extracao-cor.md)). A paleta resolve no mínimo: `bg`, `surface`, `surfaceAlt`, `ink`, `inkMuted`, `line`, `accent`, `accentInk`. Semânticos (`success/warning/danger`) são **fixos** em todos os arquétipos para consistência de status.

## 2.5 Como evoluir esta lista

Nova referência deve ser **classificada num arquétipo existente** antes de cogitar um 18º. Só criar arquétipo novo quando uma loja não couber em nenhum DNA atual (estrutura de layout ou contexto de uso genuinamente diferente). A variedade vem das **paletas** dentro de cada arquétipo, não de novos arquétipos.

## 2.6 Referências completas (fonte: design-lojas.md)

- **Praça de alimentação** → Heritage: Veloria, Savoria, Bistora, La Paloma, Multiple Influence.
- **Hamburgueria / fast-food** → Smash: Stack N Snack.
- **Açaíterias / matcha & lifestyle** → Ritual: OCHA.
- **Vestuário masculino / sport** → Raw: Wearix, Rawline, Wearvo.
- **Vestuário feminino / unissex** → Editorial: Veonn, Zaro, Marion, AXM.
- **Acessórios** → Editorial (Axels) / Noir (Caelora, Aurum).
- **Petshop** → Soft Care: Groomerly, PetPals.
- **Automóveis** → Noir (Esteem, luxo) / Utility (Drivoxe, padrão).
- **Móveis e decoração** → Artisan: Graft.
- **Sem referência (internos):** Clinic (farmácia/saúde/vet), Tech (eletrônicos), Market (mercado), Utility (construção/oficinas), Playful (brinquedos/papelaria).
