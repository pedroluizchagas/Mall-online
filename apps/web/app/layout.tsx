import './globals.css'

export const metadata = {
  title: 'Mallora — Dashboard',
  description: 'Plataforma de delivery de Divinópolis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
