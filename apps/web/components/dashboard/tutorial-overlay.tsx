'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTemplate } from '@mallevo/lib'
import type { TemplateCodigo } from '@mallevo/lib'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { marcarTutorialVisto } from '@/lib/actions/tutorial'

type Slide = { titulo: string; texto: string; emoji: string }

const TUTORIAL_SLIDES: Record<TemplateCodigo, Slide[]> = {
  food: [
    {
      emoji: '🍽️',
      titulo: 'Bem-vindo ao Mallevo!',
      texto:
        'Sua loja é Praça de Alimentação. Vamos te mostrar os recursos otimizados para vender comida e bebida.',
    },
    {
      emoji: '🍔',
      titulo: 'Modificadores nos pratos',
      texto:
        'Adicione personalizações como ponto da carne, adicionais e retiradas. O cliente escolhe ao pedir e o preço atualiza automaticamente.',
    },
    {
      emoji: '⏱️',
      titulo: 'Tempo de preparo',
      texto:
        'Indique quanto tempo cada prato leva. O cliente vê ETA realista e fica menos ansioso esperando.',
    },
    {
      emoji: '📋',
      titulo: 'Painel de pedidos em tempo real',
      texto:
        'Pedidos chegam com som de alerta. Confirme, prepare e despache com 1 clique cada.',
    },
  ],
  fashion: [
    {
      emoji: '👗',
      titulo: 'Bem-vindo ao Mallevo!',
      texto:
        'Sua loja é Moda & Vestuário. Vamos te mostrar os recursos otimizados para vender com tamanhos e cores.',
    },
    {
      emoji: '🏷️',
      titulo: 'Grade de variações',
      texto:
        'Cadastre tamanho × cor uma vez. O sistema cria automaticamente todos os SKUs com estoque, preço e foto independentes.',
    },
    {
      emoji: '📦',
      titulo: 'Estoque por SKU',
      texto:
        'Cada combinação tem estoque próprio. Quando "M Preto" esgota, só esse SKU some — as outras cores continuam vendáveis.',
    },
    {
      emoji: '🛍️',
      titulo: 'Cliente vê foto da cor',
      texto:
        'Suba uma foto por variação e o cliente vê a peça da cor exata que está escolhendo.',
    },
  ],
  pharmacy: [
    {
      emoji: '💊',
      titulo: 'Bem-vindo ao Mallevo!',
      texto:
        'Sua loja é Farmácia. Vamos te mostrar os recursos pensados para vender medicamentos com segurança.',
    },
    {
      emoji: '📜',
      titulo: 'Registro ANVISA',
      texto:
        'Cadastre o registro ANVISA e o princípio ativo. Cliente confia mais, e você fica em conformidade.',
    },
    {
      emoji: '⚠️',
      titulo: 'Receita médica',
      texto:
        'Marque produtos que exigem receita. O cliente vê um aviso destacado no app antes de fechar o pedido.',
    },
    {
      emoji: '🩺',
      titulo: 'Categoria regulatória',
      texto:
        'Classifique cada item (MIP, Lista A/B/C). Ajuda no controle interno e em relatórios futuros.',
    },
  ],
  pet: [
    {
      emoji: '🐶',
      titulo: 'Bem-vindo ao Mallevo!',
      texto:
        'Sua loja é Pet Shop. Vamos te mostrar os recursos para vender produtos com variação de porte e peso.',
    },
    {
      emoji: '🏷️',
      titulo: 'Variação por porte',
      texto:
        'Cadastre uma coleira ou ração com porte P/M/G/GG. Cada porte tem estoque próprio.',
    },
    {
      emoji: '🐾',
      titulo: 'Espécies atendidas',
      texto:
        'Indique quais espécies o produto serve (cães, gatos, aves...). Filtra melhor para o cliente certo.',
    },
  ],
  services: [
    {
      emoji: '✂️',
      titulo: 'Bem-vindo ao Mallevo!',
      texto:
        'Sua loja é de Serviços. Vamos te mostrar os recursos para receber agendamentos online.',
    },
    {
      emoji: '👥',
      titulo: 'Cadastre profissionais',
      texto:
        'Em Configurações > Profissionais, cadastre cada pessoa que atende, com cor própria para o calendário.',
    },
    {
      emoji: '⏱️',
      titulo: 'Defina duração do serviço',
      texto:
        'Cada serviço precisa de uma duração em minutos. Os horários disponíveis são calculados automaticamente.',
    },
    {
      emoji: '📅',
      titulo: 'Agenda semanal',
      texto:
        'Em Agenda, veja todos os agendamentos da semana. Adicione bloqueios para almoço, folga e feriado.',
    },
  ],
  generic: [
    {
      emoji: '📦',
      titulo: 'Bem-vindo ao Mallevo!',
      texto: 'Vamos te mostrar os principais recursos do dashboard.',
    },
    {
      emoji: '🛍️',
      titulo: 'Cadastre seus produtos',
      texto:
        'Adicione fotos, descrição e preços. Se vender em tamanhos/cores diferentes, ative variações no produto.',
    },
    {
      emoji: '📋',
      titulo: 'Acompanhe pedidos',
      texto:
        'Pedidos chegam em tempo real. Confirme, prepare e despache pelo painel.',
    },
    {
      emoji: '💬',
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
      >
        <motion.div
          ref={containerRef}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md rounded-3xl outline-none"
          style={{
            background: 'var(--bg)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)',
          }}
        >
          <button
            type="button"
            onClick={fechar}
            disabled={pending}
            aria-label="Pular tutorial"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-bg-2"
            style={{ color: 'var(--ink-3)' }}
          >
            <X size={16} />
          </button>

          <div className="px-8 pt-10 pb-6 text-center">
            <div className="text-6xl mb-5" aria-hidden="true">
              {slide.emoji}
            </div>
            <h2
              id="tutorial-titulo"
              className="text-xl font-bold mb-3 tracking-tight"
              style={{ color: 'var(--ink)' }}
            >
              {slide.titulo}
            </h2>
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: 'var(--ink-2)' }}
            >
              {slide.texto}
            </p>
          </div>

          <div className="flex justify-center gap-1.5 pb-5" aria-hidden="true">
            {slides.map((_, i) => (
              <span
                key={i}
                className="block rounded-full transition-all"
                style={{
                  width: i === indice ? 18 : 6,
                  height: 6,
                  background:
                    i === indice ? 'var(--brick)' : 'var(--line-2)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 px-6 pb-6">
            <button
              type="button"
              onClick={anterior}
              disabled={indice === 0 || pending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-30"
              style={{ color: 'var(--ink-2)' }}
            >
              <ChevronLeft size={15} />
              Anterior
            </button>

            <button
              type="button"
              onClick={fechar}
              disabled={pending}
              className="text-[12px] font-medium underline-offset-4 hover:underline"
              style={{ color: 'var(--ink-3)' }}
            >
              Pular tutorial
            </button>

            <button
              type="button"
              onClick={proximo}
              disabled={pending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: 'var(--brick)',
                color: 'var(--brick-ink)',
              }}
            >
              {ultimo ? 'Começar a usar' : 'Próximo'}
              {!ultimo && <ChevronRight size={15} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
