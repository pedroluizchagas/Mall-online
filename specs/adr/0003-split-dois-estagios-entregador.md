# ADR 0003 — Split de pagamento em dois estágios para alocação do entregador

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Data** | 2026-05-15 (retroativo — `docs/06`, `docs/30`) |
| **Decisor** | Arquitetura |
| **Specs afetadas** | create-pagarme-order, transfer-to-courier, financeiro entregador |

## Contexto

O entregador autônomo só é conhecido **depois** do checkout (lojista aloca um
motoboy do pool após receber o pedido). O split do Pagar.me é definido na
criação da Order, antes de saber o recipient do entregador.

## Decisão

Modelo de dois estágios:

- **Estágio 1 (criação da Order):** `split_rules` divide entre Mallora
  (comissão fixa R$1,00 + taxa de entrega temporariamente retida) e lojista.
- **Estágio 2 (após alocação do entregador):** Edge Function
  `transfer-to-courier` executa um Transfer Mallora → recipient do entregador
  com o valor da taxa de entrega. Registrado em `payouts` para auditoria.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Split de 3 partes na criação | Recipient do entregador desconhecido no checkout. |
| Pagar entregador fora do Pagar.me | Perde rastreabilidade e liquidação automática; risco fiscal. |

## Consequências

**Positivas:** resolve a ordem temporal real da operação sem segurar o
checkout do consumidor.

**Negativas / dívidas aceitas:** dinheiro transita pela conta da Mallora entre
estágio 1 e 2 — exige idempotência no Transfer (chave = `delivery_assignment`
/ `payout_id`) e tratamento de falha/reprocesso. Conciliação obrigatória no
admin.

**Impacto na constituição:** caso de uso central da regra §1.3 (idempotência)
e §1.4 (soma == total).
