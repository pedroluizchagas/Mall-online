# ADR 0002 — Pagar.me para pedidos/split; Stripe Billing só para assinatura

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Data** | 2026-05-15 (retroativo — `docs/02`, `docs/06`, `docs/30`; supersede Stripe Connect, ver migration 007) |
| **Decisor** | Arquitetura |
| **Specs afetadas** | Pagamentos, onboarding lojista/entregador, financeiro, admin |

## Contexto

A plataforma é Merchant of Record e precisa: (1) Pix nativo; (2) split com
recebedores em contas bancárias brasileiras; (3) liquidação automática por
calendário do método com antecipação. Stripe Connect não cobre (1) e (2) no
Brasil. A mensalidade do lojista é recorrência simples de cartão.

## Decisão

**Pagar.me** processa todos os pagamentos de pedido: cria Order com
`split_rules` (estágio 1: Mallora + lojista), executa Transfer estágio 2
(Mallora → entregador), e opera liquidação automática. **Stripe Billing**
cobre exclusivamente a assinatura mensal do lojista (Customer +
Subscription). Os dois domínios não se sobrepõem. Stripe Connect foi
descontinuado (migration `007_drop_stripe_connect`).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Stripe Connect para tudo | Sem Pix nativo nem split bancário BR. |
| Pagar.me também para assinatura | Stripe Billing já implementado e estável para recorrência; sem ganho em migrar. |
| Gateway único alternativo | Reescrita maior, sem benefício no estágio atual. |

## Consequências

**Positivas:** Pix + split BR resolvidos; antecipação via API; recorrência
robusta no Stripe.

**Negativas / dívidas aceitas:** dois provedores de pagamento = dois conjuntos
de webhooks, segredos e reconciliação. Mitigado por idempotência obrigatória
(constituição §1.3) e log de webhooks.

**Impacto na constituição:** reforça §1 (dinheiro) e §4 (idempotência de
integração externa).
