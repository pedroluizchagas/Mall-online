# 02 — Arquétipos de design

> Este doc absorve e estrutura o antigo `design-lojas.md`. As referências do Framer colapsam em **7 arquétipos**; mais **5 arquétipos desenhados internamente** cobrem os nichos sem referência (farmácia, eletrônicos, mercado, construção/oficinas, brinquedos). Total: **12 arquétipos que cobrem 100% das 20 categorias** do Mallevo. Cada loja veste **um arquétipo + uma paleta**; o nicho sugere o default.
>
> **Implementação:** `packages/lib/src/store-theme/presets.ts` (catálogo `ARQUETIPOS`).

## 2.1 Por que arquétipos (e não um design por loja)

Manter 25 layouts é inviável. Agrupadas por linguagem visual (paleta, tipografia, estrutura, mood), as referências revelam **famílias**. Isso reduz "25 designs" para "11 presets parametrizáveis por paleta" — variedade real sem explosão de manutenção. As referências cobriam só varejo boutique + alimentação; os nichos de **serviço, saúde, tecnologia, mercado e utilidade** exigiram arquétipos próprios, desenhados internamente segundo o mesmo método.

## 2.2 Os 12 arquétipos

### Derivados de referência (7)

#### A. Heritage — `heritage`
- **Nichos:** restaurantes, churrascarias, cafeterias boutique.
- **DNA:** serifa de display; neutros quentes/creme; foto de comida full-bleed; selos de tradição; muito respiro.
- **Mood:** sofisticado, atemporal, acolhedor.
- **Refs:** [Veloria](https://veloriarestaurant.framer.website/), [Savoria](https://savoriarestro.framer.website/), [Bistora](https://bistora.framer.website/), [La Paloma](https://lapaloma.framer.website/), [Multiple Influence](https://multiple-influence-475025.framer.app/).

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
| `alimentos-bebidas` | food | **heritage** | noir, market, soft |
| `vestuario-calcados` | fashion | **editorial** | raw, noir |
| `acessorios-joias` | fashion | **noir** | serene, editorial |
| `farmacia-medicamentos` | pharmacy | **clinic** | market |
| `beleza-cosmeticos` | generic | **serene** | editorial, noir, soft |
| `saloes-estetica` | services | **soft** | serene, noir, editorial |
| `saude-bem-estar` | services | **clinic** | soft |
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
| `outros` | generic | **editorial** | market, soft |

**Garantias (testadas em `__tests__/store-theme.test.ts`):**
- Toda categoria do seed tem sugestão (zero lacunas) — `satisfies Record<CategoriaSlug, …>`.
- Todo arquétipo é usado por ≥1 categoria (sem preset órfão).
- `default`/`alternativas` referenciam apenas arquétipos existentes.

## 2.4 Eixo de paleta (independente do arquétipo)

Cada arquétipo tem **paleta default** (hex em [03](03-design-tokens-e-schema.md)) e aceita troca — idealmente derivada da logo do lojista ([06](06-onboarding-e-extracao-cor.md)). A paleta resolve no mínimo: `bg`, `surface`, `surfaceAlt`, `ink`, `inkMuted`, `line`, `accent`, `accentInk`. Semânticos (`success/warning/danger`) são **fixos** em todos os arquétipos para consistência de status.

## 2.5 Como evoluir esta lista

Nova referência deve ser **classificada num arquétipo existente** antes de cogitar um 12º. Só criar arquétipo novo quando uma loja não couber em nenhum DNA atual (estrutura de layout ou contexto de uso genuinamente diferente). A variedade vem das **paletas** dentro de cada arquétipo, não de novos arquétipos.

## 2.6 Referências completas (fonte: design-lojas.md)

- **Praça de alimentação** → Heritage: Veloria, Savoria, Bistora, La Paloma, Multiple Influence.
- **Vestuário masculino / sport** → Raw: Wearix, Rawline, Wearvo.
- **Vestuário feminino / unissex** → Editorial: Veonn, Zaro, Marion, AXM.
- **Acessórios** → Editorial (Axels) / Noir (Caelora, Aurum).
- **Petshop** → Soft Care: Groomerly, PetPals.
- **Automóveis** → Noir (Esteem, luxo) / Utility (Drivoxe, padrão).
- **Móveis e decoração** → Artisan: Graft.
- **Sem referência (internos):** Clinic (farmácia/saúde/vet), Tech (eletrônicos), Market (mercado), Utility (construção/oficinas), Playful (brinquedos/papelaria).
