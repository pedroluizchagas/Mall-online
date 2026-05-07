# 01 — Análise de Nichos

### Mapeamento das jornadas, dores e requisitos por nicho de lojista

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Entender em profundidade **o que cada tipo de lojista precisa fazer no dia-a-dia** para vender bem no Mallevo. Cada nicho tem fluxo de operação, vocabulário e expectativas próprias. Esta análise é a base para o desenho dos templates do `04`.

A análise é dividida em 6 nichos. Para cada um, o documento entrega:

1. **Persona típica** (quem é o lojista, escala, contexto local em Divinópolis)
2. **Jornada operacional diária** (do estoque ao pedido entregue)
3. **Modelagem do produto** (como o produto é vendido)
4. **Dores observadas no genérico atual**
5. **Requisitos funcionais do dashboard**
6. **O que NÃO precisa** (anti-features — combater bloat)

---

## NICHO 1 — `food` (Praça de Alimentação)

> Restaurantes, lanchonetes, hamburguerias, pizzarias, cafeterias, bares, açaiterias, doceiras.

### Persona

Pequeno comércio familiar ou rede de até 3 unidades. Operador entre 25-50 anos, atende muitos pedidos por hora em horário de pico. Margem apertada, **velocidade de operação é vida**. Em Divinópolis, é o nicho com maior volume de pedidos delivery atualmente.

### Jornada operacional diária

```
08h — abre o app, marca loja como aberta, confere fila do dia anterior
11h — pico do almoço: 30-80 pedidos em 2h, precisa de tela única e som de alerta
14h — fecha cozinha, revisa cancelamentos, atualiza preços de pratos do dia
18h — abre janta, marca itens esgotados (sem chumbar produto fora)
22h — fecha caixa, exporta relatório, confere repasse do dia
```

### Modelagem do produto

Um item de cardápio é **um SKU único com personalizações**:

- Hambúrguer Artesanal Especial — R$ 38,00
  - **Modificador obrigatório:** Ponto da carne (Mal passada / Ao ponto / Bem passada)
  - **Modificador opcional:** Adicionais (+R$ 4 bacon, +R$ 6 cheddar, +R$ 3 cebola caramelizada — máx 5)
  - **Modificador opcional:** Retirar (cebola, picles, alface — sem custo, múltipla escolha)
  - **Observação livre** (campo texto: "ponto bem feito por favor")

Importante: **o ponto da carne não é um SKU diferente** — não tem estoque separado, não muda preço base. É só uma instrução para a cozinha. Isso é diferente de variação.

### Dores no genérico atual

- Não tem como cadastrar adicionais → lojistas criam "Hambúrguer com bacon" como produto separado, poluindo cardápio.
- Sem horário de funcionamento por dia → loja abre sábado meio-dia mas o app deixa pedido entrar 9h.
- Sem campo de tempo de preparo por item → consumidor não sabe ETA por prato.
- Sem botão "esgotou" rápido → lojista precisa editar produto inteiro só para tirar do ar.

### Requisitos do dashboard `food`

| Requisito | Prioridade |
|-----------|------------|
| **Grupos de modificadores** com regras (mín/máx, obrigatório, único/múltiplo) | P0 |
| **Tempo de preparo médio** por produto e por loja | P0 |
| **Horário de funcionamento por dia da semana** (já existe em `stores.horarios` JSONB) | P0 |
| **Toggle rápido "esgotou hoje"** (volta automático no próximo dia) | P0 |
| **Cardápio com seções/categorias internas** (Lanches, Bebidas, Sobremesas) | P0 |
| **Pausar pedidos temporariamente** (cozinha lotada) | P1 |
| **Tela de fila de pedidos com som** (já existe em `painel-pedidos-realtime.tsx`) | P0 ✅ |
| **Imprimir comanda** (cozinha) | P1 |

### NÃO precisa

- Variação tamanho/cor (uma pizza de 4 sabores não é variação, são modificadores).
- SKU separado por modificador (caos operacional).
- Estoque por modificador (ninguém conta "tenho 12 cebolas caramelizadas").

---

## NICHO 2 — `fashion` (Moda & Vestuário)

> Roupas femininas, masculinas, infantis, calçados, acessórios, lingerie, esportivo.

### Persona

Lojista entre 20-45 anos, geralmente proprietária de butique física + Instagram. Vende coleções por temporada, tira fotos próprias, posta storys diários. Em Divinópolis, mercado fragmentado e crescente — concorrência com Shein/AliExpress, ganha por proximidade e conferência.

### Jornada operacional diária

```
09h — recebe nova arara: cadastra peças com fotos por cor, marca tamanhos disponíveis
11h — divulga lançamento no Instagram, espera pico
14h — recebe pedidos: confere SKU exato (M preto), separa, embala
16h — atende troca (cliente quer P em vez de M) — precisa abater estoque do P
20h — fecha o dia, vê quais SKUs venderam, planeja reposição
```

### Modelagem do produto

Uma peça de roupa é **um produto-pai com N variações reais (SKUs)**:

- Vestido Floral Verão 2026 — R$ 129,90
  - Variações em **grade**: Tamanho × Cor
    - PP Verde, P Verde, M Verde, G Verde, GG Verde
    - PP Preto, P Preto, M Preto, G Preto, GG Preto
    - PP Azul, P Azul, M Azul, G Azul, GG Azul
  - Cada combinação é um **SKU real** com:
    - Estoque próprio (ex: M Preto = 3 unidades, GG Verde = 0)
    - Preço próprio (geralmente igual, mas pode variar — GG +R$10)
    - Foto própria (cor verde tem foto verde, cor preta tem foto preta)
    - Código do fornecedor (SKU externo)

Importante: aqui **a variação MUDA preço/estoque/imagem**. É essencial.

### Dores no genérico atual

- Sem variação → lojista cria "Vestido P preto", "Vestido M preto", "Vestido G preto" como produtos diferentes (15 produtos para 1 vestido em 5 tamanhos × 3 cores) → polui catálogo, plano Básico estoura limite.
- Estoque agregado não funciona → consumidor compra "Vestido", chega para separar, M preto acabou.
- Sem foto por cor → cliente vê só uma foto e fica decepcionado.
- Sem grade visual no dashboard → cadastrar 15 SKUs um a um leva 30 minutos por peça.

### Requisitos do dashboard `fashion`

| Requisito | Prioridade |
|-----------|------------|
| **Grade de variações 2D** (atributos × valores → matriz de SKUs) | P0 |
| **Bulk edit de preço/estoque** na grade | P0 |
| **Foto principal por opção** (ex: foto da cor) | P0 |
| **Estoque por SKU** com alerta de mínimo | P0 |
| **Status por SKU** (esgotado individualmente, não a peça toda) | P0 |
| **Coleções/Tags** (Verão 2026, Promoção, Lançamento) | P1 |
| **Tabela de medidas** anexável ao produto | P1 |
| **Política de troca** visível ao consumer | P1 |
| **Etiqueta de envio com SKU** | P2 |

### NÃO precisa

- Modificadores tipo food.
- Tempo de preparo (não tem cozinha).
- Receita médica.

---

## NICHO 3 — `pharmacy` (Saúde & Farmácia)

> Farmácias de manipulação, drogarias independentes, suplementos esportivos, produtos de saúde.

### Persona

Farmacêutico responsável (CRF). Negócio regulado, processo crítico (errar dose pode matar). Em Divinópolis, nicho de oportunidade — Pague Menos e Drogasil dominam mas pequenas farmácias de bairro têm clientela fiel.

### Jornada operacional diária

```
08h — recebe entrega do distribuidor, dá entrada por lote (validade)
10h — atende pedido com receita: confere foto da receita, guarda 30 dias
12h — alerta de produto vencendo em 30 dias → coloca em promoção
15h — separa pedido controlado (Lista B): confere CRM do médico
18h — fecha dia, gera SNGPC (relatório regulatório)
```

### Modelagem do produto

Um medicamento é **um produto com lote/validade** e **regras regulatórias**:

- Dipirona 500mg 20cps — R$ 12,50
  - Registro ANVISA: 1.0123.0456
  - Princípio ativo: Dipirona Sódica
  - Categoria regulatória: MIP (Medicamento Isento de Prescrição)
  - **Lotes em estoque:**
    - Lote AB123 — venc 12/2026 — 45 unidades
    - Lote AB124 — venc 03/2027 — 80 unidades
  - Genérico/Similar/Referência

Pode ter variação simples (dosagem 500mg vs 1g), mas **lote é o eixo principal**, não cor/tamanho.

### Dores no genérico atual

- Sem campo ANVISA → consumidor desconfia.
- Sem lote/validade → vende produto vencido sem perceber.
- Sem flag de receita → lojista esquece de pedir foto, perde alvará.
- Sem categoria controlada vs livre → mistura tudo.

### Requisitos do dashboard `pharmacy`

| Requisito | Prioridade |
|-----------|------------|
| **Campo ANVISA + princípio ativo + categoria regulatória** | P0 |
| **Bandeira "Exige receita"** com upload obrigatório no checkout | P0 |
| **Gestão de lote e validade** (FEFO — first expired first out) | P0 |
| **Alerta de produto próximo do vencimento** | P0 |
| **Bula anexável** (PDF ou link) | P1 |
| **Bloqueio de venda controlada fora de horário** | P1 |
| **Relatório SNGPC** (só Premium) | P2 |

### NÃO precisa

- Variação cor/tamanho genérica.
- Modificadores food.

---

## NICHO 4 — `pet` (Pet Shop)

> Pet shops, petiscos artesanais, acessórios, banho & tosa (serviço).

### Persona

Dona de pet shop de bairro, geralmente ela mesma faz banho/tosa e atende. Vende ração, petisco, brinquedo, coleira **e** serviço (banho). Misto de produtos com variação por porte e serviço com agendamento.

### Modelagem do produto

Híbrido — pet shop tem dois tipos de oferta:

**Produto físico com variação por porte:**
- Coleira Antipulgas — R$ 89
  - P (1-7kg) · M (8-15kg) · G (16-30kg) · GG (>30kg)
  - Estoque por porte

**Ração — variação por peso/sabor:**
- Ração Premium Adulto
  - Sabor Frango × Peso (1kg / 7,5kg / 15kg) → preços diferentes

**Serviço de banho:**
- Banho — R$ 50 (P) · R$ 70 (M) · R$ 90 (G)
- Agendamento por horário, duração 90min

### Requisitos do dashboard `pet`

| Requisito | Prioridade |
|-----------|------------|
| **Variação tipo `fashion`** (porte/peso/sabor) | P0 |
| **Toggle "este produto é serviço"** que ativa agendamento | P0 |
| **Atributos pet** (espécie, idade-alvo, faixa de peso) opcionais | P1 |
| **Lembrete de revacinação/vermífugo** por cliente (cross-sell) | P2 |

### NÃO precisa

- Modificadores food.
- ANVISA/lote (com exceção de medicamento veterinário — fora do escopo inicial).

---

## NICHO 5 — `services` (Serviços)

> Salões de beleza, manicure, estética, manutenção residencial, aulas particulares.

### Persona

Profissional autônomo ou pequeno estabelecimento (1-5 profissionais). Vende **tempo agendado**, não produto. Em Divinópolis, alta demanda — Booksy/Bookr não dominam o mercado local.

### Modelagem do produto

Um serviço é **um slot de tempo com profissional**:

- Corte feminino — R$ 80
  - Duração: 60 min
  - Profissional habilitado: Ana, Bruna
  - Disponibilidade: ter-sex 9-18h, sáb 9-13h
  - Local: presencial na loja (não tem entrega)

Não tem estoque, não tem entregador. Tem **agenda**.

### Requisitos do dashboard `services`

| Requisito | Prioridade |
|-----------|------------|
| **Catálogo de serviços com duração** | P0 |
| **Calendário de agenda por profissional** | P0 |
| **Bloqueio de horário** (almoço, folga, feriado) | P0 |
| **Confirmação manual ou automática** | P0 |
| **Sem entregador** → módulo de delivery oculto | P0 |
| **Pré-pagamento opcional** (sinal) | P1 |
| **Histórico do cliente** (último corte, última cor) | P2 |

### NÃO precisa

- Estoque (serviço não tem estoque).
- Variação física.
- Modificadores food.
- Módulo de entregadores.

---

## NICHO 6 — `generic` (Casa & Diversos / fallback)

> Eletrônicos, casa, decoração, papelaria, brinquedos, presentes, qualquer outro nicho não listado.

### Persona

Variável. É o template de **fallback amplo** — o lojista escolhe ele quando o seu nicho não tem template específico. Cobre o middle ground entre `food` e `fashion`.

### Modelagem

Produto pode ter **variação opcional** (ex: capa de celular vem por modelo de aparelho — variação real) ou ser produto único (uma luminária específica). Decisão fica com o lojista no formulário.

### Requisitos

- Form de produto **com variação opt-in** (toggle "este produto tem variações?").
- Campo opcional de **garantia** (12 meses, 24 meses).
- Campo opcional de **dimensões e peso** (para frete futuro).
- Sem modificador, sem agendamento.

---

## MATRIZ COMPARATIVA — O QUE CADA TEMPLATE LIGA/DESLIGA

| Recurso | food | fashion | pharmacy | pet | services | generic |
|---------|:----:|:-------:|:--------:|:---:|:--------:|:-------:|
| Variações (SKU 2D) | — | ✅ | parcial | ✅ | — | opt-in |
| Modificadores | ✅ | — | — | — | — | — |
| Estoque por variant | — | ✅ | ✅ (lote) | ✅ | — | opt-in |
| Tempo de preparo | ✅ | — | — | — | — | — |
| Horário por dia | ✅ | ✅ | ✅ | ✅ | ✅ (agenda) | ✅ |
| Receita médica | — | — | ✅ | — | — | — |
| Lote / validade | — | — | ✅ | parcial | — | — |
| Agendamento | — | — | — | parcial | ✅ | — |
| Profissional | — | — | — | — | ✅ | — |
| Tabela de medidas | — | ✅ | — | — | — | — |
| Garantia | — | — | — | — | — | ✅ |
| Coleções/tags | parcial | ✅ | — | — | — | parcial |
| ANVISA | — | — | ✅ | — | — | — |
| Entregador | ✅ | ✅ | ✅ | ✅ | — | ✅ |

---

## INSIGHTS TRANSVERSAIS

1. **Existem dois grandes eixos de complexidade**: variação de produto (`fashion`/`pet`) e personalização sem variação (`food`). Resolver os dois cobre 90% dos casos.
2. **Serviços é um animal diferente** — não tem estoque, não tem entregador. Provavelmente justifica um sub-app no futuro, mas no MVP cabe como template do mesmo dashboard com módulos desligados.
3. **Pharmacy é regulatório** — é o template mais sensível e pode ficar para Fase 5 (não bloqueia o lançamento dos outros).
4. **Pet é basicamente fashion + pequena dose de services** — reaproveitamento alto, esforço baixo depois que `fashion` estiver pronto.
5. **Generic é a porta de entrada** — todos os lojistas que não souberem qual escolher entram aqui, e o sistema sugere o mais próximo conforme cadastra produtos.

---

## DADOS QUE GUIAM A PRIORIZAÇÃO

Sem dados de produção do Mallevo ainda, mas baseando em benchmarks:

- iFood (BR): 100% food. Mostra que food sozinho é um negócio.
- Shopee/Mercado Livre: variações são essenciais.
- Decreto regulatório (RDC ANVISA 44/2009): farmácia tem requisitos não-negociáveis.

**Conclusão de prioridade para o MVP de templates:**

1. `food` (já é a base atual + adicionar modificadores) — 60% dos lojistas iniciais
2. `fashion` (alavancagem máxima — desbloqueia novo nicho) — 25%
3. `generic` (catch-all) — 10%
4. `pet` (reuso barato de fashion) — Fase 5
5. `services` (sub-mundo, mas já cobrir bloqueio de módulos) — Fase 5
6. `pharmacy` (alta complexidade regulatória, baixa urgência inicial) — Fase 5+

---

> **Próximo:** `02-arquitetura-templates.md` define como esses requisitos são traduzidos em estrutura técnica.
