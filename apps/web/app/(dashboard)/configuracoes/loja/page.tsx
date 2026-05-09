import { redirect } from 'next/navigation'

export default function PaginaConfiguracoesLojaRedirect({
  searchParams,
}: {
  searchParams: { aba?: string }
}) {
  const qs = searchParams.aba ? `?aba=${searchParams.aba}` : ''
  redirect(`/configuracoes${qs}`)
}
