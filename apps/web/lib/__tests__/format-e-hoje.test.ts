import { describe, expect, it } from 'vitest'

import { money, partesDoValor, saudacao, tempoRelativo } from '@/lib/format'
import { dataPorExtenso, horaDaLoja, horasDoExpediente, inicioDoDiaDaLoja } from '@/lib/hoje'
import { META_STATUS, metaDoStatus, pedeAcao } from '@/lib/status-pedido'
import { codigoDoPedido, liquidoDoPedido, quantidadeDeItens, rotuloPagamento } from '@/components/dashboard/pedidos/tipos'

/**
 * O contrato de dinheiro e de "hoje" do painel. O `money()` já tratou centavo
 * como real (uma bruschetta de R$ 24 aparecia "R$ 2400,00") e o Início
 * contava o dia pelo relógio do servidor (UTC na Vercel) — estes testes
 * seguram os dois.
 */

/** Normaliza o espaço fino/não separável que o Intl põe depois do "R$". */
const sp = (s: string) => s.replace(/ | /g, ' ')

describe('money — o banco guarda centavos', () => {
  it('formata centavos como reais', () => {
    expect(sp(money(2400))).toBe('R$ 24,00')
    expect(sp(money(5490))).toBe('R$ 54,90')
    expect(sp(money(123456))).toBe('R$ 1.234,56')
    expect(sp(money(0))).toBe('R$ 0,00')
  })

  it('não quebra com valor inválido', () => {
    expect(sp(money(Number.NaN))).toBe('R$ 0,00')
  })

  it('parte o valor para o número grande da casa', () => {
    expect(partesDoValor(123456)).toEqual({ inteiro: '1.234', decimal: ',56' })
    expect(partesDoValor(0)).toEqual({ inteiro: '0', decimal: ',00' })
  })
})

describe('tempoRelativo e saudação', () => {
  const agora = Date.parse('2026-10-15T23:00:00Z')

  it('fala como o app', () => {
    expect(tempoRelativo('2026-10-15T22:59:40Z', agora)).toBe('agora')
    expect(tempoRelativo('2026-10-15T22:48:00Z', agora)).toBe('12 min')
    expect(tempoRelativo('2026-10-15T20:00:00Z', agora)).toBe('3 h')
    expect(tempoRelativo('2026-10-12T23:00:00Z', agora)).toBe('3 d')
    expect(tempoRelativo('2026-10-01T23:00:00Z', agora)).toBe('2 sem')
  })

  it('futuro e lixo não viram número negativo', () => {
    expect(tempoRelativo('2026-10-16T01:00:00Z', agora)).toBe('agora')
    expect(tempoRelativo('não é data', agora)).toBe('')
  })

  it('cumprimenta pela hora', () => {
    expect(saudacao(2)).toBe('Boa noite')
    expect(saudacao(9)).toBe('Bom dia')
    expect(saudacao(15)).toBe('Boa tarde')
    expect(saudacao(21)).toBe('Boa noite')
  })
})

describe('hoje — o relógio de Divinópolis, não o do servidor', () => {
  it('às 22h de Divinópolis (01h UTC do dia seguinte) o dia ainda é o de lá', () => {
    const agora = new Date('2026-10-16T01:00:00Z') // 15/10 22:00 em Divinópolis
    expect(inicioDoDiaDaLoja(agora)).toBe('2026-10-15T00:00:00-03:00')
    expect(horaDaLoja(agora)).toBe(22)
  })

  it('a hora do pedido é a hora de lá', () => {
    expect(horaDaLoja('2026-10-15T22:30:00Z')).toBe(19)
  })

  it('escreve a data por extenso sem o "-feira"', () => {
    expect(dataPorExtenso(new Date('2026-10-15T15:00:00Z'))).toBe('quinta, 15 de outubro')
  })

  it('o expediente vem dos horários da loja e cobre os pedidos fora dele', () => {
    const quinta = new Date('2026-10-15T23:00:00Z') // 20h em Divinópolis, quinta
    const horarios = { qui: { abre: '18:00', fecha: '23:30' } }
    expect(horasDoExpediente(horarios, quinta, [])).toEqual([18, 19, 20, 21, 22, 23])
    expect(horasDoExpediente(horarios, quinta, [16])).toEqual([16, 17, 18, 19, 20, 21, 22, 23])
    // Turno que cruza a meia-noite para nas 23h.
    expect(horasDoExpediente({ qui: { abre: '20:00', fecha: '02:00' } }, quinta, [])).toEqual([20, 21, 22, 23])
    // Sem horário: 8h–22h.
    expect(horasDoExpediente(null, quinta, [])).toHaveLength(15)
  })
})

describe('status e conta do pedido', () => {
  it('fala com os rótulos do app do lojista', () => {
    expect(META_STATUS.aguardando_entregador.rotulo).toBe('Aguardando coleta')
    expect(META_STATUS.saiu_para_entrega.rotulo).toBe('Em entrega')
    expect(metaDoStatus('qualquer-coisa').status).toBe('novo')
    expect(pedeAcao('novo')).toBe(true)
    expect(pedeAcao('saiu_para_entrega')).toBe(false)
  })

  it('o lojista recebe o total menos a entrega (do entregador) e a comissão', () => {
    expect(liquidoDoPedido({ total: 8900, taxa_entrega: 600, platform_fee_amount: 100 })).toBe(8200)
    // Sem a comissão gravada, vale a da casa (R$ 1,00).
    expect(liquidoDoPedido({ total: 8900, taxa_entrega: 600, platform_fee_amount: null })).toBe(8200)
    expect(liquidoDoPedido({ total: 50, taxa_entrega: 600, platform_fee_amount: 100 })).toBe(0)
  })

  it('número, itens e pagamento por extenso', () => {
    expect(codigoDoPedido('e1000000-0000-4000-8000-00000000abcd')).toBe('#00ABCD')
    expect(quantidadeDeItens({ order_items: [{ quantidade: 2 }, { quantidade: 1 }] as never })).toBe(3)
    expect(rotuloPagamento('online_pix')).toBe('Pix online')
    expect(rotuloPagamento('outro')).toBe('outro')
  })
})
