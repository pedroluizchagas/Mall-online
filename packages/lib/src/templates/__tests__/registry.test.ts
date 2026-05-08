import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../registry'
import type { TemplateCodigo } from '../types'

const CODIGOS_ESPERADOS: readonly TemplateCodigo[] = [
  'food',
  'fashion',
  'pharmacy',
  'pet',
  'services',
  'generic',
]

describe('registry de templates', () => {
  it('declara exatamente os 6 templates esperados', () => {
    const codigos = Object.keys(TEMPLATES).sort()
    expect(codigos).toEqual([...CODIGOS_ESPERADOS].sort())
  })

  it.each(CODIGOS_ESPERADOS)(
    'template %s tem todos os campos obrigatórios preenchidos',
    (codigo) => {
      const template = TEMPLATES[codigo]

      expect(template.codigo).toBe(codigo)
      expect(template.nome).toBeTruthy()
      expect(typeof template.nome).toBe('string')
      expect(template.descricao).toBeTruthy()
      expect(typeof template.descricao).toBe('string')
      expect(template.icone).toBeTruthy()
      expect(typeof template.icone).toBe('string')

      // modulos: 7 booleans presentes
      expect(template.modulos).toMatchObject({
        pedidos: expect.any(Boolean),
        produtos: expect.any(Boolean),
        estoque: expect.any(Boolean),
        entregadores: expect.any(Boolean),
        agenda: expect.any(Boolean),
        relatorios: expect.any(Boolean),
        financeiro: expect.any(Boolean),
      })

      // produto
      expect(['sempre', 'opcional', 'nunca']).toContain(template.produto.permiteVariacoes)
      expect(typeof template.produto.permiteModificadores).toBe('boolean')
      expect(Array.isArray(template.produto.camposExtras)).toBe(true)
      expect(template.produto.labels.produtoSingular).toBeTruthy()
      expect(template.produto.labels.produtoPlural).toBeTruthy()
      expect(template.produto.labels.precoLabel).toBeTruthy()
      expect(typeof template.produto.defaults.trackStock).toBe('boolean')
      expect(typeof template.produto.defaults.disponivel).toBe('boolean')

      // consumer
      expect(['simples', 'variacao', 'cardapio', 'agendamento']).toContain(
        template.consumer.layoutPdp,
      )

      // onboarding
      expect(Array.isArray(template.onboarding.wizardSteps)).toBe(true)
    },
  )

  it('todos os codigos do registry são únicos', () => {
    const codigos = Object.values(TEMPLATES).map((t) => t.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('cada campo extra tem codigo, label e tipo', () => {
    for (const template of Object.values(TEMPLATES)) {
      for (const campo of template.produto.camposExtras) {
        expect(campo.codigo).toBeTruthy()
        expect(campo.label).toBeTruthy()
        expect(campo.tipo).toBeTruthy()
      }
    }
  })

  it('food permite modificadores e nunca permite variações', () => {
    expect(TEMPLATES.food.produto.permiteVariacoes).toBe('nunca')
    expect(TEMPLATES.food.produto.permiteModificadores).toBe(true)
  })

  it('fashion sempre permite variações e nunca modificadores', () => {
    expect(TEMPLATES.fashion.produto.permiteVariacoes).toBe('sempre')
    expect(TEMPLATES.fashion.produto.permiteModificadores).toBe(false)
  })

  it('services oculta entregadores e habilita agenda', () => {
    expect(TEMPLATES.services.modulos.entregadores).toBe(false)
    expect(TEMPLATES.services.modulos.agenda).toBe(true)
  })

  it('apenas food permite modificadores no produto', () => {
    expect(TEMPLATES.food.produto.permiteModificadores).toBe(true)
    expect(TEMPLATES.fashion.produto.permiteModificadores).toBe(false)
    expect(TEMPLATES.pharmacy.produto.permiteModificadores).toBe(false)
    expect(TEMPLATES.pet.produto.permiteModificadores).toBe(false)
    expect(TEMPLATES.services.produto.permiteModificadores).toBe(false)
    expect(TEMPLATES.generic.produto.permiteModificadores).toBe(false)
  })

  it('food declara campos extras esperados (tempo_preparo_min, serve_pessoas, tags)', () => {
    const codigos = TEMPLATES.food.produto.camposExtras.map((c) => c.codigo)
    expect(codigos).toEqual(
      expect.arrayContaining(['tempo_preparo_min', 'serve_pessoas', 'tags']),
    )
  })
})
