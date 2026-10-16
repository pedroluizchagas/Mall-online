import { AvisoMoldura } from './aviso-moldura'

export function BannerRecebimentosPendente() {
  return (
    <AvisoMoldura
      icone="wallet"
      titulo="Configure seus recebimentos para começar a vender"
      texto="Sua loja está pronta. Falta concluir a verificação Pagar.me para receber pagamentos."
      cta={{ label: 'Configurar agora', href: '/configuracoes?aba=recebimentos' }}
    />
  )
}
