import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Termos de Serviço | ProjetoHub",
  description:
    "Conheça as regras para criação de contas, participação em equipes e uso dos recursos do ProjetoHub.",
};

const sections = [
  { id: "aceitacao", label: "Aceitação" },
  { id: "conta", label: "Conta" },
  { id: "equipes", label: "Equipes" },
  { id: "conteudo", label: "Seu conteúdo" },
  { id: "drive", label: "Google Drive" },
  { id: "uso", label: "Uso responsável" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "encerramento", label: "Encerramento" },
  { id: "disposicoes", label: "Disposições finais" },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      currentPage="terms"
      eyebrow="Regras claras para colaborar"
      title="Termos de Serviço"
      description="Estes termos definem as condições para usar o ProjetoHub, participar de equipes e administrar projetos e arquivos com responsabilidade."
      updatedAt="15 de agosto de 2026"
      sections={sections}
    >
      <section id="aceitacao">
        <span className="legal-section-number">01</span>
        <h2>Aceitação e escopo</h2>
        <p>
          Ao criar uma conta ou usar o ProjetoHub, você concorda com estes Termos
          de Serviço e com a Política de Privacidade. Se você não concordar, não
          deverá utilizar a plataforma. Estes termos se aplicam aos recursos de
          contas, equipes, tarefas, comentários, relatórios, convites, arquivos e
          integrações disponibilizados pelo ProjetoHub.
        </p>
        <p>
          O ProjetoHub está em evolução. Recursos podem ser adicionados,
          alterados ou removidos para melhorar o serviço, preservar a segurança
          ou atender a requisitos legais. Mudanças relevantes nestes termos serão
          comunicadas de forma adequada.
        </p>
      </section>

      <section id="conta">
        <span className="legal-section-number">02</span>
        <h2>Conta, elegibilidade e segurança</h2>
        <p>
          Você deve fornecer informações verdadeiras, manter os dados da conta
          atualizados e proteger suas credenciais. A conta é pessoal e não deve
          ser compartilhada. Você é responsável pelas ações realizadas por meio
          dela até que informe eventual uso indevido.
        </p>
        <p>
          Crianças e adolescentes devem usar a plataforma com ciência e
          orientação de seus responsáveis e, quando aplicável, da instituição de
          ensino. O responsável pelo ambiente educacional deve garantir que o uso
          seja adequado à idade e observe o melhor interesse do estudante.
        </p>
      </section>

      <section id="equipes">
        <span className="legal-section-number">03</span>
        <h2>Equipes, funções e convites</h2>
        <p>
          Equipes possuem funções com diferentes níveis de acesso, como líder,
          co-líder, editor e leitor. Quem administra uma equipe é responsável por
          convidar apenas pessoas autorizadas, atribuir funções adequadas e
          revisar acessos quando a participação de alguém terminar.
        </p>
        <p>
          Alterações em tarefas, comentários, integrantes e configurações podem
          ser registradas no histórico da equipe. Esse registro dá transparência
          ao trabalho colaborativo e não deve ser manipulado para atribuir ações
          falsas a outra pessoa.
        </p>
        <p>
          Você deve respeitar os limites da função recebida e as decisões dos
          responsáveis pela equipe, desde que compatíveis com estes termos e com
          a lei.
        </p>
      </section>

      <section id="conteudo">
        <span className="legal-section-number">04</span>
        <h2>Conteúdo do usuário</h2>
        <p>
          Você mantém a titularidade dos textos, tarefas, comentários, imagens,
          relatórios, arquivos e demais materiais que inserir no ProjetoHub. Ao
          enviar conteúdo, você declara ter autorização para utilizá-lo e
          compartilhá-lo com os integrantes que terão acesso.
        </p>
        <p>
          Você concede ao ProjetoHub uma licença limitada, não exclusiva e pelo
          tempo necessário para armazenar, processar, exibir e transmitir esse
          conteúdo exclusivamente para operar e proteger os recursos solicitados.
          Essa licença não autoriza venda do seu conteúdo nem seu uso para
          publicidade.
        </p>
        <p>
          Antes de sair de uma equipe ou excluir conteúdo, exporte o que precisar
          preservar. Alguns registros podem permanecer quando forem necessários
          para manter a integridade do histórico da equipe ou cumprir uma
          obrigação legal.
        </p>
      </section>

      <section id="drive">
        <span className="legal-section-number">05</span>
        <h2>Integração com o Google Drive</h2>
        <p>
          A integração com o Google Drive é opcional e depende da sua autorização
          no Google. Ao utilizá-la, você também fica
          sujeito aos termos e políticas do Google e deve garantir que possui
          direito de acessar, enviar, organizar, compartilhar e baixar os
          arquivos envolvidos.
        </p>
        <p>
          O ProjetoHub não se torna proprietário dos arquivos armazenados no seu
          Drive. A disponibilidade, o espaço, o histórico, a recuperação e as
          permissões desses arquivos também dependem da conta e dos serviços do
          Google. Desconectar a integração interrompe novos acessos, mas não
          exclui automaticamente os arquivos que já estejam no Drive.
        </p>
        <div className="legal-callout">
          <strong>Confira antes de compartilhar</strong>
          <p>
            Arquivos de uma equipe podem conter dados de outras pessoas ou
            materiais protegidos. Compartilhe somente o necessário e apenas com
            quem deve ter acesso.
          </p>
        </div>
      </section>

      <section id="uso">
        <span className="legal-section-number">06</span>
        <h2>Uso responsável</h2>
        <p>Você não pode usar o ProjetoHub para:</p>
        <ul>
          <li>violar leis, direitos autorais, privacidade ou direitos de terceiros;</li>
          <li>
            publicar conteúdo ilegal, discriminatório, ameaçador, enganoso ou que
            exponha indevidamente outra pessoa;
          </li>
          <li>
            acessar contas, equipes, arquivos ou dados sem autorização, inclusive
            por fraude, engenharia social ou exploração de falhas;
          </li>
          <li>
            introduzir código malicioso, sobrecarregar a infraestrutura,
            automatizar acessos abusivos ou contornar limites de segurança;
          </li>
          <li>
            revender o serviço, extrair dados em massa ou usar a plataforma como
            rede de distribuição ou backup de arquivos fora de sua finalidade;
          </li>
          <li>representar falsamente outra pessoa ou manipular contribuições.</li>
        </ul>
        <p>
          Podemos investigar violações e restringir recursos para proteger
          usuários, equipes e infraestrutura, respeitando a legislação aplicável.
        </p>
      </section>

      <section id="disponibilidade">
        <span className="legal-section-number">07</span>
        <h2>Serviços de terceiros e disponibilidade</h2>
        <p>
          O ProjetoHub utiliza serviços de terceiros para autenticação, banco de
          dados, armazenamento e hospedagem, e pode oferecer integrações
          opcionais. Falhas, indisponibilidades ou mudanças nesses serviços podem
          afetar temporariamente determinadas funções.
        </p>
        <p>
          Trabalhamos para manter a plataforma segura e disponível, mas não
          garantimos funcionamento ininterrupto ou ausência absoluta de erros. O
          serviço pode passar por manutenção, atualização ou interrupção
          emergencial. Mantenha cópias próprias de materiais cuja perda possa
          causar impacto relevante, especialmente antes de alterações ou
          encerramento de uma equipe.
        </p>
        <p>
          Na extensão permitida pela legislação, o ProjetoHub não responde por
          danos decorrentes de uso contrário a estes termos, credenciais
          comprometidas por culpa do usuário, conteúdo de terceiros ou
          indisponibilidade fora de seu controle razoável. Nada nesta cláusula
          afasta direitos ou responsabilidades que a lei não permita limitar.
        </p>
      </section>

      <section id="encerramento">
        <span className="legal-section-number">08</span>
        <h2>Suspensão e encerramento</h2>
        <p>
          Você pode deixar de usar a plataforma e solicitar o encerramento da
          conta pelos canais disponibilizados. A exclusão de uma conta pode
          afetar atribuições, comentários e acesso às equipes; por isso, funções
          de liderança devem ser transferidas quando necessário.
        </p>
        <p>
          O acesso poderá ser suspenso ou encerrado em caso de violação destes
          termos, risco à segurança, ordem legal ou uso capaz de prejudicar outros
          usuários. Sempre que possível e adequado, informaremos o motivo e
          permitiremos a correção antes de uma medida definitiva.
        </p>
      </section>

      <section id="disposicoes">
        <span className="legal-section-number">09</span>
        <h2>Propriedade intelectual e disposições finais</h2>
        <p>
          A marca, a interface, o código e os elementos próprios do ProjetoHub são
          protegidos pela legislação aplicável. Estes termos não concedem direito
          de copiar, vender ou explorar esses elementos fora do uso normal da
          plataforma. Conteúdos enviados pelos usuários continuam sujeitos à
          seção de Conteúdo do usuário.
        </p>
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil.
          Eventuais conflitos serão tratados pelos meios e autoridades
          competentes, preservados os direitos de foro previstos na legislação
          aplicável ao usuário.
        </p>
        <p>
          Se uma cláusula for considerada inválida, as demais continuam em vigor.
          A ausência de cobrança imediata de uma obrigação não significa renúncia
          ao direito de exigi-la posteriormente.
        </p>
        <h3>Contato</h3>
        <p>
          Dúvidas ou solicitações sobre estes termos devem ser encaminhadas pelo
          canal de suporte disponibilizado no ProjetoHub. Durante a fase de
          testes, você também pode procurar diretamente o administrador
          responsável pelo seu acesso ao ambiente.
        </p>
      </section>
    </LegalPage>
  );
}
