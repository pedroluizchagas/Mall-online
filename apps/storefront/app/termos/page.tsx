import { PaginaLegal, Secao, Lista } from '@/components/legal/PaginaLegal'

export const metadata = {
  title: 'Termos de Uso · Mallevo',
  description:
    'Regras de uso da plataforma Mallevo para consumidores, lojas e entregadores.',
  // A rota existe em todo host do storefront, inclusive nos subdomínios de
  // loja. O canônico aponta para o apex para os buscadores não tratarem a
  // mesma página em dezenas de subdomínios como conteúdo duplicado.
  alternates: { canonical: 'https://mallevo.com.br/termos' },
}

/**
 * ATENÇÃO — rascunho fiel ao funcionamento real da plataforma, mas que NÃO
 * substitui revisão jurídica. Um advogado precisa validá-lo à luz do Código
 * de Defesa do Consumidor e do Marco Civil da Internet antes de publicar.
 *
 * PENDÊNCIAS DE PREENCHIMENTO — procure por "[PREENCHER" neste arquivo:
 * razão social, CNPJ, endereço, e-mail de contato e comarca do foro.
 */
export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizadoEm="28/08/2026">
      <Secao titulo="1. Sobre estes termos">
        <p>
          Este documento regula o uso da plataforma Mallevo, operada por
          [PREENCHER: razão social], CNPJ [PREENCHER: CNPJ], com sede em
          [PREENCHER: endereço]. Ao criar uma conta ou fazer um pedido, você
          concorda com estas regras.
        </p>
      </Secao>

      <Secao titulo="2. O que a Mallevo é (e o que não é)">
        <p>
          A Mallevo é um <strong className="text-ink">intermediário</strong>:
          aproximamos você das lojas e prestadores de serviço cadastrados e
          organizamos a entrega por entregadores parceiros. Não fabricamos,
          não preparamos e não vendemos os produtos anunciados.
        </p>
        <p>
          A responsabilidade pelo produto ou serviço — qualidade, quantidade,
          preço, prazo de preparo, informações de rótulo, validade e emissão
          da nota fiscal — é da loja que o oferece. Isso não afasta os direitos
          que o Código de Defesa do Consumidor assegura a você perante toda a
          cadeia de fornecimento.
        </p>
      </Secao>

      <Secao titulo="3. Sua conta">
        <Lista
          itens={[
            'Você precisa fornecer informações verdadeiras e mantê-las atualizadas. Endereço incorreto é a causa mais comum de entrega frustrada.',
            'A conta é pessoal e intransferível. Você é responsável por manter sua senha em sigilo e pelas ações feitas com ela.',
            'É necessário ter ao menos 18 anos para contratar sozinho. Entre 13 e 18 anos, o uso depende do consentimento e da supervisão dos responsáveis legais.',
            'Você pode excluir sua conta a qualquer momento pelo aplicativo, em Perfil › Excluir minha conta.',
          ]}
        />
      </Secao>

      <Secao titulo="4. Pedidos e pagamento">
        <p>
          O pedido só é confirmado após a aprovação do pagamento. Aceitamos
          cartão de crédito e Pix, ambos processados pelo nosso parceiro de
          pagamentos — a Mallevo não armazena os dados do seu cartão.
        </p>
        <p>
          Os preços, a taxa de entrega e o prazo estimado aparecem antes da
          confirmação. O prazo é uma estimativa e pode variar com o volume de
          pedidos, o trânsito e as condições climáticas.
        </p>
        <p>
          A loja pode recusar um pedido — por falta do item, por estar fora do
          horário de funcionamento ou por impossibilidade de atender ao
          endereço. Nesse caso o valor pago é devolvido integralmente pelo
          mesmo meio de pagamento.
        </p>
      </Secao>

      <Secao titulo="5. Cancelamento, devolução e arrependimento">
        <p>
          Você pode cancelar um pedido{' '}
          <strong className="text-ink">antes de a loja iniciar o preparo</strong>{' '}
          e receber o valor de volta integralmente. Depois disso, o
          cancelamento depende da concordância da loja, já que o item pode
          estar em produção.
        </p>
        <p>
          O direito de arrependimento previsto no art. 49 do Código de Defesa
          do Consumidor — sete dias contados do recebimento — aplica-se às
          compras feitas fora do estabelecimento. Ele{' '}
          <strong className="text-ink">não se aplica</strong> a produtos
          perecíveis, preparados sob encomenda ou personalizados, cuja natureza
          impede a devolução.
        </p>
        <p>
          Se o pedido chegar errado, incompleto ou em más condições, registre a
          ocorrência pelo aplicativo assim que possível para que a loja possa
          resolver.
        </p>
      </Secao>

      <Secao titulo="6. Entrega">
        <p>
          A entrega é feita no endereço que você selecionar no momento da
          compra. É sua responsabilidade conferir esse endereço — o aplicativo
          avisa quando o endereço escolhido está distante da sua localização
          atual, mas a escolha final é sua.
        </p>
        <p>
          Se não houver ninguém para receber no endereço informado, ou se o
          acesso estiver impedido, a entrega pode ser encerrada sem devolução
          do valor do produto já preparado.
        </p>
      </Secao>

      <Secao titulo="7. Agendamentos">
        <p>
          Serviços agendados são prestados presencialmente no estabelecimento,
          na data e horário escolhidos. Remarcações e cancelamentos seguem a
          política da loja responsável, informada no momento do agendamento.
        </p>
      </Secao>

      <Secao titulo="8. Uso adequado">
        <p>Ao usar a plataforma, você concorda em não:</p>
        <Lista
          itens={[
            'Fornecer dados falsos ou usar meios de pagamento de terceiros sem autorização.',
            'Fazer pedidos com intenção de fraude, trote ou de prejudicar lojas e entregadores.',
            'Publicar conteúdo ofensivo, discriminatório ou ilegal em avaliações e comentários.',
            'Tentar acessar áreas restritas, contas de outras pessoas ou interferir no funcionamento dos sistemas.',
          ]}
        />
        <p>
          O descumprimento pode levar à suspensão ou ao encerramento da conta,
          sem prejuízo das medidas legais cabíveis.
        </p>
      </Secao>

      <Secao titulo="9. Conteúdo publicado por você">
        <p>
          Avaliações, comentários e fotos que você publica continuam sendo
          seus. Ao publicá-los, você autoriza a Mallevo a exibi-los na
          plataforma. Podemos remover conteúdo que viole estes termos ou a lei.
        </p>
      </Secao>

      <Secao titulo="10. Disponibilidade do serviço">
        <p>
          Trabalhamos para manter a plataforma no ar, mas ela pode ficar
          indisponível por manutenção, falhas técnicas ou causas fora do nosso
          controle. Não garantimos funcionamento ininterrupto.
        </p>
      </Secao>

      <Secao titulo="11. Privacidade">
        <p>
          O tratamento dos seus dados pessoais é descrito na nossa Política de
          Privacidade, que é parte integrante destes termos.
        </p>
      </Secao>

      <Secao titulo="12. Alterações">
        <p>
          Podemos alterar estes termos. Mudanças relevantes serão comunicadas
          pelo aplicativo ou por e-mail com antecedência razoável. Continuar
          usando a plataforma após a alteração significa concordar com a nova
          versão.
        </p>
      </Secao>

      <Secao titulo="13. Contato e foro">
        <p>
          Fale com a gente pelo e-mail [PREENCHER: e-mail de contato].
          Buscaremos resolver qualquer questão de forma amigável.
        </p>
        <p>
          Estes termos são regidos pela lei brasileira. Fica eleito o foro da
          comarca de [PREENCHER: comarca], sem prejuízo do direito do
          consumidor de demandar no foro do seu domicílio, nos termos do art.
          101, I, do Código de Defesa do Consumidor.
        </p>
      </Secao>
    </PaginaLegal>
  )
}
