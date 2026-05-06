import { headers } from 'next/headers'

interface Props {
  params: { slug: string }
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = params
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain') ?? slug

  return (
    <main>
      <h1>Loja: {subdomain}</h1>
    </main>
  )
}
