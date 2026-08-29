import { PaginaLegal, Secao, Lista } from '@/components/legal/PaginaLegal'

export const metadata = {
  title: 'Política de Privacidade · Mallevo',
  description:
    'Como a Mallevo coleta, usa e protege os dados pessoais de quem usa a plataforma.',
  // Ver comentário em app/termos/page.tsx: mesma rota existe em todos os
  // subdomínios de loja, o canônico consolida no apex.
  alternates: { canonical: 'https://mallevo.com.br/privacidade' },
}

/**
 * ATENÇÃO — este texto descreve com precisão o que o código realmente faz
 * (levantado a partir de apps/mobile-consumer e supabase/), mas NÃO
 * substitui revisão jurídica. Antes de publicar, um advogado precisa
 * validar o conteúdo à luz da LGPD e do Código de Defesa do Consumidor.
 *
 * PENDÊNCIAS DE PREENCHIMENTO — procure por "[PREENCHER" neste arquivo:
 * razão social, CNPJ, endereço e o e-mail do encarregado de dados (DPO).
 * A LGPD (art. 41) exige que o encarregado seja identificável.
 */
export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizadoEm="28/08/2026">
      <Secao titulo="1. Quem somos">
        <p>
          A Mallevo é uma plataforma que conecta consumidores a lojas e
          prestadores de serviço locais, com entrega feita por entregadores
          parceiros. Esta política explica quais dados pessoais tratamos,
          para quê, com quem compartilhamos e como você pode exercer seus
          direitos.
        </p>
        <p>
          Controlador dos dados: [PREENCHER: razão social], inscrita no CNPJ
          sob o nº [PREENCHER: CNPJ], com sede em [PREENCHER: endereço].
        </p>
      </Secao>

      <Secao titulo="2. Dados que coletamos">
        <p>
          <strong className="text-ink">Dados que você nos fornece.</strong>{' '}
          Ao criar sua conta e usar o aplicativo:
        </p>
        <Lista
          itens={[
            'Nome e endereço de e-mail (obrigatórios no cadastro).',
            'Telefone celular (opcional; usado para contato sobre o pedido).',
            'CPF e data de nascimento (opcionais; o CPF pode ser exigido para emissão de nota fiscal pelo lojista).',
            'Foto de perfil, se você escolher enviar uma.',
            'Endereços de entrega, incluindo CEP, rua, número, complemento, bairro, cidade e estado.',
            'Observações que você escreve nos pedidos.',
          ]}
        />

        <p>
          <strong className="text-ink">
            Dados gerados pelo uso da plataforma.
          </strong>
        </p>
        <Lista
          itens={[
            'Histórico de pedidos: itens, valores, loja, status e data.',
            'Lojas que você segue e produtos que favorita.',
            'Coordenadas geográficas aproximadas dos endereços que você cadastra, obtidas automaticamente a partir do endereço digitado.',
            'Identificador do dispositivo para envio de notificações (token de push), caso você autorize notificações.',
          ]}
        />

        <p>
          <strong className="text-ink">Localização do dispositivo.</strong> Se
          você autorizar, lemos sua localização{' '}
          <strong className="text-ink">
            apenas enquanto o aplicativo está aberto
          </strong>{' '}
          e apenas no momento em que você finaliza um pedido, para avisar caso
          o endereço de entrega escolhido esteja distante de onde você está.
          Essa leitura é pontual, não é gravada em nossos servidores e não
          acompanha você em segundo plano. Recusar a permissão não impede a
          compra: o aviso simplesmente não aparece.
        </p>

        <p>
          <strong className="text-ink">
            Dados de pagamento não passam por nós.
          </strong>{' '}
          Os dados do seu cartão são enviados diretamente ao nosso processador
          de pagamentos e transformados em um código temporário (token). A
          Mallevo não recebe, não vê e não armazena o número do seu cartão.
        </p>
      </Secao>

      <Secao titulo="3. Para que usamos seus dados e com qual base legal">
        <p>
          Tratamos seus dados com as seguintes finalidades e fundamentos
          legais previstos na Lei Geral de Proteção de Dados (Lei 13.709/2018):
        </p>
        <Lista
          itens={[
            <>
              <strong className="text-ink">
                Executar o contrato (art. 7º, V):
              </strong>{' '}
              criar e manter sua conta, processar pedidos e pagamentos,
              informar o endereço de entrega ao lojista e ao entregador,
              enviar avisos sobre o andamento do pedido.
            </>,
            <>
              <strong className="text-ink">
                Cumprir obrigação legal (art. 7º, II):
              </strong>{' '}
              guardar registros de transações e informações fiscais pelos
              prazos exigidos pela legislação.
            </>,
            <>
              <strong className="text-ink">
                Legítimo interesse (art. 7º, IX):
              </strong>{' '}
              prevenir fraudes, garantir a segurança das contas e melhorar o
              funcionamento da plataforma.
            </>,
            <>
              <strong className="text-ink">
                Consentimento (art. 7º, I):
              </strong>{' '}
              acessar sua localização e enviar notificações. Você pode revogar
              essas permissões a qualquer momento nas configurações do seu
              aparelho.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>
          Não vendemos seus dados pessoais. Compartilhamos apenas o necessário
          para o serviço funcionar:
        </p>
        <Lista
          itens={[
            <>
              <strong className="text-ink">A loja do seu pedido:</strong>{' '}
              recebe seu nome, telefone, endereço de entrega, itens e
              observações — para preparar e entregar o que você comprou.
            </>,
            <>
              <strong className="text-ink">
                O entregador designado:
              </strong>{' '}
              recebe o endereço de entrega e os dados de contato necessários
              para concluir a entrega.
            </>,
            <>
              <strong className="text-ink">Pagar.me</strong> (processamento de
              pagamentos): recebe os dados necessários à cobrança.
            </>,
            <>
              <strong className="text-ink">Supabase</strong> (infraestrutura de
              banco de dados, autenticação e armazenamento de arquivos):
              hospeda os dados da plataforma.
            </>,
            <>
              <strong className="text-ink">Expo</strong> (serviço de
              notificações): recebe o token do seu aparelho para entregar os
              avisos de pedido.
            </>,
            <>
              <strong className="text-ink">
                ViaCEP e OpenStreetMap/Nominatim:
              </strong>{' '}
              recebem o CEP ou o endereço digitado para completar o
              preenchimento e obter as coordenadas aproximadas. Não enviamos
              seu nome nem qualquer identificador seu nessas consultas.
            </>,
            <>
              <strong className="text-ink">Autoridades públicas:</strong>{' '}
              quando houver ordem judicial ou obrigação legal.
            </>,
          ]}
        />
        <p>
          Alguns desses serviços mantêm servidores fora do Brasil. Nesses
          casos, a transferência ocorre com base nas hipóteses do art. 33 da
          LGPD.
        </p>
      </Secao>

      <Secao titulo="5. Por quanto tempo guardamos">
        <p>
          Mantemos seus dados de cadastro enquanto sua conta existir. Os
          registros de pedidos são mantidos pelos prazos exigidos pela
          legislação fiscal e civil, ainda que você exclua sua conta — nesse
          caso, sem os dados que identificam você.
        </p>
      </Secao>

      <Secao titulo="6. Seus direitos">
        <p>
          A LGPD garante a você o direito de confirmar a existência de
          tratamento, acessar seus dados, corrigir dados incompletos ou
          desatualizados, solicitar anonimização ou eliminação, pedir a
          portabilidade, revogar consentimento e se opor a tratamentos
          irregulares.
        </p>
        <p>
          <strong className="text-ink">Na prática, no aplicativo:</strong> você
          consulta e corrige seus dados em Perfil › Editar perfil, gerencia
          seus endereços em Perfil › Endereços, e pode excluir sua conta em
          Perfil › Excluir minha conta.
        </p>
        <p>
          Ao excluir a conta, apagamos definitivamente seu nome, telefone,
          CPF, data de nascimento, foto e endereços, e removemos seu acesso à
          plataforma. Seus pedidos anteriores permanecem registrados{' '}
          <strong className="text-ink">sem identificação</strong>, por
          obrigação fiscal do lojista. Essa ação não pode ser desfeita.
        </p>
      </Secao>

      <Secao titulo="7. Segurança">
        <p>
          O acesso aos dados é protegido por autenticação e por regras que
          limitam cada usuário aos seus próprios registros. O tráfego entre o
          aplicativo e nossos servidores é criptografado. Nenhum sistema é
          totalmente imune a incidentes; se ocorrer um incidente relevante,
          comunicaremos você e a Autoridade Nacional de Proteção de Dados nos
          termos da lei.
        </p>
      </Secao>

      <Secao titulo="8. Crianças e adolescentes">
        <p>
          A plataforma não se destina a menores de 13 anos. O cadastro de
          menores de 18 anos deve ser feito com o consentimento e sob a
          supervisão dos pais ou responsáveis legais.
        </p>
      </Secao>

      <Secao titulo="9. Mudanças nesta política">
        <p>
          Podemos atualizar este documento. Quando a mudança for significativa,
          avisaremos pelo aplicativo ou por e-mail. A data de atualização
          aparece no topo desta página.
        </p>
      </Secao>

      <Secao titulo="10. Fale com a gente">
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale
          com o nosso encarregado de proteção de dados pelo e-mail{' '}
          <strong className="text-ink">[PREENCHER: e-mail do DPO]</strong>.
          Responderemos no prazo previsto em lei.
        </p>
      </Secao>
    </PaginaLegal>
  )
}
