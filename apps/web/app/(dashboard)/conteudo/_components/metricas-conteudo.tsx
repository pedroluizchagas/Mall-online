import { Clapperboard, Eye, Heart, MessageCircle } from 'lucide-react'
import { postVisivelNoFeed, type Post } from '@mallevo/lib'
import { KPI } from '@/components/ui/kpi'

const NUMERO = new Intl.NumberFormat('pt-BR')

/** Métricas somente leitura — quem incrementa é o consumer. */
export function MetricasConteudo({ posts }: { posts: Post[] }) {
  const noAr = posts.filter(postVisivelNoFeed).length
  const soma = (campo: 'views' | 'curtidas' | 'comentarios') => posts.reduce((s, p) => s + (p[campo] ?? 0), 0)

  return (
    // `region` nomeada: o leitor de tela anuncia o bloco, e o número fica
    // distinguível da pílula de views que aparece em cada cartaz.
    <section aria-label="Métricas do conteúdo" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI label="Posts no ar" value={NUMERO.format(noAr)} icon={Clapperboard} />
      <KPI label="Visualizações" value={NUMERO.format(soma('views'))} icon={Eye} />
      <KPI label="Curtidas" value={NUMERO.format(soma('curtidas'))} icon={Heart} />
      <KPI label="Comentários" value={NUMERO.format(soma('comentarios'))} icon={MessageCircle} />
    </section>
  )
}
