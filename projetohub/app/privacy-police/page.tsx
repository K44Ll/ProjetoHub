import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade | ProjetoHub",
  description:
    "Saiba quais dados o ProjetoHub trata, por que eles são usados e quais são os seus direitos.",
};

const sections = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "dados", label: "Dados tratados" },
  { id: "uso", label: "Como usamos" },
  { id: "drive", label: "Google Drive" },
  { id: "compartilhamento", label: "Compartilhamento" },
  { id: "retencao", label: "Retenção e segurança" },
  { id: "direitos", label: "Seus direitos" },
  { id: "contato", label: "Contato" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      currentPage="privacy"
      eyebrow="Seus dados, com transparência"
      title="Política de Privacidade"
      description="Esta política explica como o ProjetoHub trata dados pessoais durante o uso da plataforma, incluindo contas, equipes, projetos e integrações que você decidir ativar."
      updatedAt="15 de agosto de 2026"
      sections={sections}
    >
      <section id="visao-geral">
        <span className="legal-section-number">01</span>
        <h2>Visão geral e alcance</h2>
        <p>
          O ProjetoHub é uma plataforma de organização colaborativa de equipes e
          projetos. Esta Política de Privacidade se aplica aos dados tratados
          quando você cria uma conta, participa de uma equipe, organiza tarefas,
          interage com outros integrantes ou utiliza uma integração disponível.
        </p>
        <p>
          O tratamento observa a legislação brasileira aplicável, em especial a
          Lei Geral de Proteção de Dados Pessoais (LGPD). Ao usar o ProjetoHub,
          você reconhece que leu esta política. Quando o consentimento for a base
          adequada, ele será solicitado de maneira específica e poderá ser
          retirado posteriormente.
        </p>
      </section>

      <section id="dados">
        <span className="legal-section-number">02</span>
        <h2>Quais dados são tratados</h2>
        <p>O ProjetoHub pode tratar as categorias abaixo, conforme o seu uso:</p>
        <ul>
          <li>
            <strong>Conta e perfil:</strong> nome, endereço de e-mail,
            identificador da conta e dados necessários para autenticação e
            recuperação de acesso.
          </li>
          <li>
            <strong>Equipes e projetos:</strong> nome e descrição da equipe,
            disciplina, tema, professor, datas de entrega, integrantes, funções,
            convites e foto da equipe.
          </li>
          <li>
            <strong>Trabalho colaborativo:</strong> tarefas, responsáveis,
            prioridades, prazos, estados, entregas, comentários, relatórios e
            histórico de atividades.
          </li>
          <li>
            <strong>Dados técnicos e de sessão:</strong> cookies essenciais,
            registros necessários para autenticação, segurança, diagnóstico de
            falhas e funcionamento da aplicação.
          </li>
          <li>
            <strong>Integrações:</strong> dados estritamente necessários para a
            conexão com um serviço externo que você escolher ativar, conforme
            descrito nesta política.
          </li>
        </ul>
        <p>
          Não solicitamos dados pessoais sensíveis como condição normal de uso.
          Evite incluir esse tipo de informação em nomes de equipes, comentários,
          tarefas, arquivos ou outros campos livres.
        </p>
      </section>

      <section id="uso">
        <span className="legal-section-number">03</span>
        <h2>Como e por que usamos os dados</h2>
        <p>Os dados são tratados para:</p>
        <ul>
          <li>criar e proteger a sua conta e manter a sessão autenticada;</li>
          <li>permitir a criação e a administração de equipes e projetos;</li>
          <li>
            mostrar tarefas, prazos, contribuições e histórico aos integrantes
            autorizados da equipe;
          </li>
          <li>enviar e validar convites e comunicações ligadas ao serviço;</li>
          <li>
            prevenir uso indevido, investigar falhas e melhorar segurança,
            estabilidade e acessibilidade;
          </li>
          <li>cumprir obrigações legais e responder a solicitações legítimas.</li>
        </ul>
        <h3>Bases legais</h3>
        <p>
          Conforme o caso, o tratamento poderá se apoiar na execução do serviço
          solicitado por você, no cumprimento de obrigação legal, no exercício
          regular de direitos, no legítimo interesse avaliado com respeito às
          suas liberdades ou no consentimento. A base aplicável depende da
          finalidade e do contexto de cada operação.
        </p>
        <h3>Visibilidade dentro das equipes</h3>
        <p>
          Informações de uma equipe são compartilhadas com os integrantes que
          tenham acesso a ela, de acordo com suas funções — líder, co-líder,
          editor ou leitor. Ações realizadas no projeto podem aparecer no
          histórico para dar transparência ao trabalho colaborativo. Não publique
          dados que não devam ser vistos por esses integrantes.
        </p>
      </section>

      <section id="drive">
        <span className="legal-section-number">04</span>
        <h2>Integração com o Google Drive</h2>
        <div className="legal-callout">
          <strong>Uma escolha do usuário</strong>
          <p>
            A integração somente é ativada após sua autorização na tela do Google
            e pode ser desconectada pela liderança da equipe.
          </p>
        </div>
        <p>
          Se você conectar o Google Drive, o ProjetoHub solicita apenas as
          permissões necessárias para permitir ações como criar, selecionar,
          enviar, organizar ou baixar arquivos vinculados à equipe. O acesso será
          limitado aos arquivos criados, selecionados ou compartilhados com a
          aplicação, de acordo com as permissões apresentadas pelo Google.
        </p>
        <p>
          Dados obtidos pelas APIs do Google serão usados exclusivamente para
          oferecer e proteger os recursos de arquivos solicitados por você. Eles
          não serão vendidos, usados para publicidade, definição de perfil
          publicitário, concessão de crédito ou qualquer finalidade sem relação
          com a funcionalidade autorizada. Também não serão transferidos a
          terceiros, exceto quando necessário para operar ou proteger o recurso,
          cumprir a lei ou executar uma ação expressamente solicitada por você.
        </p>
        <p>
          Ao desconectar a integração, novos acessos deixam de ser realizados.
          Arquivos já existentes permanecem na sua conta do Google Drive e podem
          ser administrados ou excluídos diretamente por você no Google. A
          desconexão também pode ser feita nas configurações de segurança da sua
          Conta Google.
        </p>
      </section>

      <section id="compartilhamento">
        <span className="legal-section-number">05</span>
        <h2>Compartilhamento e operadores</h2>
        <p>
          O ProjetoHub não vende dados pessoais. Para manter a plataforma em
          funcionamento, informações podem ser tratadas por fornecedores de
          infraestrutura e tecnologia, sempre limitadas à finalidade do serviço:
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> autenticação, banco de dados e
            armazenamento de arquivos da aplicação;
          </li>
          <li>
            <strong>Vercel:</strong> hospedagem, entrega e operação da aplicação;
          </li>
          <li>
            <strong>Google:</strong> somente quando você ativar recursos ligados
            ao Google Drive.
          </li>
        </ul>
        <p>
          Dados também poderão ser compartilhados para cumprir ordem judicial,
          obrigação legal ou proteger direitos e segurança. Alguns fornecedores
          podem operar infraestrutura fora do Brasil. Nesses casos, buscamos
          adotar salvaguardas e fornecedores compatíveis com a legislação
          aplicável.
        </p>
      </section>

      <section id="retencao">
        <span className="legal-section-number">06</span>
        <h2>Retenção, exclusão e segurança</h2>
        <p>
          Os dados são mantidos pelo período necessário para prestar o serviço,
          preservar a integridade dos projetos, cumprir obrigações legais e
          exercer direitos. O prazo pode variar conforme o tipo de dado e a
          relação do usuário com uma equipe. Após o encerramento da finalidade,
          os dados serão excluídos, anonimizados ou mantidos apenas quando a lei
          permitir ou exigir.
        </p>
        <p>
          Empregamos medidas técnicas e organizacionais razoáveis para proteger
          contas e informações contra acesso, alteração, perda ou divulgação não
          autorizada. Nenhum sistema é totalmente imune a riscos; por isso, use
          uma senha exclusiva, proteja seus dispositivos e informe qualquer
          atividade suspeita assim que possível.
        </p>
        <h3>Cookies e armazenamento local</h3>
        <p>
          A aplicação utiliza cookies necessários para autenticação e segurança.
          Também pode usar armazenamento local do navegador para lembrar
          preferências estritamente funcionais, como o tema visual escolhido. Não
          usamos essa preferência para publicidade comportamental.
        </p>
      </section>

      <section id="direitos">
        <span className="legal-section-number">07</span>
        <h2>Seus direitos</h2>
        <p>
          Nos termos da LGPD e conforme aplicável ao caso, você pode solicitar:
        </p>
        <ul>
          <li>confirmação da existência de tratamento e acesso aos dados;</li>
          <li>correção de informações incompletas, inexatas ou desatualizadas;</li>
          <li>
            anonimização, bloqueio ou eliminação de dados desnecessários,
            excessivos ou tratados em desconformidade;
          </li>
          <li>portabilidade, quando regulamentada e tecnicamente aplicável;</li>
          <li>
            informação sobre compartilhamentos e sobre a possibilidade de negar
            consentimento;
          </li>
          <li>revogação do consentimento e eliminação dos dados relacionados;</li>
          <li>revisão de decisões tomadas unicamente por meios automatizados.</li>
        </ul>
        <p>
          Poderemos pedir informações adicionais para confirmar sua identidade e
          proteger a conta antes de atender à solicitação. Certos dados podem ser
          preservados quando houver obrigação legal ou outra hipótese autorizada.
        </p>
        <h3>Crianças e adolescentes</h3>
        <p>
          O ProjetoHub pode ser usado em contexto educacional. Crianças e
          adolescentes devem utilizar a plataforma com ciência e orientação de
          seus responsáveis e, quando aplicável, da instituição de ensino. O
          tratamento desse público deve observar seu melhor interesse e as
          exigências legais pertinentes.
        </p>
      </section>

      <section id="contato">
        <span className="legal-section-number">08</span>
        <h2>Alterações e contato</h2>
        <p>
          Esta política poderá ser atualizada para acompanhar mudanças na
          plataforma, nas integrações ou na legislação. A data no início do
          documento indicará a versão mais recente, e alterações relevantes serão
          comunicadas de forma adequada dentro da aplicação.
        </p>
        <p>
          Solicitações sobre privacidade e exercício de direitos devem ser
          encaminhadas pelo canal de suporte disponibilizado no ProjetoHub.
          Durante a fase de testes, você também pode procurar diretamente o
          administrador responsável pelo seu acesso ao ambiente.
        </p>
      </section>
    </LegalPage>
  );
}
