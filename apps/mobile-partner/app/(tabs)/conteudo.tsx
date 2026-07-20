import { tenantPodePublicar } from '@mallevo/lib'
import { useAuthStore } from '@/store/useAuthStore'
import { GatePublicacao } from '@/components/GatePublicacao'
import { TelaStub } from '@/components/TelaStub'

export default function Tela() {
  const { tenant } = useAuthStore()

  if (tenant && !tenantPodePublicar(tenant)) {
    return <GatePublicacao />
  }

  return <TelaStub titulo="Meu conteúdo" stage="Stage 8" descricao="Seus posts publicados, com views e curtidas." />
}
