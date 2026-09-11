import { FeedReels } from '@/components/explorar/FeedReels'

/**
 * Explorar — o feed de reels do shopping inteiro. Toda a mecânica vive em
 * `components/explorar/FeedReels.tsx`, compartilhada com o Seguindo (que é
 * este mesmo feed filtrado pelas lojas seguidas).
 *
 * Spec: docs/system-design/consumer/07-telas.md §Explorar
 */
export default function TelaExplorar() {
  return <FeedReels titulo="Explorar" />
}
