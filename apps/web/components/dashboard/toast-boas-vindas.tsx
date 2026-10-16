'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PartnerIcon } from '@/components/ui/partner-icon'

export function ToastBoasVindas() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') !== '1') return

    setVisivel(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('welcome')
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })

    const timeout = setTimeout(() => setVisivel(false), 6000)
    return () => clearTimeout(timeout)
  }, [searchParams, router, pathname])

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 0, y: -24, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-6 top-6 z-[70] max-w-sm"
          role="status"
        >
          {/* A cápsula escura da casa, com o neon da marquise no canto. */}
          <div
            className="sobre-escuro relative isolate flex items-start gap-4 overflow-hidden rounded-[22px] p-5 text-white shadow-lg ring-1 ring-inset ring-[color:var(--m-line)]"
            style={{ background: 'rgba(24, 24, 27, 0.97)' }}
          >
            <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10" />
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              <PartnerIcon name="check" size={20} strokeWidth={2.6} />
            </span>
            <div>
              <p className="text-[15px] font-semibold">Sua loja está pronta.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--m-ink-2)]">
                Boas-vindas ao Mallevo. Configure os detalhes do seu negócio quando quiser — o Início mostra o que falta.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
