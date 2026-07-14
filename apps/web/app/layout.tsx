import './globals.css'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

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
  title: 'Mallevo — Painel do Lojista',
  description: 'O shopping digital de Divinópolis',
}

/**
 * Define o tema (claro/escuro) ANTES do primeiro paint, evitando flash:
 * escolha explícita (localStorage) tem prioridade; senão segue o SO.
 * Roda inline no <head> — precede a hidratação do React.
 */
const TEMA_INIT = `(function(){try{
  var t = localStorage.getItem('tema-dashboard');
  if (t !== 'dark' && t !== 'light') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
