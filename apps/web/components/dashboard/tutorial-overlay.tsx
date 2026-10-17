'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTemplate } from '@mallevo/lib'
import type { TemplateCodigo } from '@mallevo/lib'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { marcarTutorialVisto } from '@/lib/actions/tutorial'

type Slide = { titulo: string; texto: string; icone: PartnerIconName }

const TUTORIAL_SLIDES: Record<TemplateCodigo, Slide[]> = {
  food: [
    {
      icone: 'utensils',
      titulo: 'Boas-vindas ao Mallevo',
      texto:
        'Sua loja é Praça de Alimentação. Vamos te mostrar os recursos otimizados para vender comida e bebida.',
    },
    {
      icone: 'chef',
      titulo: 'Modificadores nos pratos',
      texto:
        'Adicione personalizações como ponto da carne, adicionais e retiradas. O cliente escolhe ao pedir e o preço atualiza automaticamente.',
    },
    {
      icone: 'clock',
      titulo: 'Tempo de preparo',
      texto:
        'Indique quanto tempo cada prato leva. O cliente vê ETA realista e fica menos ansioso esperando.',
    },
    {
      icone: 'orders',
      titulo: 'Painel de pedidos em tempo real',
      texto:
        'Pedidos chegam com som de alerta. Confirme, prepare e despache com 1 clique cada.',
    },
  ],
  fashion: [
    {
      icone: 'hanger',
      titulo: 'Boas-vindas ao Mallevo',
      texto:
        'Sua loja é Moda & Vestuário. Vamos te mostrar os recursos otimizados para vender com tamanhos e cores.',
    },
    {
      icone: 'tag',
      titulo: 'Grade de variações',
      texto:
        'Cadastre tamanho × cor uma vez. O sistema cria automaticamente todos os SKUs com estoque, preço e foto independentes.',
    },
    {
      icone: 'box',
      titulo: 'Estoque por SKU',
      texto:
        'Cada combinação tem estoque próprio. Quando "M Preto" esgota, só esse SKU some — as outras cores continuam vendáveis.',
    },
    {
      icone: 'bag',
      titulo: 'Cliente vê foto da cor',
      texto:
        'Suba uma foto por variação e o cliente vê a peça da cor exata que está escolhendo.',
    },
  ],
  pharmacy: [
    {
      icone: 'pulse',
      titulo: 'Boas-vindas ao Mallevo',
      texto:
        'Sua loja é Farmácia. Vamos te mostrar os recursos pensados para vender medicamentos com segurança.',
    },
    {
      icone: 'file',
      titulo: 'Registro ANVISA',
      texto:
        'Cadastre o registro ANVISA e o princípio ativo. Cliente confia mais, e você fica em conformidade.',
    },
    {
      icone: 'info',
      titulo: 'Receita médica',
      texto:
        'Marque produtos que exigem receita. O cliente vê um aviso destacado no app antes de fechar o pedido.',
    },
    {
      icone: 'shield',
      titulo: 'Categoria regulatória',
      texto:
        'Classifique cada item (MIP, Lista A/B/C). Ajuda no controle interno e em relatórios futuros.',
    },
  ],
  pet: [
    {
      icone: 'paw',
      titulo: 'Boas-vindas ao Mallevo',
      texto:
        'Sua loja é Pet Shop. Vamos te mostrar os recursos para vender produtos com variação de porte e peso.',
    },
    {
      icone: 'tag',
      titulo: 'Variação por porte',
      texto:
        'Cadastre uma coleira ou ração com porte P/M/G/GG. Cada porte tem estoque próprio.',
    },
    {
      icone: 'paw',
      titulo: 'Espécies atendidas',
      texto:
        'Indique quais espécies o produto serve (cães, gatos, aves...). Filtra melhor para o cliente certo.',
    },
  ],
  services: [
    {
      icone: 'scissors',
      titulo: 'Boas-vindas ao Mallevo',
      texto:
        'Sua loja é de Serviços. Vamos te mostrar os recursos para receber agendamentos online.',
    },
    {
      icone: 'users',
      titulo: 'Cadastre profissionais',
      texto:
        'Em Configurações > Profissionais, cadastre cada pessoa que atende, com cor própria para o calendário.',
    },
    {
      icone: 'clock',
      titulo: 'Defina duração do serviço',
      texto:
        'Cada serviço precisa de uma duração em minutos. Os horários disponíveis são calculados automaticamente.',
    },
    {
      icone: 'calendar',
      titulo: 'Agenda semanal',
      texto:
        'Em Agenda, veja todos os agendamentos da semana. Adicione bloqueios para almoço, folga e feriado.',
    },
  ],
  generic: [
    {
      icone: 'box',
      titulo: 'Boas-vindas ao Mallevo',
      texto: 'Vamos te mostrar os principais recursos do dashboard.',
    },
    {
      icone: 'bag',
      titulo: 'Cadastre seus produtos',
      texto:
        'Adicione fotos, descrição e preços. Se vender em tamanhos/cores diferentes, ative variações no produto.',
    },
    {
      icone: 'orders',
      titulo: 'Acompanhe pedidos',
      texto:
        'Pedidos chegam em tempo real. Confirme, prepare e despache pelo painel.',
    },
    {
      icone: 'chat',
      titulo: 'Precisa de ajuda?',
      texto:
        'Em Tipo de loja você vê seu nicho atual. Para mudar, fale com nosso suporte.',
    },
  ],
}

export function TutorialOverlay() {
  const template = useTemplate()
  const slides = TUTORIAL_SLIDES[template.codigo] ?? TUTORIAL_SLIDES.generic
  const [aberto, setAberto] = useState(true)
  const [indice, setIndice] = useState(0)
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  const fechar = useCallback(() => {
    setAberto(false)
    startTransition(() => {
      void marcarTutorialVisto()
    })
  }, [])

  const proximo = useCallback(() => {
    if (indice < slides.length - 1) setIndice((i) => i + 1)
    else fechar()
  }, [indice, slides.length, fechar])

  const anterior = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1))
  }, [])

  // Esc fecha; foco inicial no container
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!aberto) return
      if (ev.key === 'Escape') {
        ev.preventDefault()
        fechar()
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault()
        proximo()
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault()
        anterior()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, proximo, anterior, fechar])

  useEffect(() => {
    if (aberto) containerRef.current?.focus()
  }, [aberto])

  if (!aberto) return null

  const slide = slides[indice]
  const ultimo = indice === slides.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(9,9,11,0.6)] p-4 backdrop-blur-[3px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
      >
        <motion.div
          ref={containerRef}
          tabIndex={-1}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md overflow-hidden rounded-[30px] bg-bg shadow-lg outline-none focus-visible:outline-none"
        >
          {/* Marquise do tutorial: o assunto do passo, aceso. */}
          <div className="sobre-escuro grao relative isolate overflow-hidden bg-marquee px-8 pb-12 pt-7 text-white">
            <div aria-hidden className="glow-marquise absolute inset-0 -z-10" />
            <div className="flex items-center justify-between">
              <p className="micro text-[color:var(--m-ink-3)]">
                Passo {indice + 1} de {slides.length}
              </p>
              <button
                type="button"
                onClick={fechar}
                disabled={pending}
                aria-label="Pular tutorial"
                className="-mr-2 flex size-8 items-center justify-center rounded-full text-[color:var(--m-ink-2)] transition-colors hover:bg-[color:var(--m-glass-2)] hover:text-white"
              >
                <PartnerIcon name="close" size={16} strokeWidth={2} />
              </button>
            </div>
            <span
              key={indice}
              className="entra mt-7 flex size-16 items-center justify-center rounded-full bg-[color:var(--m-glass)] text-[color:var(--brick)] ring-1 ring-inset ring-[color:var(--m-line)]"
            >
              <PartnerIcon name={slide.icone} size={28} strokeWidth={1.8} />
            </span>
          </div>

          <div className="-mt-6 rounded-t-[26px] bg-bg px-8 pb-2 pt-7">
            <h2 id="tutorial-titulo" className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">
              {slide.titulo}
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{slide.texto}</p>

            <div className="mt-6 flex gap-1.5" aria-hidden="true">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className="block h-1.5 rounded-full transition-all duration-500 ease-entrada"
                  style={{
                    width: i === indice ? 22 : 6,
                    background: i === indice ? 'var(--ink)' : 'var(--line-2)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-6 pb-6 pt-5">
            <button
              type="button"
              onClick={anterior}
              disabled={indice === 0 || pending}
              className="flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold text-ink-2 transition-colors hover:bg-bg-2 disabled:opacity-30"
            >
              <PartnerIcon name="chevron-left" size={15} strokeWidth={2.4} />
              Anterior
            </button>

            <button
              type="button"
              onClick={fechar}
              disabled={pending}
              className="text-[12.5px] font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              Pular tutorial
            </button>

            <button
              type="button"
              onClick={proximo}
              disabled={pending}
              className="flex h-11 items-center gap-1.5 rounded-full px-5 text-[13.5px] font-bold transition-colors bg-brick text-brick-ink hover:bg-brick-dk disabled:opacity-50"
            >
              {ultimo ? 'Começar a usar' : 'Próximo'}
              {!ultimo && <PartnerIcon name="chevron-right" size={15} strokeWidth={2.4} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
