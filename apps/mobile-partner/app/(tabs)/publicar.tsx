import { tenantPodePublicar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { GatePublicacao } from '@/components/GatePublicacao'
import { TelaStub } from '@/components/TelaStub'

export default function Tela() {
  const { tenant } = useAuthStore()

  if (tenant && !tenantPodePublicar(tenant)) {
    return <GatePublicacao />
  }

  return <TelaStub titulo="Publicar" stage="Stage 7" descricao="Capture fotos e vídeos da sua loja para o Explorar." />
}
