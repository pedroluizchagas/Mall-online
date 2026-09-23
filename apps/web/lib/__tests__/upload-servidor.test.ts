import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  caminhoDaUrlPublica,
  diffDeMidia,
  extensaoSegura,
  filtrarUrlsDoTenant,
  manterDoConjunto,
  prefixoPublicoDoTenant,
} from '@/lib/upload-servidor'

/**
 * A-03 (origem da mídia) e A-04 (o que sai do Storage) do plano de
 * convergência. São helpers puros: o que eles decidem é o que as actions de
 * produto e de Minha Loja gravam e apagam.
 */

const SUPABASE = 'https://projeto.supabase.co'
const TENANT = 'd0000000-0000-4000-8000-000000000001'
const OUTRO = 'd0000000-0000-4000-8000-0000000000ff'
const original = process.env.NEXT_PUBLIC_SUPABASE_URL

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE
})
afterAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = original
})

const url = (bucket: string, caminho: string) =>
  `${SUPABASE}/storage/v1/object/public/${bucket}/${caminho}`

describe('prefixoPublicoDoTenant', () => {
  it('é a URL pública do bucket até a pasta do tenant', () => {
    expect(prefixoPublicoDoTenant('product-images', TENANT)).toBe(
      `${SUPABASE}/storage/v1/object/public/product-images/${TENANT}/`,
    )
  })
})

describe('filtrarUrlsDoTenant', () => {
  it('aceita só o que é do bucket e do prefixo do tenant', () => {
    const minha = url('product-images', `${TENANT}/galeria-1.jpg`)
    const deOutroTenant = url('product-images', `${OUTRO}/galeria-1.jpg`)
    const outroBucket = url('store-assets', `${TENANT}/casa-1.jpg`)
    const externa = 'https://evil.example/foto.jpg'

    expect(
      filtrarUrlsDoTenant([minha, deOutroTenant, outroBucket, externa], 'product-images', TENANT),
    ).toEqual([minha])
  })

  it('recusa entrada que não é lista de strings e deduplica preservando a ordem', () => {
    const a = url('product-images', `${TENANT}/a.jpg`)
    const b = url('product-images', `${TENANT}/b.jpg`)
    expect(filtrarUrlsDoTenant('não é lista', 'product-images', TENANT)).toEqual([])
    expect(filtrarUrlsDoTenant([null, 3, {}], 'product-images', TENANT)).toEqual([])
    expect(filtrarUrlsDoTenant([b, a, b], 'product-images', TENANT)).toEqual([b, a])
  })

  it('não deixa escapar traversal nem a própria pasta', () => {
    expect(
      filtrarUrlsDoTenant(
        [url('product-images', `${TENANT}/../${OUTRO}/x.jpg`), url('product-images', `${TENANT}/`)],
        'product-images',
        TENANT,
      ),
    ).toEqual([])
  })
})

describe('caminhoDaUrlPublica', () => {
  it('devolve o path do objeto quando a URL é deste bucket e tenant', () => {
    expect(caminhoDaUrlPublica(url('store-assets', `${TENANT}/logo-1.png`), 'store-assets', TENANT))
      .toBe(`${TENANT}/logo-1.png`)
  })

  it('devolve null para bucket, tenant ou origem estranhos', () => {
    expect(caminhoDaUrlPublica(url('store-assets', `${OUTRO}/logo.png`), 'store-assets', TENANT)).toBeNull()
    expect(caminhoDaUrlPublica(url('product-images', `${TENANT}/x.jpg`), 'store-assets', TENANT)).toBeNull()
    expect(caminhoDaUrlPublica('https://evil.example/x.jpg', 'store-assets', TENANT)).toBeNull()
    expect(caminhoDaUrlPublica('', 'store-assets', TENANT)).toBeNull()
  })
})

describe('diffDeMidia', () => {
  it('devolve o que estava gravado e não ficou entre as mantidas', () => {
    expect(diffDeMidia(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
  })

  it('lista vazia de mantidas remove tudo; nada gravado não remove nada', () => {
    expect(diffDeMidia(['a', 'b'], [])).toEqual(['a', 'b'])
    expect(diffDeMidia([], ['a'])).toEqual([])
    expect(diffDeMidia(null, ['a'])).toEqual([])
    expect(diffDeMidia(undefined, undefined)).toEqual([])
  })

  it('ignora buracos e não repete o mesmo caminho', () => {
    expect(diffDeMidia(['a', null, 'a', '', undefined, 'b'], ['b'])).toEqual(['a'])
  })

  it('foto nova não apaga a que continua na galeria', () => {
    const antigas = ['foto-1.jpg', 'foto-2.jpg']
    const finais = ['foto-2.jpg', 'foto-3.jpg']
    expect(diffDeMidia(antigas, finais)).toEqual(['foto-1.jpg'])
  })
})

describe('extensaoSegura', () => {
  it('deriva do MIME declarado, nunca do nome do arquivo', () => {
    expect(extensaoSegura('image/png', 'jpg')).toBe('png')
    expect(extensaoSegura('image/jpeg', 'png')).toBe('jpg')
    expect(extensaoSegura('image/webp', 'jpg')).toBe('webp')
    expect(extensaoSegura('image/svg+xml', 'png')).toBe('svg')
    expect(extensaoSegura('application/x-msdownload', 'jpg')).toBe('jpg')
  })
})

describe('manterDoConjunto', () => {
  const A = 'https://x.supabase.co/storage/v1/object/public/product-images/t1/a.jpg'
  const B = 'https://picsum.photos/seed/legado/800/800'   // gravado, fora do bucket
  const C = 'https://x.supabase.co/storage/v1/object/public/product-images/t1/c.jpg'

  it('mantém o que já estava gravado, inclusive URL fora do bucket', () => {
    // Era isto que quebrava: a foto do seed (picsum) sumia ao salvar o produto.
    expect(manterDoConjunto([A, B], [A, B, C])).toEqual([A, B])
  })

  it('respeita a ordem escolhida pelo lojista', () => {
    expect(manterDoConjunto([C, A], [A, B, C])).toEqual([C, A])
  })

  it('descarta o que NÃO estava gravado, venha de onde vier', () => {
    const deOutroTenant = 'https://x.supabase.co/storage/v1/object/public/product-images/t2/x.jpg'
    const externa = 'https://evil.example/x.jpg'
    expect(manterDoConjunto([A, deOutroTenant, externa], [A, B])).toEqual([A])
  })

  it('remove duplicata e ignora item que não é string', () => {
    expect(manterDoConjunto([A, A, 3, null, {}], [A])).toEqual([A])
  })

  it('entrada que não é lista vira lista vazia', () => {
    expect(manterDoConjunto('não é lista', [A])).toEqual([])
    expect(manterDoConjunto(undefined, [A])).toEqual([])
  })

  it('nada gravado = nada mantido', () => {
    expect(manterDoConjunto([A], [])).toEqual([])
  })
})
