import { describe, expect, it } from 'vitest'

import {
  dataPorExtenso,
  inicioDoDia,
  intervaloDoMes,
  mesAtual,
  mesDoInstante,
  mesValido,
  rotuloDoMes,
  somarMeses,
  ultimosMeses,
} from '@/lib/hoje'
import {
  casaBusca,
  contarPor,
  janelaDeComparacao,
  maisRecente,
  resumir,
  serieMensal,
  variacao,
} from '@/lib/metricas'
import { centavosDoTexto, contagem, quando, saudacao, tempoRelativo } from '@/lib/format'
import { grupoDosRecebimentos, metaAssinatura, metaRecebimentos, rotuloVeiculo } from '@/lib/status'
import { buscarTodas } from '@/lib/supabase/paginar'

/**
 * As contas por trás de cada número da administração. O admin antigo
 * contava "hoje" e o mês no relógio do servidor (UTC na Vercel: o dia
 * começava às 21h de ontem em Divinópolis) e mostrava variações e gráfico
 * inventados — estes testes seguram o que entrou no lugar.
 */

describe('o dia e o mês são os de Divinópolis, não os do servidor', () => {
  it('23h30 de Divinópolis ainda é o mesmo dia, mesmo já sendo amanhã em UTC', () => {
    // 02:30Z do dia 17 = 23:30 do dia 16 em Divinópolis.
    expect(inicioDoDia(new Date('2026-10-17T02:30:00Z'))).toBe('2026-10-16T00:00:00-03:00')
    expect(inicioDoDia(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-17T00:00:00-03:00')
  })

  it('a última noite do mês ainda é do mês', () => {
    expect(mesAtual(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10')
    expect(mesDoInstante('2026-10-01T02:00:00Z')).toBe('2026-09')
    expect(mesDoInstante('2026-10-01T03:00:00Z')).toBe('2026-10')
  })

  it('soma meses atravessando o ano', () => {
    expect(somarMeses('2026-01', -1)).toBe('2025-12')
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(somarMeses('2026-10', -11)).toBe('2025-11')
  })

  it('o intervalo do mês é [1º às 0h, 1º do seguinte às 0h) com o fuso', () => {
    expect(intervaloDoMes('2026-12')).toEqual({
      inicio: '2026-12-01T00:00:00-03:00',
      fim: '2027-01-01T00:00:00-03:00',
    })
  })

  it('os últimos 12 meses terminam no corrente', () => {
    const meses = ultimosMeses(12, new Date('2026-10-17T15:00:00Z'))
    expect(meses).toHaveLength(12)
    expect(meses[0]).toBe('2025-11')
    expect(meses[11]).toBe('2026-10')
  })

  it('só aceita ?mes= no formato AAAA-MM', () => {
    expect(mesValido('2026-10')).toBe(true)
    expect(mesValido('2026-13')).toBe(false)
    expect(mesValido('2026-1')).toBe(false)
    expect(mesValido("2026-10' or 1=1")).toBe(false)
    expect(mesValido(undefined)).toBe(false)
  })

  it('fala o mês e a data por extenso', () => {
    expect(rotuloDoMes('2026-03')).toBe('março de 2026')
    expect(rotuloDoMes('2026-03', 'curto')).toBe('mar')
    expect(dataPorExtenso(new Date('2026-10-17T15:00:00Z'))).toBe('sábado, 17 de outubro')
  })
})

describe('comparação com o mesmo trecho do mês anterior', () => {
  it('dia 17 às 12h compara com o 1º–17 às 12h do mês anterior', () => {
    const agora = new Date('2026-10-17T15:00:00Z') // 12h em Divinópolis
    const { inicioAtual, inicioAnterior, corteAnterior } = janelaDeComparacao(agora)
    expect(new Date(inicioAtual).toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(new Date(inicioAnterior).toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(new Date(corteAnterior).toISOString()).toBe('2026-09-17T15:00:00.000Z')
  })

  it('31 de março compara com fevereiro inteiro, sem invadir março', () => {
    const { inicioAtual, corteAnterior } = janelaDeComparacao(new Date('2026-03-31T20:00:00Z'))
    expect(corteAnterior).toBe(inicioAtual)
  })

  it('variação só existe quando há base', () => {
    expect(variacao(120, 100)).toBe(20)
    expect(variacao(75, 100)).toBe(-25)
    expect(variacao(10, 0)).toBeNull()
  })
})

describe('resumo de pedidos (centavos)', () => {
  it('soma GMV e comissão e tira o ticket médio', () => {
    expect(
      resumir([
        { total: 2400, platform_fee_amount: 100 },
        { total: 5490, platform_fee_amount: 100 },
      ]),
    ).toEqual({ pedidos: 2, gmv: 7890, comissoes: 200, ticketMedio: 3945 })
  })

  it('mês sem pedido é zero, não NaN', () => {
    expect(resumir([])).toEqual({ pedidos: 0, gmv: 0, comissoes: 0, ticketMedio: 0 })
    expect(resumir([{ total: null, platform_fee_amount: null }]).gmv).toBe(0)
  })

  it('agrupa pelo mês de Divinópolis e ignora o que está fora da janela', () => {
    const serie = serieMensal(
      [
        { total: 1000, platform_fee_amount: 100, criado_em: '2026-10-01T02:59:00Z' }, // 30/09 23:59 local
        { total: 2000, platform_fee_amount: 100, criado_em: '2026-10-01T03:00:00Z' }, // 01/10 00:00 local
        { total: 3000, platform_fee_amount: 100, criado_em: '2026-10-15T15:00:00Z' },
        { total: 9900, platform_fee_amount: 100, criado_em: '2025-01-10T15:00:00Z' }, // fora
      ],
      ['2026-09', '2026-10'],
    )
    expect(serie).toEqual([
      { mes: '2026-09', pedidos: 1, gmv: 1000, comissoes: 100, ticketMedio: 1000 },
      { mes: '2026-10', pedidos: 2, gmv: 5000, comissoes: 200, ticketMedio: 2500 },
    ])
  })
})

describe('lojistas: assinatura vigente, busca e contagens', () => {
  it('vale a assinatura mais recente', () => {
    expect(
      maisRecente([
        { criado_em: '2026-01-01T00:00:00Z', billing_status: 'cancelada' },
        { criado_em: '2026-06-01T00:00:00Z', billing_status: 'ativa' },
      ])?.billing_status,
    ).toBe('ativa')
    expect(maisRecente([])).toBeNull()
    expect(maisRecente(null)).toBeNull()
  })

  it('busca sem acento, com todos os termos', () => {
    expect(casaBusca('divinopolis', ['Pizzaria de Divinópolis'])).toBe(true)
    expect(casaBusca('forno demo', ['Forno Demo', 'qa@mallevo.local'])).toBe(true)
    expect(casaBusca('forno pizza', ['Forno Demo'])).toBe(false)
    expect(casaBusca('   ', ['qualquer'])).toBe(true)
  })

  it('conta por chave', () => {
    expect(contarPor(['a', 'b', 'a'], (x) => x)).toEqual({ a: 2, b: 1 })
  })

  it('recebimentos se agrupam pelo que pedem da administração', () => {
    expect(grupoDosRecebimentos('active')).toBe('verificado')
    expect(grupoDosRecebimentos('registration')).toBe('em_andamento')
    expect(grupoDosRecebimentos('affiliation')).toBe('em_andamento')
    expect(grupoDosRecebimentos('refused')).toBe('com_problema')
    expect(grupoDosRecebimentos('blocked')).toBe('com_problema')
    expect(grupoDosRecebimentos('inactive')).toBe('inativo')
    expect(grupoDosRecebimentos(null)).toBe('em_andamento')
  })

  it('status sem cadastro vira rótulo neutro, nunca some', () => {
    expect(metaAssinatura(null)).toEqual({ rotulo: 'Sem assinatura', tom: 'vazio' })
    expect(metaRecebimentos('refused')).toEqual({ rotulo: 'Recusado', tom: 'perigo' })
    expect(metaRecebimentos('status_novo')).toEqual({ rotulo: 'status_novo', tom: 'neutro' })
  })
})

describe('entregador, preço e voz', () => {
  it('descreve o veículo como foi cadastrado', () => {
    expect(rotuloVeiculo('moto', null, 'ABC1D23')).toBe('Moto · ABC1D23')
    expect(rotuloVeiculo(null, 'bicicleta', null)).toBe('Bicicleta')
    expect(rotuloVeiculo(null, 'carro_grande', null)).toBe('carro grande')
    expect(rotuloVeiculo(null, null, null)).toBe('Veículo não informado')
  })

  it('lê o preço como se digita no Brasil', () => {
    expect(centavosDoTexto('49,90')).toBe(4990)
    expect(centavosDoTexto('49.90')).toBe(4990)
    expect(centavosDoTexto('1.234,56')).toBe(123456)
    expect(centavosDoTexto('0,29')).toBe(29)
    expect(centavosDoTexto('0')).toBe(0)
    expect(centavosDoTexto('')).toBeNaN()
    expect(centavosDoTexto('abc')).toBeNaN()
  })

  it('fala como o app', () => {
    const agora = Date.parse('2026-10-15T23:00:00Z')
    expect(tempoRelativo('2026-10-15T22:59:40Z', agora)).toBe('agora')
    expect(tempoRelativo('2026-10-15T22:48:00Z', agora)).toBe('12 min')
    expect(tempoRelativo('2026-10-12T23:00:00Z', agora)).toBe('3 d')
    expect(saudacao(9)).toBe('Bom dia')
    // "há 14 de set." não existe: passado de 30 dias, a data pede "em".
    expect(quando('2026-10-12T23:00:00Z', agora)).toBe('há 3 d')
    expect(quando('2026-10-15T22:59:40Z', agora)).toBe('agora')
    expect(quando('2026-09-14T15:00:00Z', agora)).toBe('em 14 de set.')
    expect(saudacao(15)).toBe('Boa tarde')
    expect(saudacao(2)).toBe('Boa noite')
    expect(contagem(1, 'loja', 'lojas')).toBe('1 loja')
    expect(contagem(1248, 'loja', 'lojas')).toBe('1.248 lojas')
  })
})

describe('buscarTodas — sem o corte silencioso de 1000 linhas', () => {
  it('pede faixa por faixa até a última página', async () => {
    const pedidas: [number, number][] = []
    const linhas = Array.from({ length: 2500 }, (_, i) => i)
    const todas = await buscarTodas<number>(async (de, ate) => {
      pedidas.push([de, ate])
      return { data: linhas.slice(de, ate + 1), error: null }
    })
    expect(todas).toHaveLength(2500)
    expect(pedidas).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('erro do banco sobe — não vira lista vazia', async () => {
    await expect(
      buscarTodas(async () => ({ data: null, error: { message: 'permission denied' } })),
    ).rejects.toThrow('permission denied')
  })
})
