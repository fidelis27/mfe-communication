# Spec Funcional — Sistema de Secretaria Escolar (multi-MFE)

## 1. Visão geral

Sistema de gestão para uma secretaria escolar. Permite cadastrar Instituições de
ensino e, dentro de cada Instituição, cadastrar Alunos vinculados a ela. O
sistema é usado como estudo de caso para arquitetura de micro-frontends (MFE)
com Module Federation e comunicação via eventos — por isso a decomposição em
domínios é deliberadamente mais granular do que um CRUD simples exigiria.

Requisito transversal: **todo sistema precisa estar preparado para crescer** —
em volume de dados (milhares de instituições, centenas de milhares de alunos),
em número de times/MFEs, e em número de entidades (o domínio pode ganhar
Turma, Professor, Matrícula no futuro sem redesenhar a base).

## 2. Atores

- **Super-admin** — administra o sistema como um todo: cria/edita Grupos,
  vincula Grupos a Instituições, promove ou remove admins de qualquer Grupo.
  Não é escopado por Instituição — enxerga e administra tudo.
- **Admin de Grupo** — pertence a um Grupo vinculado a uma Instituição
  específica. Pode fazer CRUD de Alunos e editar dados daquela Instituição, e
  gerenciar os membros do próprio Grupo (adicionar/remover pessoas,
  promover/rebaixar admin dentro do grupo) — mas não cria novo Grupo nem se
  auto-promove a super-admin.
- **Membro (leitura)** — pertence a um Grupo sem papel de admin; acesso
  apenas de leitura aos dados da Instituição daquele Grupo.

Identidade do usuário (quem ele é) é resolvida por uma camada de
autenticação/SSO anterior a este sistema (fora de escopo, seção 6) — este
sistema só decide, a partir dessa identidade já validada, **o que** cada
usuário pode fazer.

## 3. Domínios (bounded contexts)

| Domínio | Dono de | Responsabilidade |
|---|---|---|
| Instituição | Entidade Instituição | CRUD completo, é a única fonte de verdade sobre instituições |
| Aluno | Entidade Aluno | CRUD completo, depende de Instituição existir |
| Administração/Permissões | Pessoa (CRM interno), Grupo, Vínculo Usuário-Grupo | Cadastra as Pessoas que podem usar o sistema e controla quem pode administrar cada Instituição — não é dono de Instituição nem Aluno, só decide quem tem permissão de escrever neles |
| Atividade | Nenhuma entidade de negócio | Apenas leitura/agregação: registra e exibe "o que aconteceu, quando, quem fez" — não escreve regra de negócio de Instituição/Aluno |
| Dashboard | Nenhuma entidade | Visão agregada (contagens, indicadores), 100% projeção de dados de outros domínios |

## 4. Casos de uso

### 4.1 CRUD de Instituição
- Campos: nome, CNPJ (com validação de dígito verificador), endereço, status (ativo/inativo).
- Criar, editar, listar (paginado), inativar. Exclusão física não é permitida — ver regra de negócio 2.

### 4.2 CRUD de Aluno
- Campos: nome, matrícula (única), instituição (obrigatória, vínculo com Instituição existente e ativa), data de nascimento, status.
- Criar, editar, listar (paginado e filtrado por instituição), inativar.

### 4.3 Cadastro rápido de Instituição a partir do fluxo de Aluno
Ao cadastrar um Aluno, se a Instituição desejada não existir ainda, o usuário
pode criar a Instituição **sem sair da tela de Aluno**, via um modal. Ao salvar,
a nova Instituição é automaticamente selecionada de volta no formulário de
Aluno, e o cadastro de Aluno continua de onde parou.

Este caso de uso existe propositalmente para exercitar composição de UI entre
domínios diferentes (ver spec técnica, seção de federação de componentes).

### 4.4 Feed de atividades
Em qualquer tela (detalhe de instituição, detalhe de aluno, dashboard), o
usuário pode ver um feed de atividades recentes relacionado ao contexto atual
("Instituição X foi criada há 2 min", "Aluno Y foi editado por [usuário] às
14:32"). O feed reflete mudanças em tempo real, sem exigir F5.

### 4.5 Dashboard agregado
Visão consolidada: total de alunos por instituição, instituições ativas vs
inativas, atividade recente do sistema. Atualiza automaticamente quando dados
relevantes mudam em qualquer outro domínio.

### 4.6 Cadastro de Pessoas (CRM interno)
Super-admin cadastra uma Pessoa (nome, e-mail) antes que ela consiga usar o
sistema — o e-mail deve corresponder à identidade que a pessoa usa para
autenticar no SSO da organização. Super-admin pode inativar uma Pessoa (ela
perde acesso ao sistema imediatamente, mesmo continuando a autenticar
normalmente no SSO da empresa) e reativá-la depois. Só depois de cadastrada
e ativa, uma Pessoa pode ser adicionada a um Grupo (caso de uso 4.7).

### 4.7 Gestão de permissões (Grupos e Admins)
Super-admin cria um Grupo vinculado a uma Instituição e adiciona usuários a
ele, definindo quem é admin (pode editar) e quem é só leitura naquele Grupo.
Admin de um Grupo gerencia os membros do próprio grupo (adicionar pessoa,
promover a admin, remover, rebaixar) sem depender do super-admin para essas
operações do dia a dia — só a criação de um Grupo novo, ou a promoção de
alguém a super-admin, é exclusiva do super-admin.

## 5. Regras de negócio

1. Aluno pertence a exatamente uma Instituição — vínculo obrigatório e imutável
   após criação (trocar aluno de instituição é uma operação de transferência,
   fora de escopo nesta versão).
2. Instituição não pode ser **deletada** se houver Alunos vinculados a ela
   (bloqueio, não cascata). Instituição pode ser **inativada** mesmo com
   alunos vinculados — inativar não deleta.
3. Instituição inativa não aceita novos Alunos (validação bloqueante no
   cadastro de Aluno).
4. Mudança de status de uma Instituição (ativo → inativo) deve refletir
   visualmente em qualquer tela que já esteja mostrando Alunos daquela
   instituição, sem recarregar a página.
5. Toda operação de escrita (criar/editar/inativar) em Instituição ou Aluno
   gera um registro de atividade, de forma confiável — mesmo que o usuário
   fique feche a aba imediatamente após a ação (ver spec técnica: atividade é
   responsabilidade de backend, não do frontend).
6. Toda operação de escrita em Instituição/Aluno exige que o usuário seja
   super-admin **ou** admin do Grupo vinculado àquela Instituição — nunca
   liberado por padrão para qualquer usuário autenticado.
7. **Assunção de escopo de leitura** (ponto de partida, revisável): um
   usuário só visualiza e edita dados das Instituições cujo Grupo ele
   integra — nem leitura de outras Instituições é permitida por padrão. É o
   modelo mais restritivo; pode ser relaxado depois para "leitura global,
   escrita restrita" se o negócio precisar de visão cross-instituição para
   todo mundo.
8. Revogar o papel de admin de um usuário (ou removê-lo do Grupo) deve
   refletir no navegador dele em tempo quase real — não pode depender de
   logout/login para deixar de conseguir editar (ver spec técnica, seção de
   autorização).
9. E-mail de Pessoa é único no sistema — é a chave de correspondência com a
   identidade autenticada pelo SSO.
10. Pessoa com status inativo não consegue realizar nenhuma ação no
    sistema, mesmo que a autenticação no SSO da empresa continue válida —
    essa checagem acontece antes de qualquer autorização de Grupo (ver spec
    técnica §1.1).

## 6. Fora de escopo (nesta versão)

- Transferência de aluno entre instituições.
- Exclusão física de instituição com cascata de alunos (fica registrado como
  ideia futura, ver spec técnica).
- **Autenticação/SSO em si** (login, senha, MFA, emissão de sessão) —
  resolvida por uma camada anterior (SSO/IdP da organização). Este sistema
  consome uma identidade já autenticada e nunca reimplementa validação de
  token/sessão — é um limite arquitetural deliberado, detalhado na spec
  técnica §1.1, não uma lacuna. O que este sistema **passa a gerenciar**,
  diferente de uma versão anterior desta spec, é o cadastro da Pessoa em si
  (nome, e-mail, status) como um CRM interno — ver caso de uso 4.6.

## 7. Requisitos não-funcionais

- **Escalabilidade de dados**: listagens (Instituição e principalmente Aluno)
  devem suportar paginação/scroll infinito desde o dia 1 — não assumir que a
  lista cabe inteira em memória ou em um `<select>` simples.
- **Escalabilidade organizacional**: cada domínio (Instituição, Aluno,
  Atividade, Dashboard) deve poder ser desenvolvido, testado e implantado por
  times diferentes, em momentos diferentes, sem coordenação de deploy síncrona
  entre eles.
- **Extensibilidade de domínio**: adicionar uma nova entidade (ex: Turma,
  Professor) não deve exigir alterar o mecanismo de comunicação existente, só
  registrar novos tópicos de evento seguindo a convenção já estabelecida.
- **Confiabilidade de auditoria**: o registro de atividade não pode depender
  de o navegador do usuário ter executado JavaScript com sucesso — precisa
  sobreviver a fechamento abrupto de aba, falha de rede no client, ou acesso
  via outro client que não a UI (ex: chamada direta à API).
- **Performance percebida**: nenhuma navegação entre domínios deve exigir
  recarregar a página inteira; atualizações reativas (dashboard, feed de
  atividade) devem aparecer em tempo quase real (segundos, não minutos).
- **Revogação de acesso em tempo quase real**: se um admin remover a
  permissão de um usuário, esse usuário não deve conseguir mais editar dados
  mesmo que já esteja com a tela aberta. A garantia real vem do backend
  validando a cada request (nunca do client), mas a UI deve refletir a
  mudança sem exigir novo login, por consistência de experiência.
