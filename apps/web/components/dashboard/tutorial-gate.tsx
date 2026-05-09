'use client'

import dynamic from 'next/dynamic'

const TutorialOverlay = dynamic(
  () => import('./tutorial-overlay').then((m) => m.TutorialOverlay),
  { ssr: false },
)

/**
 * Gate client-side que decide se mostra o tutorial in-app.
 * Renderizado pelo layout do dashboard só quando o tenant ainda não
 * marcou `tutorial_template_visto = true`.
 */
export function TutorialGate({ tutorialVisto }: { tutorialVisto: boolean }) {
  if (tutorialVisto) return null
  return <TutorialOverlay />
}
