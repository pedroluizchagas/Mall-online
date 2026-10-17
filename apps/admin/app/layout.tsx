import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

// A voz da casa (a mesma do painel do lojista, do app e da landing): Plus
// Jakarta Sans, com o itálico da linha acesa do statement. Mono só para hora,
// código e identificador.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-jakarta',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mallevo — Administração',
  description: 'Os bastidores do shopping digital de Divinópolis.',
}

export const viewport: Viewport = {
  // A moldura da administração é a marquise: a barra do navegador acompanha.
  themeColor: '#18181B',
}

/**
 * Define o tema (claro/escuro) ANTES do primeiro paint, evitando flash:
 * escolha explícita (localStorage) tem prioridade; senão segue o SO.
 * Roda inline no <head> — precede a hidratação do React.
 */
const TEMA_INIT = `(function(){try{
  var t = localStorage.getItem('tema-admin');
  if (t !== 'dark' && t !== 'light') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
