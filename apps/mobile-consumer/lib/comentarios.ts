/**
 * Comentários de um post.
 *
 * Não existe `post_comments` no schema — a view `public_explore_feed` só
 * publica o CONTADOR (`comentarios`). Este módulo é a fonte de conteúdo
 * enquanto a tabela não existe: gera um conjunto plausível e ESTÁVEL por
 * post (mesmo post, mesmos comentários, entre boots) e guarda as falas
 * prontas que a loja usa para responder.
 *
 * Quando a tabela chegar, só `comentariosDoPost` e `respostaDaLoja` mudam —
 * o store (`store/useComentarios.ts`) e a UI ficam iguais.
 */

export interface Comentario {
  id: string
  post_id: string
  autor: string
  autor_tipo: 'consumidor' | 'loja'
  texto: string
  criado_em: string
  /** Preenchido quando a loja responde um comentário do usuário. */
  resposta_a?: string | null
}

const NOMES = [
  'Ana Clara',
  'Rafa',
  'Juliana M.',
  'Téo',
  'Bruna S.',
  'Marcos V.',
  'Lud',
  'Ricardo A.',
  'Paty',
  'Gui',
  'Fernanda',
  'Diego',
  'Camila R.',
  'Vitinho',
]

/**
 * Falas genéricas de propósito: o mesmo pool serve a hamburgueria, clínica
 * e floricultura sem soar deslocado. Nada de referência a produto
 * específico — isso mentiria sobre o post.
 */
const FALAS = [
  'Isso ficou muito bom',
  'Já quero',
  'Chegando aí em 10 minutos',
  'Melhor da cidade, sem exagero',
  'Vocês entregam no Bom Pastor?',
  'Sempre impecável',
  'Salvando pra depois',
  'Fui semana passada e amei',
  'Que capricho, gente',
  'Quanto tempo demora?',
  'Marquei minha irmã aqui',
  'Voltei só pra ver de novo',
  'Comprei ontem, recomendo demais',
  'Abre domingo?',
  'Preço justo pelo que entrega',
  'Tô indo agora',
]

const RESPOSTAS_LOJA = [
  'Obrigado pelo carinho! Aparece aqui pra gente te receber.',
  'Que bom ler isso! Qualquer coisa chama no direct.',
  'Valeu demais pelo comentário — te esperamos por aqui.',
  'Ficamos felizes! Hoje ainda tem, é só passar.',
  'Muito obrigado! Se precisar de ajuda pra escolher, a gente te orienta.',
]

/** Base fixa: os comentários semeados não podem mudar a cada boot. */
const BASE = Date.parse('2026-08-10T20:00:00.000Z')

/** djb2 — hash estável e barato, só para escolher nome e fala. */
function semente(texto: string) {
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = (h * 33) ^ texto.charCodeAt(i)
  return Math.abs(h)
}

/**
 * Conjunto de comentários já existentes no post. Determinístico: o mesmo
 * `post_id` devolve sempre os mesmos autores, na mesma ordem.
 */
export function comentariosDoPost(post_id: string, quantos = 9): Comentario[] {
  const base = semente(post_id)

  return Array.from({ length: quantos }, (_, i) => {
    const nome = NOMES[(base + i * 7) % NOMES.length]
    const fala = FALAS[(base + i * 13) % FALAS.length]
    return {
      id: `${post_id}-seed-${i}`,
      post_id,
      autor: nome,
      autor_tipo: 'consumidor' as const,
      texto: fala,
      // Mais antigo primeiro — a ordem em que entram no stream.
      criado_em: new Date(BASE + i * 60_000).toISOString(),
    }
  })
}

/** Fala que a loja usa para responder — estável por comentário respondido. */
export function respostaDaLoja(idComentario: string) {
  return RESPOSTAS_LOJA[semente(idComentario) % RESPOSTAS_LOJA.length]
}
