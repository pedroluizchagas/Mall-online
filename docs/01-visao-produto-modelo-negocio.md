# 01 — Visão do Produto & Modelo de Negócio

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## CONCEITO CENTRAL

**“O shopping digital de Divinópolis.”**

Uma plataforma regional de delivery e marketplace multi-tenant que conecta
consumidores, lojistas locais e entregadores em um único ecossistema.
Diferente dos grandes players nacionais (iFood, Rappi), o modelo é pensado
para fortalecer o comércio local: lojistas pagam uma mensalidade fixa pelo
sistema e uma comissão mínima por venda — sem percentual sobre o faturamento.

**Foco inicial:** Divinópolis, MG — com arquitetura preparada para expansão regional.

-----

## OS QUATRO ATORES

### 1. Plataforma (Pedro — operador)

- Gerencia toda a operação via Painel Super Admin
- Aprova cadastros de lojistas e entregadores
- Define planos e preços
- Monitora métricas e receitas
- Faz a conciliação financeira

### 2. Lojista

- Negócio local que vende produtos via plataforma
- Paga mensalidade para acessar o sistema CRM/ERP
- Recebe pedidos, confirma, separa e despacha
- Pode usar entregadores próprios ou do pool da plataforma
- Recebe valores via Pagar.me (split direto + liquidação automática)
- Pode antecipar recebíveis via Pagar.me (planos pagos)

### 3. Consumidor

- Morador de Divinópolis que faz pedidos pelo app
- Explora lojas, monta carrinho, paga online (cartão ou PIX)
- Acompanha o pedido em tempo real com localização do entregador
- Avalia lojas e entregadores

### 4. Entregador

Dois sub-tipos:

**a) Próprio do lojista**

- Cadastrado e gerenciado pelo próprio lojista
- Vinculado a um único tenant
- Recebe as entregas daquele lojista exclusivamente
- Remunerado diretamente pelo lojista (fora da plataforma) ou via repasse

**b) Autônomo da plataforma**

- Cadastrado diretamente na plataforma
- Compõe o pool geral de entregadores disponíveis
- Aceita ou recusa entregas de qualquer lojista
- Recebe por entrega via Pagar.me (recipient + transfer estágio 2 — D+1)

-----

## MODELO DE NEGÓCIO — 3 FONTES DE RECEITA

### Fonte 1 — Assinatura Mensal do Lojista (CRM/ERP)

- Cobrada via **Stripe Billing** (recorrente automático)
- Pagamento: cartão de crédito ou PIX
- Dá acesso ao dashboard com: gestão de produtos, pedidos, financeiro, estoque (planos superiores), relatórios
- Trial de X dias para novos lojistas

**Planos (referência inicial — valores a definir):**

|Plano       |Lojas    |Produtos |Estoque|Relatórios       |Entregadores próprios|
|------------|---------|---------|-------|-----------------|---------------------|
|Básico      |1        |30       |❌      |Básico           |1                    |
|Profissional|3        |100      |✅      |Completo         |5                    |
|Premium     |Ilimitado|Ilimitado|✅      |Avançado + export|Ilimitado            |

### Fonte 2 — Comissão por Pedido (R$1,00)

- Definida como split rule fixa (`type: 'flat'`) no Pagar.me, com `liable: false` e `charge_processing_fee: false`
- Não incide sobre pedidos cancelados ou estornados
- Valor fixo e previsível — não percentual sobre o ticket

### Fonte 3 — Taxa de Antecipação de Recebíveis (Pagar.me)

- Liquidação padrão do lojista: cartão D+29+2 / Pix D+0
- Lojista em planos pagos pode habilitar **antecipação automática** via Pagar.me, recebendo em D+15 (cartão) com taxa contratual (referência inicial: a partir de 1,25% a.m.)
- Antecipação manual sob demanda também disponível via API Pagar.me
- A Mallevo repassa a taxa Pagar.me integralmente ao lojista, sem margem adicional no MVP
- O entregador autônomo recebe via transfer Mallevo → recipient após alocação no pedido (D+1 padrão na conta bancária)

-----

## FLUXO COMPLETO DE UM PEDIDO

```
1. Consumidor abre o app
      ↓
2. Explora lojas e produtos
      ↓
3. Monta o carrinho
      ↓
4. Finaliza o checkout
   → Paga via Pagar.me (cartão ou Pix)
   → Order criada com split entre Mallevo e lojista (estágio 1)
      ↓
5. Pedido criado com status "novo"
      ↓
6. Lojista recebe notificação (push + som no dashboard)
      ↓
7. Lojista confirma → status "em preparo"
      ↓
8. Lojista despacha → atribui entregador
   → Entregador recebe notificação
   → Edge Function `transfer-to-courier` executa estágio 2: transfer Mallevo → recipient do entregador (taxa de entrega)
      ↓
9. Entregador aceita → status "saiu para entrega"
   → Localização do entregador aparece no mapa do consumidor
      ↓
10. Entregador entrega → confirma com foto ou código
    → Status "entregue"
    → Liquidação Pagar.me automática para cada recipient (lojista e entregador) conforme cronograma do método de pagamento e plano de antecipação configurado
      ↓
11. Consumidor avalia loja e entregador
```

-----

## FLUXO FINANCEIRO DETALHADO

```
Consumidor paga R$60,00
(R$50 produto + R$10 taxa de entrega)
         ↓
Plataforma é Merchant of Record — Pagar.me cria Order com split:
  Estágio 1:
    Mallevo       R$1,00 (comissão fixa) + R$10,00 (frete temporário)
    Lojista       R$49,00
         ↓
Pagar.me debita MDR (~3,5% cartão / ~0,99% Pix), rateado entre
recebedores que pagam taxa (lojista e, no estágio 2, entregador)
         ↓
Estágio 2 (após alocação do entregador):
  Transfer Mallevo → recipient do entregador  R$10,00
         ↓
Liquidação automática do Pagar.me:
  Lojista:    Pix D+0 · Cartão D+29+2 (ou D+15 com antecipação)
  Entregador: D+1 padrão na conta bancária do recipient
  Mallevo:    saldo da conta principal

Lojista em plano pago com antecipação automática:
  → Recebíveis de cartão liquidam em D+15 com taxa Pagar.me
    (referência: a partir de 1,25% a.m., contratual)
  → Antecipação manual disponível para lotes específicos via API
```

**Nota sobre Pix:** liquidação instantânea. O saldo do recipient cresce
no momento do `order.paid` e é repassado conforme cronograma da conta
bancária do recipient (geralmente D+0).

-----

## SIMULAÇÃO DE RECEITA

Cenário: **50 lojistas ativos** · **30 pedidos/dia por loja** · **plano médio R$150/mês**

|Fonte                     |Cálculo                                |Receita Mensal   |
|--------------------------|---------------------------------------|-----------------|
|Assinaturas               |50 × R$150                             |R$7.500          |
|Comissão por pedido       |50 × 30 × 30 dias × R$1,00             |R$45.000         |
|Taxas de antecipação*     |30% dos lojistas × 900 pedidos × R$0,75|~R$10.125        |
|**Total bruto**           |                                       |**~R$62.625/mês**|
|Custos fixos infra        |Supabase Pro + Vercel Pro              |-~R$225/mês      |
|**Total líquido estimado**|                                       |**~R$62.400/mês**|

*Estimativa: 30% dos lojistas optando por antecipação em média

-----

## TIPOS DE LOJISTAS (SEGMENTOS)

A plataforma é agnóstica ao segmento. Exemplos para Divinópolis:

- **Alimentação:** restaurantes, lanchonetes, marmitarias, pizzarias, açaís
- **Mercado:** minimercados, hortifrúti, empórios
- **Farmácia:** drogarias e farmácias de manipulação
- **Pet:** pet shops e veterinárias com produtos
- **Beleza:** cosméticos, perfumaria
- **Outros:** floriculturas, papelarias, lojas de conveniência

Cada segmento pode ter **categorias globais** (definidas pelo admin) e **categorias próprias** (criadas pelo lojista).

-----

## DIFERENCIAL FRENTE AOS GRANDES PLAYERS

|Critério        |iFood / Rappi              |Esta Plataforma           |
|----------------|---------------------------|--------------------------|
|Comissão        |12–30% por pedido          |R$1,00 fixo por pedido    |
|Mensalidade     |Variável / cobranças extras|Fixa e transparente       |
|Foco            |Nacional / grandes centros |Regional / Divinópolis    |
|Suporte         |Automatizado / distante    |Proximidade com o operador|
|Dados do lojista|Propriedade da plataforma  |Lojista tem acesso total  |
|Repasse         |D+30 (iFood)               |Pix D+0 · Cartão D+15 com antecipação Pagar.me |

-----

## VISÃO DE EXPANSÃO (pós-lançamento)

- **Fase 1 (MVP):** Divinópolis — foco em validação do modelo
- **Fase 2:** Cidades vizinhas do oeste de MG (Formiga, Itaúna, Pará de Minas)
- **Fase 3:** Multi-regional com operadores locais parceiros (sub-franquia do sistema)
- **Gateway próprio:** quando atingir volume para negociar taxas Pagar.me customizadas (ou avaliar adquirência direta)

-----

## PREMISSAS E RESTRIÇÕES DO MVP

1. Pagamento na entrega **ainda é suportado** (dinheiro, cartão na maquininha) — não apenas online
1. O gateway Pagar.me é para pagamentos **online** (cartão e Pix) — pedidos com pagamento na entrega não geram Order no Pagar.me
1. A comissão de R$1,00 incide apenas sobre pedidos **com pagamento online confirmado** no MVP
1. Não há avaliação de crédito ou antecipação para entregadores no MVP
1. O módulo de estoque está disponível apenas em planos superiores
1. A plataforma não intermedia disputas entre consumidor e lojista no MVP — encaminha para contato direto

-----

*Arquivo 01 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 02 — Arquitetura Técnica & Stack*
