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
- Recebe repasse automaticamente via Stripe
- Pode antecipar recebimentos pagando taxa

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
- Recebe por entrega via Stripe Express (repasse D+1)

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

- Debitada automaticamente de cada pedido entregue com sucesso
- Implementada como `application_fee` no Stripe (Separate Charges and Transfers)
- Não incide sobre pedidos cancelados ou estornados
- Valor fixo e previsível — não percentual sobre o ticket

### Fonte 3 — Taxa de Antecipação de Repasse (R$0,75/pedido)

- Repasse padrão do lojista: **D+7**
- Lojista pode solicitar antecipação para **D+2** pagando R$0,75 por pedido antecipado
- Desconto aplicado automaticamente no valor do repasse
- Exemplo: lojista antecipa 40 pedidos → desconto de R$30,00 no repasse
- O entregador autônomo recebe sempre em D+1 (sem opção de antecipação no MVP)

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
   → Paga via Stripe (cartão ou PIX)
   → PaymentIntent criado na plataforma
      ↓
5. Pedido criado com status "novo"
      ↓
6. Lojista recebe notificação (push + som no dashboard)
      ↓
7. Lojista confirma → status "em preparo"
      ↓
8. Lojista despacha → atribui entregador
   → Entregador recebe notificação
      ↓
9. Entregador aceita → status "saiu para entrega"
   → Localização do entregador aparece no mapa do consumidor
      ↓
10. Entregador entrega → confirma com foto ou código
    → Status "entregue"
    → Pedido marcado como pago
    → Agenda repasse ao lojista (D+7 ou D+2 se antecipação ativa)
    → Agenda repasse ao entregador autônomo (D+1)
      ↓
11. Consumidor avalia loja e entregador
```

-----

## FLUXO FINANCEIRO DETALHADO

```
Consumidor paga R$60,00
(R$50 produto + R$10 taxa de entrega)
         ↓
Plataforma recebe R$60,00
(Merchant of Record — Separate Charges and Transfers)
         ↓
Stripe desconta ~R$2,28 (taxa ~3,8% + R$0,50 — cartão BR)
         ↓
Plataforma retém R$1,00 (comissão por pedido)
         ↓
Saldo líquido a distribuir: ~R$56,72
    ↓                              ↓
Lojista recebe ~R$46,72        Entregador recebe R$10,00
(D+7 automático)                (D+1 automático)
ou D+2 pagando R$0,75

Lojista com antecipação (ex: 40 pedidos):
→ Desconto: 40 × R$0,75 = R$30,00
→ Recebe: valor_total_repasse - R$30,00 em D+2
```

**Nota sobre PIX:** taxa Stripe para PIX no Brasil é menor (~0,99% + R$0,30).
O fluxo financeiro é o mesmo — apenas o valor líquido distribuído muda levemente.

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
|Repasse         |D+30 (iFood)               |D+7 (ou D+2 com taxa)     |

-----

## VISÃO DE EXPANSÃO (pós-lançamento)

- **Fase 1 (MVP):** Divinópolis — foco em validação do modelo
- **Fase 2:** Cidades vizinhas do oeste de MG (Formiga, Itaúna, Pará de Minas)
- **Fase 3:** Multi-regional com operadores locais parceiros (sub-franquia do sistema)
- **Gateway próprio:** quando atingir volume para negociar taxas Stripe customizadas

-----

## PREMISSAS E RESTRIÇÕES DO MVP

1. Pagamento na entrega **ainda é suportado** (dinheiro, cartão na maquininha) — não apenas online
1. O gateway Stripe é para pagamentos **online** (cartão e PIX) — pedidos com pagamento na entrega não geram PaymentIntent
1. A comissão de R$1,00 incide apenas sobre pedidos **com pagamento online confirmado** no MVP
1. Não há avaliação de crédito ou antecipação para entregadores no MVP
1. O módulo de estoque está disponível apenas em planos superiores
1. A plataforma não intermedia disputas entre consumidor e lojista no MVP — encaminha para contato direto

-----

*Arquivo 01 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 02 — Arquitetura Técnica & Stack*
