import { redirect } from 'next/navigation'

export default function PaginaAssinatura() {
  redirect('/minha-conta?aba=assinatura')
}
