# ProjetoHub

Organização de trabalhos em grupo com responsabilidades claras, prazos visíveis e contribuições registradas.

O ProjetoHub reúne equipes, tarefas, entregas e histórico em um único espaço. Líderes distribuem o trabalho, participantes acompanham suas responsabilidades e o grupo consegue identificar atrasos e gerar um relatório final baseado no que realmente aconteceu durante o projeto.

> O sistema não preenche o painel com dados demonstrativos. Equipes, tarefas, atividades e relatórios exibidos vêm do Supabase e pertencem ao usuário autenticado.

## Principais recursos

- Cadastro e login com confirmação de e-mail.
- Página inicial com equipes, projetos pendentes, próximas entregas e tarefas do usuário.
- Criação de equipes com nome, matéria, tema, professor, descrição, foto e data de entrega.
- Entrada de participantes por link de convite com validade, limite de usos e função predefinida.
- Hierarquia de permissões com leitor, editor, colíder e líder.
- Distribuição de tarefas por participante, com descrição, prioridade e prazo próprio.
- Envio de entregas para revisão e aprovação pela liderança.
- Comentários vinculados às tarefas.
- Avisos nominais para tarefas atrasadas, deixando claro quem precisa agir.
- Histórico de criação, entregas, comentários, alterações e relatórios.
- Relatórios de contribuição gerados a partir dos registros reais da equipe.
- Fotos privadas de equipe armazenadas no Supabase Storage.
- Sete temas: Light, Dark, Dark OLED, Neon, Tokyo Lights, Black Green e Black Purple.

## Hierarquia da equipe

| Função | Permissões |
| --- | --- |
| Leitor | Consulta equipe, tarefas, atividades e relatórios. |
| Editor | Também comenta e envia as próprias tarefas para revisão. |
| Colíder | Também cria convites, distribui tarefas, revisa entregas e gera relatórios. |
| Líder | Possui todas as permissões e administra funções e participantes. |

Cada equipe possui um único líder. Novos participantes entram com a função definida no convite, e somente o líder pode promover, rebaixar ou remover integrantes.

## Fluxo de uso

1. O líder cria uma equipe e informa os detalhes do trabalho.
2. Gera um link de convite escolhendo função, validade e quantidade de entradas.
3. Os participantes confirmam suas contas e entram pelo link.
4. Líderes e colíderes atribuem tarefas com responsáveis e prazos.
5. Editores enviam suas entregas, recebem comentários e aguardam revisão.
6. O painel destaca atrasos e mantém o histórico do processo.
7. Ao final, a liderança gera um relatório com tarefas atribuídas, concluídas, atrasadas e comentários de cada participante.

## Tecnologias

- [Next.js 16](https://nextjs.org/) com App Router e Server Actions.
- [React 19](https://react.dev/) e TypeScript.
- [Tailwind CSS 4](https://tailwindcss.com/).
- [Supabase](https://supabase.com/) para autenticação, PostgreSQL, Storage e Row Level Security.
- [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) para sessões no servidor e no navegador.

Os relatórios atuais são determinísticos e usam exclusivamente os registros do banco. A configuração do OpenRouter é opcional e está reservada para futuras funcionalidades que realmente precisem de IA.

## Estrutura do repositório

```text
ProjetoHub/
├── README.md
└── projetohub/
    ├── app/                  # Rotas, páginas e Server Actions
    ├── components/           # Autenticação, painel, equipes e temas
    ├── email-templates/      # Confirmação de cadastro do Supabase
    ├── lib/                  # Consultas reais do painel e das equipes
    ├── supabase/migrations/  # Schema, RLS, funções, gatilhos e Storage
    ├── types/                # Tipos da aplicação e do banco
    └── utils/supabase/       # Clientes para browser, servidor e proxy
```

## Executando localmente

### Requisitos

- Node.js em uma versão LTS atual.
- npm.
- Um projeto no Supabase.

### 1. Clone e instale

```bash
git clone https://github.com/K44Ll/ProjetoHub.git
cd ProjetoHub/projetohub
npm install
```

### 2. Configure o ambiente

Crie `.env.local` no diretório atual (`projetohub/`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel

# Opcionais: ainda não são necessários para os relatórios atuais
OPENROUTER_KEY=sua_chave
OPENROUTER_MODEL=seu_modelo
```

Nunca envie `.env.local` ao Git. Os arquivos de ambiente já estão ignorados pelo projeto.

### 3. Prepare o Supabase

Vincule o projeto e aplique as migrações:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

As migrações criam:

- perfis, equipes, participantes, convites, tarefas e comentários;
- histórico de atividades e relatórios de contribuição;
- funções seguras para aceitar convites, entregar tarefas e gerar relatórios;
- políticas de Row Level Security para cada nível da hierarquia;
- bucket privado `team-photos`, com limite de 5 MB para JPG, PNG e WebP.

No Supabase, configure também o template de confirmação usando [`projetohub/email-templates/confirmacao-cadastro.html`](projetohub/email-templates/confirmacao-cadastro.html).

### 4. Inicie o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Compila e valida a versão de produção. |
| `npm run start` | Executa a compilação de produção. |
| `npm run lint` | Verifica qualidade, React e TypeScript. |

## Segurança e integridade dos dados

- Todas as tabelas da aplicação usam Row Level Security.
- Consultas são limitadas às equipes das quais o usuário participa.
- Operações administrativas verificam a função atual no banco, não apenas na interface.
- Convites usam tokens UUID, expiração, limite de uso e revogação.
- Arquivos de equipe ficam em um bucket privado e são acessados por URLs temporárias.
- Prazos de tarefas não podem ultrapassar a entrega da equipe.
- Tarefas só podem ser atribuídas a membros com permissão de contribuição no momento da atribuição.
- O líder original não pode ser removido ou perder a liderança por uma simples alteração de função.
- Relatórios registram números verificáveis; não existem percentuais de contribuição inventados.

## Verificações realizadas

O projeto foi validado com:

```bash
npm run lint
npm run build
```

Também foram verificados os fluxos de criação de equipe, liderança automática, convite, tarefa, comentário, entrega, aprovação, histórico e relatório em uma transação revertida ao final. Assim, nenhum registro de teste permanece no banco.

## Deploy

Na Vercel, use `projetohub` como diretório raiz do projeto e cadastre as mesmas variáveis de ambiente utilizadas localmente. Depois, inclua o domínio publicado na lista de URLs permitidas do Supabase Auth para que confirmações de e-mail e retornos de convite funcionem corretamente.

