import './globals.css'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

import { AuthProvider } from '@/components/auth/AuthProvider'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: 'Mallevo',
  description: 'O shopping digital de Divinópolis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="bg-canvas">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
