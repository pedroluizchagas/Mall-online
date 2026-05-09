import { redirect } from 'next/navigation'

export default function PaginaContaRedirect({
  searchParams,
}: {
  searchParams: { aba?: string }
}) {
  const qs = searchParams.aba ? `?aba=${searchParams.aba}` : ''
  redirect(`/minha-conta${qs}`)
}
