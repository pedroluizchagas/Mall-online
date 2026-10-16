import type { PartnerIconName } from '@/components/ui/partner-icon'
import { EmptyState } from '@/components/dashboard/empty-state'

export function AbaPrivacidade() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CardEmBreve
        icone="download"
        titulo="Exportar meus dados"
        descricao="Em breve você poderá baixar uma cópia de tudo o que registramos sobre você (LGPD)."
      />
      <CardEmBreve
        icone="user-minus"
        titulo="Excluir conta"
        descricao="Em breve você poderá solicitar a exclusão definitiva da sua conta e dos dados associados."
      />
    </div>
  )
}

function CardEmBreve({
  icone,
  titulo,
  descricao,
}: {
  icone: PartnerIconName
  titulo: string
  descricao: string
}) {
  return (
    <div className="cartao">
      <div className="flex items-center justify-end px-5 pt-4">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
        >
          Em breve
        </span>
      </div>
      <EmptyState icone={icone} titulo={titulo} descricao={descricao} />
    </div>
  )
}
