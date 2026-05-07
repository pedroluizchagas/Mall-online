# 05 — Impacto no Consumer App e no Checkout

### Como variações, modificadores e templates aparecem para o consumidor e afetam carrinho, pedido e split de pagamento

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Garantir que o consumer app (Expo) e o pipeline de pagamento (Pagar.me) acomodem o novo modelo de produto **sem regressão para os lojistas que vendem como hoje** (`food` simples). Define:

1. Como o PDP (Product Detail Page) muda por template
2. Como o item entra no carrinho (estrutura)
3. Como o pedido é gravado
4. Como o split Pagar.me incorpora preço de variant + modifiers
5. Como cancelamento/devolução parcial considera SKU
6. Diferenças de UX no app por template

---

## NÚCLEO: STORE.CATEGORIA PROPAGADA PARA O CLIENT

A resposta pública da API/Edge function que retorna a loja inclui a categoria, e o app mobile **deriva o template** a partir do slug da categoria:

```ts
// resposta da edge function /stores/:slug
{
  store: {
    id, nome, slug, logo, banner,
    categoria: { slug: 'vestuario-calcados', nome: 'Vestuário & Calçados', icone: '👗' },
    horarios: {...},
    ...
  },
  produtos: [...]
}
```

```ts
// apps/mobile-consumer/src/screens/PdpScreen.tsx
import { getTemplateByStore } from '@mallevo/lib/templates';

const template = getTemplateByStore(store);    // deriva via categoria.slug

switch (template.consumer.layoutPdp) {
  case 'cardapio':     return <PdpCardapio product={product} />;
  case 'variacao':     return <PdpVariacao product={product} />;
  case 'agendamento':  return <PdpAgendamento product={product} />;
  case 'simples':
  default:             return <PdpSimples product={product} />;
}
```

> O consumer **só conhece 4 layouts**, não 6 templates. Múltiplos templates compartilham o mesmo layout (food/cafeterias usam `cardapio`; fashion/pet/generic-com-variação usam `variacao`).
> **Importante:** o consumer **não conhece a constante `template_codigo`** vinda do servidor — ela é resolvida em código a partir do `categoria.slug`. Isso mantém a fonte da verdade única.

---

## LAYOUT 1 — `simples`

> Usado por: `pharmacy`, `generic` sem variação

PDP padrão de e-commerce: foto, descrição, preço, botão "Adicionar ao carrinho".

```
┌──────────────────────────────┐
│ [foto principal]             │
│ Dipirona 500mg 20cps         │
│ R$ 12,50                     │
│ Princípio ativo: Dipirona    │
│ ⚠️ Exige receita médica      │
│ [Anexar receita] (obrigatório)│
│ [- 1 +]   [Adicionar R$12,50]│
└──────────────────────────────┘
```

**Atenção pharmacy:** se `exige_receita = true`, botão "Adicionar" só ativa após upload da foto da receita. Receita é anexada ao **order**, não ao product.

---

## LAYOUT 2 — `cardapio` (food)

```
┌──────────────────────────────────────────┐
│ [foto]                                   │
│ Hambúrguer Artesanal Especial            │
│ R$ 38,00 · ⏱️ 30min                       │
│                                           │
│ Ponto da carne (escolha 1) *             │
│   ○ Mal passada                          │
│   ● Ao ponto                             │
│   ○ Bem passada                          │
│                                           │
│ Adicionais (até 5)                       │
│   ☐ Bacon         +R$ 4                  │
│   ☑ Cheddar       +R$ 6                  │
│   ☐ Cebola caram. +R$ 3                  │
│                                           │
│ Retirar (sem custo)                      │
│   ☑ Cebola crua                          │
│   ☐ Picles                               │
│                                           │
│ Observação                                │
│   [Sem maionese, por favor___________]   │
│                                           │
│ [- 1 +]   [Adicionar R$ 44,00]           │
└──────────────────────────────────────────┘
```

**Cálculo de preço dinâmico:**
```
total = (preco_produto + Σ modifier.preco_extra) × qtd
     = (38 + 6) × 1 = 44
```

**Validação no botão Adicionar:**
- Cada grupo com `min_select > 0` precisa ter seleção.
- Total de selecionados em cada grupo entre `[min_select, max_select]`.

---

## LAYOUT 3 — `variacao` (fashion, pet com porte)

```
┌──────────────────────────────────────────┐
│ [foto da cor selecionada]                │
│ Vestido Floral Verão 2026                │
│ R$ 129,90  R$ 99,90                      │
│                                           │
│ Cor                                       │
│   [🟢 Verde] [⚫ Preto] [🔵 Azul]         │
│                                           │
│ Tamanho                                   │
│   [PP] [P] [M] [G] [GG]                  │
│   GG: R$ 109,90 (preço extra)            │
│                                           │
│ Disponibilidade: 6 unidades              │
│ Tabela de medidas: [ver]                 │
│                                           │
│ [- 1 +]   [Adicionar R$ 99,90]           │
└──────────────────────────────────────────┘
```

**Comportamento:**
- Ao trocar cor, **foto principal muda** (se variant tiver `foto_url`).
- Tamanhos esgotados aparecem **riscados e desabilitados**.
- Combinação inválida (cor sem nenhum tamanho disponível) → toast "Esta cor está esgotada".
- Estoque mostra a soma da combinação selecionada (ou "<5 unidades" como gatilho de urgência).

**SKU resolve no clique:**
- Apenas quando todos os atributos foram escolhidos (cor + tamanho), o `variant_id` é resolvido e o botão libera.
- Cliente NÃO vê o `variant_id` no UI.

---

## LAYOUT 4 — `agendamento` (services)

```
┌──────────────────────────────────────────┐
│ [foto do serviço]                        │
│ Corte feminino                           │
│ R$ 80,00 · ⏱️ 60 min                      │
│                                           │
│ Profissional                              │
│   ○ Ana    ● Bruna  (qualquer)           │
│                                           │
│ Quando?                                   │
│   < Maio 2026 >                          │
│   ┌─┬─┬─┬─┬─┬─┬─┐                        │
│   │  │  │  │  │  │  │ │                  │
│   │..│ 7│ 8│ 9│..│..│..│                 │
│   └─┴─┴─┴─┴─┴─┴─┘                        │
│   8 maio · sex                            │
│   [09h] [10h] [14h] [16h] [esgotado: 11h]│
│                                           │
│ Sinal: 30% antecipado (R$ 24)            │
│                                           │
│ [Confirmar agendamento]                  │
└──────────────────────────────────────────┘
```

**Comportamento:**
- Disponibilidade carrega de uma edge function `/agenda/disponibilidade?service_id=...&date=...`.
- Confirmação cria um `order` especial com `tipo='agendamento'` e os campos `agendamento_inicio_at` / `agendamento_fim_at`.

---

## ESTRUTURA DO ITEM NO CARRINHO

Estrutura única que cobre todos os casos:

```ts
type CartItem = {
  product_id: string;
  variant_id: string | null;            // null se sem variação
  nome: string;                          // snapshot
  preco_unitario: number;                // centavos, já considerando variant
  quantidade: number;
  modifiers: Array<{                     // sempre array; vazio se food não usar
    modifier_id: string;
    nome: string;
    preco_extra: number;
  }>;
  observacao: string | null;
  agendamento?: {                        // só services
    inicio_at: string;
    fim_at: string;
    profissional_id: string | null;
  };
  foto_url: string | null;
};
```

**Função de total:**
```ts
function totalItem(item: CartItem): number {
  const extra = item.modifiers.reduce((s, m) => s + m.preco_extra, 0);
  return (item.preco_unitario + extra) * item.quantidade;
}
```

> O carrinho atual já tem `product_id`, `nome`, `preco_unitario`, `quantidade`. As novas chaves (`variant_id`, `modifiers`, `agendamento`) entram como **opcionais** para retrocompatibilidade com pedidos em andamento na transição.

---

## GRAVAÇÃO DO PEDIDO (CHECKOUT)

A criação de `orders` + `order_items` agora persiste:

```ts
// edge function: criar-pedido
{
  consumer_id, store_id, ...
  items: [
    {
      product_id,
      variant_id,                     // novo
      nome_snapshot: 'Vestido P Preto',
      preco_unitario: 12990,          // já = variant.preco
      quantidade: 1,
      modifiers: [],                   // sempre array
      observacao: null,
      preco_total: 12990,
    },
    {
      product_id,
      variant_id: null,                // produto food sem variação
      nome_snapshot: 'Hambúrguer Especial',
      preco_unitario: 3800,
      quantidade: 1,
      modifiers: [
        { modifier_id, nome: 'Cheddar', preco_extra: 600 },
        { modifier_id, nome: 'Ao ponto', preco_extra: 0 }
      ],
      observacao: 'Sem maionese',
      preco_total: 4400,                // = (3800 + 600) * 1
    }
  ]
}
```

A edge function valida:
- `variant_id` pertence ao `product_id` informado.
- Todos os `modifier_id` pertencem a grupos do produto.
- Regras de min/max dos grupos respeitadas.
- Estoque disponível (variant ou produto, conforme caso).
- `preco_unitario` recalculado a partir do banco (cliente pode ter cache); cliente nunca dita preço.

---

## SPLIT PAGAR.ME — IMPACTO

O split atual (documentado em `docs/30-integracao-pagarme...`) é por valor de pedido:

```
Total = Σ preco_total_item + frete
Split:
  Mallora:    R$ 1,00 (comissão fixa)
  Mallora:    R$ X (frete)
  Lojista:    Total - 1 - X
```

**Impacto:** zero, no nível do split. O preço já chega ao Pagar.me agregado e o split já é por valor — o split não enxerga modifier ou variant. **Nada muda nas edge functions de pagamento.**

A única atenção: **garantir** que `order_items.preco_total` é usado (não apenas `order_items.preco_unitario`), porque o último ignora modifiers. Vale revisar `docs/07-edge-functions-de-pagamento.md` na implementação para confirmar que a soma é feita pelo total, não pelo unitário×qtd.

---

## CANCELAMENTO PARCIAL E DEVOLUÇÃO POR SKU

Hoje, cancelamento parcial não existe — é tudo ou nada. Com variants, surge a possibilidade futura (Fase 7+):

- Cliente recebeu vestido **GG Verde** quando pediu **GG Preto** → devolve só esse SKU.
- Order tem 3 items, devolve 1 → reembolso parcial via Pagar.me.

**Decisão:** fora do escopo desta documentação inicial. Anotado como gap futuro em `06-roadmap-implementacao.md`.

---

## NAVEGAÇÃO POR PISOS NO CONSUMER

A home do consumer exibe os **9 pisos curatoriais** definidos em `packages/lib/pisos.ts` (ver `07-categorias-e-pisos.md`). Ao entrar num piso, o app filtra lojas pelas categorias agregadas:

```ts
// apps/mobile-consumer/src/screens/PisoScreen.tsx
import { PISOS } from '@mallevo/lib/pisos';

const piso = PISOS.find(p => p.slug === route.params.slug);
// SELECT * FROM stores WHERE categoria.slug IN (piso.categoriasSlugs)
```

**Pontos importantes:**
- Loja pode aparecer em **mais de um piso** (ex: clínica veterinária aparece em Saúde e Pet).
- Marketing edita pisos livremente (arquivo TS, deploy) sem tocar lojistas.
- Para **busca direta**, consumer pode pesquisar por categoria (ex: "Vestuário & Calçados") — busca textual cobre nome de loja + categoria + nome de produto + atributos de variant.

## BUSCA E LISTAGEM DE PRODUTOS

Listagens de produtos hoje exibem `products.foto_url` e `products.preco`. Após variants:

- **Card de produto** mostra **preço base** (menor variant disponível) e **foto principal** (do produto).
- "A partir de R$ 99,90" quando há variants com preços diferentes.
- "Esgotado" só aparece se **todas** as variants estiverem esgotadas.
- Busca textual considera **nome do produto + atributos** (ex: cliente busca "vestido preto" → match em nome+option_value).

```sql
-- View materializada para busca rápida
CREATE MATERIALIZED VIEW mv_products_search AS
SELECT
  p.id,
  p.nome,
  p.descricao,
  p.foto_url,
  COALESCE(MIN(pv.preco), p.preco) AS preco_min,
  COALESCE(MAX(pv.preco), p.preco) AS preco_max,
  EXISTS(
    SELECT 1 FROM product_variants v
    WHERE v.product_id = p.id AND v.disponivel = true AND COALESCE(v.stock_quantity, 1) > 0
  ) OR (NOT EXISTS(SELECT 1 FROM product_variants WHERE product_id = p.id) AND p.disponivel) AS disponivel,
  STRING_AGG(DISTINCT po.valor, ' ') AS atributos
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN product_variant_options pvo ON pvo.variant_id = pv.id
LEFT JOIN product_options po ON po.id = pvo.option_id
GROUP BY p.id;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_products_search;
```

Refresh acionado por trigger ou cronjob; deferred — não bloqueia a transação de criação.

---

## ESTOQUE E DISPONIBILIDADE EM TEMPO REAL

Hoje o consumer atualiza estoque via Realtime channel `product_updates`. Após variants:

- Channel passa a ouvir também `variant_updates` por loja.
- Quando uma variant esgota, o app atualiza UI (riscar tamanho, mostrar "esgotado").
- Para evitar inundação, o channel só dispara mudanças relevantes (`disponivel` flip ou stock cruzando 0).

---

## CHECKLIST DE IMPACTO NO CONSUMER

| Tela | Mudança |
|------|---------|
| Home/Explorar | Card mostra "a partir de R$ X" se variants com preços diferentes |
| Loja (lista) | Mesma lógica do card |
| PDP | Roteia para 1 dos 4 layouts conforme template |
| Carrinho | `variant_id` + `modifiers` por item; total recalcula |
| Checkout | Soma considera modifiers; payload de `criar-pedido` enviado com nova estrutura |
| Pedido (consumidor) | Detalhe mostra variant ("M Preto") e modifiers ("Bacon, Ao ponto") |
| Histórico | Idem |
| Receita médica | Tela nova: upload de foto, anexa ao pedido |
| Agendamento | Tela nova: calendário + slots |

---

## CHECKLIST DE IMPACTO NO COURIER (mobile-courier)

Pequeno: o entregador hoje vê itens do pedido. Acrescentar:
- Variant: "Vestido — M Preto"
- Modifiers em texto: "Bacon, Ao ponto" (separador vírgula)
- Observação destacada se houver

Nada estrutural muda no fluxo de entrega.

---

## CHECKLIST DE IMPACTO NO ADMIN (apps/admin)

- Visualização de produto na admin lista deve mostrar quantidade de variants ("12 SKUs") e total de estoque agregado.
- Filtro de **lojas por categoria** no painel admin (com agrupamento por template derivado).
- **Tela "Lojas em Outros"** — lista lojas em `categoria='outros'`, com texto livre escrito pelo lojista, e botão "Reclassificar" que abre seletor das outras 19 categorias e exige motivo (preenche `store_categoria_changes`).
- Relatório de SKUs vendidos por período, segmentado por categoria/template.
- Distribuição de lojas por template (medir adoção dos nichos novos).

---

## RESUMO

- **Consumer renderiza por layout, não por template** (4 layouts cobrem 6 templates).
- **Template é derivado** da `store.categoria.slug` em código — payload da edge function não carrega `template_codigo`.
- **Home do consumer navega por pisos curatoriais** (9 pisos) que agregam categorias livremente.
- **Carrinho/order/payment** ganham `variant_id` (FK) e `modifiers` (JSONB snapshot).
- **Split Pagar.me não muda** — opera no total agregado.
- **Estoque ouve channel novo** para variant updates.
- **Cancelamento parcial por SKU** fica para fase futura.

---

> **Próximo:** `06-roadmap-implementacao.md` — fases, critérios de aceite e métricas.
