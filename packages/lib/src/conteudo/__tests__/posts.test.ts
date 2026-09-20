import { describe, expect, it } from 'vitest'

import {
  badgeDoPost,
  caminhosDoPost,
  dadosPostSchema,
  formatarDuracaoSeg,
  mensagemErroPost,
  normalizarTag,
  novoPostSchema,
  orfaosDoPrefixo,
  postVisivelNoFeed,
  tipoDoArquivo,
  urlPublicaDoObjeto,
} from '../posts'

describe('badgeDoPost', () => {
  it('sinalizado vence qualquer status', () => {
    expect(badgeDoPost({ status: 'published', moderacao: 'flagged' }).rotulo).toBe('Sinalizado')
    expect(badgeDoPost({ status: 'hidden', moderacao: 'rejected' }).rotulo).toBe('Sinalizado')
  })
  it('em análise: processando ou moderação pendente', () => {
    expect(badgeDoPost({ status: 'processing', moderacao: 'approved' }).rotulo).toBe('Em análise')
    expect(badgeDoPost({ status: 'published', moderacao: 'pending' }).rotulo).toBe('Em análise')
  })
  it('oculto e publicado', () => {
    expect(badgeDoPost({ status: 'hidden', moderacao: 'approved' }).rotulo).toBe('Oculto')
    expect(badgeDoPost({ status: 'published', moderacao: 'approved' }).rotulo).toBe('Publicado')
  })
  it('postVisivelNoFeed espelha a view public_explore_feed', () => {
    expect(postVisivelNoFeed({ status: 'published', moderacao: 'approved' })).toBe(true)
    expect(postVisivelNoFeed({ status: 'published', moderacao: 'pending' })).toBe(false)
    expect(postVisivelNoFeed({ status: 'hidden', moderacao: 'approved' })).toBe(false)
  })
})

describe('normalizarTag', () => {
  it('tira acento, espaço e #; minúscula; até 30', () => {
    expect(normalizarTag('#Pão de Queijo')).toBe('pao-de-queijo')
    expect(normalizarTag('  Açaí!!  ')).toBe('acai')
    expect(normalizarTag('a'.repeat(40))).toHaveLength(30)
    expect(normalizarTag('---')).toBe('')
  })
})

describe('caminhosDoPost', () => {
  it('prefixo {tenant}/{store}, extensão pelo tipo e MIME', () => {
    const c = caminhosDoPost('t1', 's1', 'abc', 'foto')
    expect(c).toEqual({ prefixo: 't1/s1', mediaPath: 't1/s1/abc.jpg', thumbPath: 't1/s1/abc-thumb.jpg' })
    expect(caminhosDoPost('t1', 's1', 'abc', 'video').mediaPath).toBe('t1/s1/abc.mp4')
    expect(caminhosDoPost('t1', 's1', 'abc', 'video', 'video/quicktime').mediaPath).toBe('t1/s1/abc.mov')
  })
  it('urlPublicaDoObjeto = getPublicUrl sem cliente', () => {
    expect(urlPublicaDoObjeto('https://x.supabase.co/', 'explore-media', 't/s/a.jpg')).toBe(
      'https://x.supabase.co/storage/v1/object/public/explore-media/t/s/a.jpg',
    )
  })
})

describe('tipoDoArquivo', () => {
  it('aceita só os MIME do bucket', () => {
    expect(tipoDoArquivo('image/jpeg')).toBe('foto')
    expect(tipoDoArquivo('video/quicktime')).toBe('video')
    expect(tipoDoArquivo('image/gif')).toBeNull()
  })
})

describe('orfaosDoPrefixo', () => {
  it('devolve o que está no bucket e não em store_posts', () => {
    const posts = [{ media_path: 't/s/a.mp4', thumb_path: 't/s/a-thumb.jpg' }]
    expect(orfaosDoPrefixo('t/s', ['a.mp4', 'a-thumb.jpg', 'b.jpg', 'pasta/'], posts)).toEqual(['t/s/b.jpg'])
  })
})

describe('schemas', () => {
  it('dadosPostSchema normaliza tags, dedup e legenda vazia → null', () => {
    const r = dadosPostSchema.parse({ descricao: '   ', tags: ['#Pizza', 'pizza', 'Forno a Lenha'], product_id: null })
    expect(r).toEqual({ descricao: null, tags: ['pizza', 'forno-a-lenha'], product_id: null })
  })
  it('dadosPostSchema recusa mais de 5 tags e legenda longa', () => {
    expect(dadosPostSchema.safeParse({ descricao: 'x'.repeat(601), tags: [], product_id: null }).success).toBe(false)
    expect(dadosPostSchema.safeParse({ descricao: null, tags: ['1', '2', '3', '4', '5', '6'], product_id: null }).success).toBe(false)
  })
  it('novoPostSchema exige mídia e limita a duração', () => {
    const base = {
      descricao: null,
      tags: [],
      product_id: null,
      store_id: '00000000-0000-4000-8000-000000000001',
      tipo: 'video' as const,
      media_path: 't/s/a.mp4',
      media_url: 'https://x/a.mp4',
      thumb_path: 't/s/a-thumb.jpg',
      thumb_url: 'https://x/a-thumb.jpg',
      largura: 1080,
      altura: 1920,
      bytes: 100,
    }
    expect(novoPostSchema.safeParse({ ...base, duracao_seg: 30 }).success).toBe(true)
    expect(novoPostSchema.safeParse({ ...base, duracao_seg: 61 }).success).toBe(false)
  })
})

describe('mensagens', () => {
  it('erro do trigger de limite vira texto do produto', () => {
    expect(mensagemErroPost('Limite de posts do plano atingido (máximo: 10).')).toBe('Limite de posts do seu plano atingido.')
    expect(mensagemErroPost('outro')).toBe('outro')
  })
  it('formatarDuracaoSeg', () => {
    expect(formatarDuracaoSeg(12)).toBe('12s')
    expect(formatarDuracaoSeg(65)).toBe('1:05')
    expect(formatarDuracaoSeg(null)).toBe('')
  })
})
