'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'

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
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-6 right-6 z-50 max-w-sm"
        >
          <div
            className="rounded-2xl shadow-2xl p-5 flex items-start gap-4 relative overflow-hidden"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'var(--brick)', opacity: 0.1, filter: 'blur(40px)' }}
            />
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-ink">Conta criada com sucesso</h3>
                <Sparkles className="w-4 h-4" style={{ color: 'var(--brick)' }} />
              </div>
              <p className="text-sm text-ink-3 leading-relaxed">
                Bem-vindo à Mallevo! Sua loja está pronta. Configure os detalhes do seu negócio quando quiser.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
