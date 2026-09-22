/**
 * Registro das vitrines RN — a tabela `código → { fachada, PDP }`.
 *
 * A decisão de QUAL vitrine usar não mora aqui: é `resolveVitrine(preset,
 * categoria_slug)` em @mallevo/lib (tabela `VITRINES`), a mesma que o
 * storefront e o editor do lojista leem. Aqui só se mapeia o código para os
 * componentes, como `VITRINES_WEB` faz do outro lado.
 *
 * Por que props COMUNS e não as props de cada componente: a união dos 18
 * tipos estoura a inferência do JSX (o `[slug].tsx` vinha empilhando cadeias
 * de 14 e 18 ternários e ramos próprios para Clínica/Magazine/Gôndola/Cuidado
 * justamente por isso). `PropsLoja`/`PropsPdp` descrevem a loja e o produto
 * REAIS que o `[slug].tsx` carrega — um superconjunto do que cada vitrine
 * pede —, então toda vitrine é atribuível a `ComponentType<PropsLoja>` e o
 * dispatch vira um acesso de índice.
 */
import type { ComponentType } from 'react'
import type { VitrineCodigo } from '@mallevo/lib'

import { LojaEditorial } from './LojaEditorial'
import { ProdutoEditorial } from './ProdutoEditorial'
import { LojaRaw } from './LojaRaw'
import { ProdutoRaw } from './ProdutoRaw'
import { LojaSerena } from './LojaSerena'
import { ProdutoSereno } from './ProdutoSereno'
import { LojaArtesa } from './LojaArtesa'
import { ProdutoArtesao } from './ProdutoArtesao'
import { LojaNoir } from './LojaNoir'
import { ProdutoNoir } from './ProdutoNoir'
import { LojaVolt } from './LojaVolt'
import { ProdutoVolt } from './ProdutoVolt'
import { LojaClinica } from './LojaClinica'
import { ProdutoClinico } from './ProdutoClinico'
import { LojaTorra } from './LojaTorra'
import { ProdutoTorra } from './ProdutoTorra'
import { LojaSmash } from './LojaSmash'
import { ProdutoSmash } from './ProdutoSmash'
import { LojaRitual } from './LojaRitual'
import { ProdutoRitual } from './ProdutoRitual'
import { LojaMagazine } from './LojaMagazine'
import { ProdutoMagazine } from './ProdutoMagazine'
import { LojaHorta } from './LojaHorta'
import { ProdutoHorta } from './ProdutoHorta'
import { LojaForno } from './LojaForno'
import { ProdutoForno } from './ProdutoForno'
import { LojaPassarela } from './LojaPassarela'
import { ProdutoPassarela } from './ProdutoPassarela'
import { LojaFeira } from './LojaFeira'
import { ProdutoFeira } from './ProdutoFeira'
import { LojaMesa } from './LojaMesa'
import { ProdutoMesa } from './ProdutoMesa'
import { LojaGondola } from './LojaGondola'
import { ProdutoGondola } from './ProdutoGondola'
import { LojaCuidado } from './LojaCuidado'
import { ProdutoCuidado } from './ProdutoCuidado'

/**
 * O produto como o `[slug].tsx` o carrega de `products` — o denominador
 * comum das 18 vitrines e dos 18 PDPs. `metadata` é o JSONB cru (quem lê usa
 * `lerMetadataProduto`); estoque são as colunas REAIS (`metadata.estoque`
 * não existe).
 */
export interface ProdutoDaVitrine {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  category_id: string | null
  metadata: Record<string, unknown> | null
  track_stock: boolean | null
  stock_quantity: number | null
}

export interface SecaoDaVitrine {
  titulo: string
  produtos: ProdutoDaVitrine[]
}

/**
 * A loja como o `[slug].tsx` a carrega de `stores`. Tudo obrigatório de
 * propósito: as vitrines declaram campos opcionais, e um superconjunto
 * fechado é atribuível a todas elas — se amanhã uma vitrine pedir um campo
 * novo, o erro aparece aqui e não em 18 arquivos.
 */
export interface LojaDaVitrine {
  id: string
  nome: string
  slug: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  taxa_entrega: number
  tempo_entrega: number | null
  telefone: string | null
  aceita_pix: boolean | null
  aceita_cartao_online: boolean | null
  /** `stores.horarios` cru — `statusAbertura`/`horarioDeHoje` normalizam. */
  horarios: unknown
  tenant_id: string
  /** `stores.theme` cru (JSONB) — `useStoreDesignFromTheme` resolve a pele. */
  theme: unknown
  /** Slug do nicho (`categories.slug` via `stores.categoria_id`). */
  categoria_slug: string | null
}

/** Props da FACHADA (Loja*). */
export interface PropsLoja {
  loja: LojaDaVitrine
  secoes: SecaoDaVitrine[]
  aoAbrirProduto: (produto: ProdutoDaVitrine) => void
  espacoFinal: number
}

/** Props do PDP (Produto*, e também o `ModalProduto` do layout padrão). */
export interface PropsPdp {
  produto: ProdutoDaVitrine
  loja: LojaDaVitrine
  onFechar: () => void
}

export interface VitrineRN {
  Loja: ComponentType<PropsLoja>
  Pdp: ComponentType<PropsPdp>
}

/**
 * `Record` COMPLETO: vitrine nova na tabela da lib sem par de componentes
 * aqui quebra o tsc — o mesmo contrato do `VITRINES_WEB` do storefront.
 */
export const VITRINES_RN: Record<VitrineCodigo, VitrineRN> = {
  editorial: { Loja: LojaEditorial, Pdp: ProdutoEditorial },
  raw: { Loja: LojaRaw, Pdp: ProdutoRaw },
  serena: { Loja: LojaSerena, Pdp: ProdutoSereno },
  artesa: { Loja: LojaArtesa, Pdp: ProdutoArtesao },
  noir: { Loja: LojaNoir, Pdp: ProdutoNoir },
  volt: { Loja: LojaVolt, Pdp: ProdutoVolt },
  clinica: { Loja: LojaClinica, Pdp: ProdutoClinico },
  torra: { Loja: LojaTorra, Pdp: ProdutoTorra },
  smash: { Loja: LojaSmash, Pdp: ProdutoSmash },
  ritual: { Loja: LojaRitual, Pdp: ProdutoRitual },
  magazine: { Loja: LojaMagazine, Pdp: ProdutoMagazine },
  horta: { Loja: LojaHorta, Pdp: ProdutoHorta },
  forno: { Loja: LojaForno, Pdp: ProdutoForno },
  passarela: { Loja: LojaPassarela, Pdp: ProdutoPassarela },
  feira: { Loja: LojaFeira, Pdp: ProdutoFeira },
  mesa: { Loja: LojaMesa, Pdp: ProdutoMesa },
  gondola: { Loja: LojaGondola, Pdp: ProdutoGondola },
  cuidado: { Loja: LojaCuidado, Pdp: ProdutoCuidado },
}
