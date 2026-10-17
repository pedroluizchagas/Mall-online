import { redirect } from 'next/navigation'
import { usuarioDaSessao } from '@/lib/acesso'
import { getMoldura } from '@/lib/consultas'
import { SidebarNav } from '@/components/admin/sidebar-nav'
import { MobileTopbar } from '@/components/admin/mobile-topbar'
import { Superficie } from '@/components/admin/superficie'
import { CommandPalette } from '@/components/admin/command-palette'
import { COMANDOS } from '@/components/admin/comandos'
import { Toaster } from '@/components/ui/toast'

/**
 * A administração é o shopping visto dos bastidores, na mesma arquitetura
 * do painel do lojista: a MOLDURA é a marquise (zinco com o neon lima
 * vazando, grão de filme), a sidebar é a portaria transparente sobre ela, e
 * o conteúdo é a FOLHA clara recortada com cantos de 24px.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const user = await usuarioDaSessao()

  if (!user) redirect('/entrar')
  if (user.app_metadata?.role !== 'admin') redirect('/entrar?erro=acesso-negado')

  const moldura = await getMoldura()

  return (
    <>
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="grao relative isolate flex h-[100dvh] overflow-hidden bg-marquee">
        <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />

        <SidebarNav
          nome={moldura.nome}
          email={moldura.email}
          horariosDasLojas={moldura.horariosDasLojas}
          entregadoresPendentes={moldura.entregadoresPendentes}
          lojasEmOutros={moldura.lojasEmOutros}
        />

        <div className="relative z-[1] flex min-w-0 flex-1 flex-col md:py-3 md:pr-3">
          <MobileTopbar />
          <main
            id="conteudo-principal"
            tabIndex={-1}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-[24px] outline-none md:rounded-[24px]"
          >
            <Superficie>{children}</Superficie>
          </main>
        </div>

        <CommandPalette comandos={COMANDOS} />
        <Toaster />
      </div>
    </>
  )
}
