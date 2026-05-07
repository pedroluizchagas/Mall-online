import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATEGORIA_SLUG_TO_TEMPLATE,
  getTemplateBySlug,
  getTemplateByStore,
} from '../mapping'

/**
 * As 20 categorias do seed (`apps/web/seed-categories.js`) precisam estar
 * presentes no mapping. Lista espelha `docs/dashboard-templates/07-categorias-e-pisos.md`.
 */
const SLUGS_DO_SEED = [
  'alimentos-bebidas',
  'vestuario-calcados',
  'acessorios-joias',
  'farmacia-medicamentos',
  'beleza-cosmeticos',
  'saloes-estetica',
  'saude-bem-estar',
  'pet-shop',
  'veterinaria',
  'eletronicos-tecnologia',
  'casa-decoracao',
  'construcao-ferramentas',
  'papelaria-livraria',
  'brinquedos-presentes',
  'floricultura-plantas',
  'automotivo',
  'mercado-conveniencia',
  'oficinas-manutencao',
  'aulas-cursos',
  'outros',
] as const

describe('CATEGORIA_SLUG_TO_TEMPLATE', () => {
  it('cobre as 20 categorias do seed', () => {
    expect(SLUGS_DO_SEED).toHaveLength(20)
    for (const slug of SLUGS_DO_SEED) {
      expect(CATEGORIA_SLUG_TO_TEMPLATE).toHaveProperty(slug)
    }
  })

  it('não tem entradas extras além das 20 categorias do seed', () => {
    const noMapping = Object.keys(CATEGORIA_SLUG_TO_TEMPLATE).sort()
    expect(noMapping).toEqual([...SLUGS_DO_SEED].sort())
  })

  it('mapeia food, fashion, pharmacy, pet, services e generic conforme contrato', () => {
    expect(CATEGORIA_SLUG_TO_TEMPLATE['alimentos-bebidas']).toBe('food')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['vestuario-calcados']).toBe('fashion')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['acessorios-joias']).toBe('fashion')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['farmacia-medicamentos']).toBe('pharmacy')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['pet-shop']).toBe('pet')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['saloes-estetica']).toBe('services')
    expect(CATEGORIA_SLUG_TO_TEMPLATE['outros']).toBe('generic')
  })
})

describe('getTemplateBySlug', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('retorna fashion para vestuario-calcados', () => {
    const template = getTemplateBySlug('vestuario-calcados')
    expect(template.codigo).toBe('fashion')
  })

  it('retorna food para alimentos-bebidas', () => {
    expect(getTemplateBySlug('alimentos-bebidas').codigo).toBe('food')
  })

  it('retorna generic quando slug é null/undefined', () => {
    expect(getTemplateBySlug(null).codigo).toBe('generic')
    expect(getTemplateBySlug(undefined).codigo).toBe('generic')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('retorna generic e emite warning quando slug não está mapeado', () => {
    const template = getTemplateBySlug('slug-inexistente')
    expect(template.codigo).toBe('generic')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('slug-inexistente')
  })
})

describe('getTemplateByStore', () => {
  it('retorna fashion para store com categoria.slug = vestuario-calcados', () => {
    const template = getTemplateByStore({ categoria: { slug: 'vestuario-calcados' } })
    expect(template.codigo).toBe('fashion')
  })

  it('retorna generic quando categoria é null', () => {
    const template = getTemplateByStore({ categoria: null })
    expect(template.codigo).toBe('generic')
  })

  it('retorna generic quando store não tem categoria', () => {
    const template = getTemplateByStore({})
    expect(template.codigo).toBe('generic')
  })
})
