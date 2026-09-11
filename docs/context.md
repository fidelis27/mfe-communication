# Contexto do produto

## 0. Instrucoes para a IA

Atue como um desenvolvedor senior full-stack, especialista em React,
TypeScript, Node.js, APIs REST, arquitetura de microfrontends e comunicacao
por eventos. Atue tambem como um arquiteto pragmatico: priorize valor de
negocio, simplicidade, verificabilidade e evolucao segura.

### Comportamento esperado

- Leia o contexto, as specs e o codigo existente antes de propor mudancas.
- Diferencie fatos observados, decisoes aprovadas, hipoteses e perguntas em
	aberto.
- Faca perguntas objetivas quando houver ambiguidade que altere o escopo,
	contrato, seguranca ou criterio de aceite.
- Nao implemente codigo, instale dependencias ou altere configuracoes antes da
	aprovacao explicita das tres especificacoes.
- Depois da aprovacao, implemente uma fatia vertical por vez, mantendo as
	mudancas pequenas e rastreaveis.
- Prefira as convencoes e abstracoes ja existentes no repositorio; evite
	refatoracoes nao relacionadas ao objetivo.
- Explique trade-offs entre velocidade do prototipo, qualidade, seguranca e
	evolucao para producao.
- Para cada mudanca aprovada, indique o requisito atendido e a validacao
	executada.
- Sempre valide o comportamento com testes, compilacao ou verificacao manual
	adequada ao tipo de alteracao.
- Nunca trate um prototipo funcional como pronto para producao sem registrar
	seus limites, riscos e trabalho restante.

### Ordem de trabalho

1. Entender o problema e identificar ambiguidades.
2. Registrar contexto, requisitos, estados, criterios de aceite e riscos.
3. Revisar e aprovar as specs.
4. Planejar arquivos, contratos, testes e fatias de implementacao.
5. Implementar somente apos a aprovacao.
6. Testar, revisar o diff e atualizar a documentacao quando uma decisao mudar.

## 1. Resumo executivo

Construir um protótipo de um sistema de secretaria escolar para gestão de
instituições de ensino e estudantes. O produto será organizado como um
ecossistema de microfrontends (MFEs), com comunicação entre domínios por meio
de eventos.

O objetivo do protótipo é validar a separação de responsabilidades, o fluxo
principal de secretaria e os contratos de integração entre MFEs. A solução
deve ser simples o suficiente para ser demonstrada em dois dias de trabalho
(aproximadamente 16 horas), mas manter limites de domínio que possam evoluir
para um produto real.

## 2. Público e problema

### Público primário

- Secretários e operadores de uma instituição de ensino.
- Administradores responsáveis por usuários, grupos e permissões.

### Problema

Uma secretaria precisa consultar e manter instituições e estudantes em um
único fluxo operacional, com controle de acesso e possibilidade de acompanhar
as alterações realizadas. Os módulos devem poder evoluir e ser implantados por
equipes diferentes sem criar dependência direta entre suas telas.

## 3. Escopo funcional identificado

O repositório indica os seguintes bounded contexts:

- **Instituições:** cadastro, consulta, edição e inativação de instituições;
	validação de CNPJ pode fazer parte do fluxo.
- **Estudantes:** cadastro e manutenção de estudantes vinculados a uma
	instituição; listagem paginada e filtros por instituição.
- **Administração:** usuários, grupos e associação de membros, incluindo
	papéis de administrador e membro.
- **Atividades:** feed somente leitura formado a partir de eventos de domínio.
- **Dashboard:** indicadores e agregações atualizados por eventos.

O fluxo mínimo é:

1. Usuário autenticado acessa o shell da secretaria.
2. Usuário consulta ou seleciona uma instituição.
3. Usuário autorizado cadastra ou edita um estudante vinculado à instituição.
4. O backend persiste a alteração e publica um evento de domínio.
5. Activity e Dashboard atualizam suas projeções ou indicadores.

## 4. Estado atual do protótipo

Estas informações foram obtidas por engenharia reversa do repositório:

- O host lista os cinco MFEs, mas atualmente entrega páginas HTML de exemplo;
	ainda não compõe MFEs reais em runtime.
- `mfe-student` possui somente uma tela React demonstrativa.
- O pacote compartilhado declara tipos para eventos de instituição e
	estudante, mas não existe produtor, consumidor, transporte ou persistência
	de eventos.
- O backend Express possui health check, autenticação demonstrativa por
	`x-demo-user` e uma rota PUT de exemplo para instituição.
- A persistência disponível é em memória.
- A autorização já modela superadministrador, administrador e membro por
	instituição/grupo.
- A documentação de arquitetura recomenda Module Federation e WebSocket ou
	pub/sub, mas isso ainda precisa ser implementado ou reduzido a uma decisão
	explícita de MVP.

Portanto, o estado atual é um esqueleto arquitetural com alguns contratos de
domínio e middleware, e não um sistema funcional completo.

## 5. Objetivo técnico

Validar uma arquitetura de microfrontends integrados por contratos estáveis:

- React e TypeScript no frontend.
- Node.js e Express no backend do protótipo.
- Evolução futura do backend para Java sem alterar os contratos funcionais.
- APIs HTTP como caminho de escrita e leitura autoritativo.
- Eventos de domínio para atualização de Activity, Dashboard e outros
	consumidores.
- Dados reais ou representativos, sem expor dados pessoais reais no ambiente
	de demonstração.

## 6. Contratos de eventos iniciais

Os eventos devem possuir, no mínimo, `type`, `payload` e `occurredAt`.
Contratos atualmente identificados:

- `INSTITUTION_CREATED`
- `INSTITUTION_UPDATED`
- `INSTITUTION_INACTIVATED`
- `STUDENT_CREATED`
- `STUDENT_UPDATED`

Payload mínimo:

- Instituição: `id` e, quando aplicável, `name`.
- Estudante: `id` e `institutionId`.

Antes de produção, o contrato deve ganhar `eventId`, `version`, `source` e
algum mecanismo de correlação/idempotência. O transporte é uma decisão aberta:
para o MVP pode ser um barramento em memória ou `EventTarget`; para evolução,
WebSocket, pub/sub ou broker de mensagens.

## 7. MVP para dois dias

### Incluído

- Shell navegável com entradas para Instituições, Estudantes, Administração,
	Atividades e Dashboard.
- CRUD mínimo de instituições usando persistência em memória.
- Cadastro e listagem de estudantes vinculados a uma instituição.
- Autenticação demonstrativa e autorização para leitura/edição.
- Barramento simples de eventos no backend.
- Feed de atividades consumindo eventos de instituição e estudante.
- Atualização de pelo menos um indicador do Dashboard após uma alteração.
- Contratos compartilhados tipados e um teste do fluxo principal.
- Logs estruturados, `correlationId` e métricas básicas de requisições e
	eventos.

### Fora do escopo

- Banco de dados definitivo, migrações e alta disponibilidade.
- Login real, OAuth, gestão completa de identidade e recuperação de senha.
- Broker distribuído, garantia de entrega exatamente uma vez e processamento
	assíncrono em produção.
- Integração real com sistemas acadêmicos externos.
- Relatórios avançados, documentos, matrícula, notas ou financeiro.
- Deploy independente completo e pipeline de CI/CD para cada MFE.
- Migração imediata do backend para Java.

## 8. Estados relevantes

### Instituição

- `active` / ativa: pode ser consultada e receber estudantes.
- `inactive` / inativa: permanece no histórico, mas não deve receber novas
	operações sem uma regra explícita de reativação.

### Usuário

- `active`: pode prosseguir após autenticação e autorização.
- `inactive`: autenticação pode existir, mas o acesso operacional deve ser
	negado.

### Operação de tela

- `idle`, `loading`, `success` e `error`.
- Listas vazias devem ser tratadas como estado válido, não como erro.

### Evento

- `created`, `published`, `consumed` e `failed` no contexto de observabilidade
	do protótipo.

## 9. Critérios de aceite do contexto

- O usuário consegue visualizar a lista de instituições e selecionar uma.
- Um usuário autorizado consegue cadastrar um estudante para uma instituição.
- Um usuário não autorizado recebe resposta de acesso negado e não altera os
	dados.
- A criação ou atualização gera exatamente um evento de domínio válido.
- O Activity Feed registra a alteração sem depender de importação direta do
	código interno de outro MFE.
- O Dashboard reflete a alteração após o consumo do evento.
- Um MFE pode ser substituído sem quebrar o contrato compartilhado.
- O sistema demonstra estados de carregamento, sucesso, lista vazia e erro.

## 10. Perguntas que precisam ser decididas

1. O produto deve atender uma única instituição por instalação ou várias
	 instituições em um mesmo ambiente?
2. O estudante pode pertencer a mais de uma instituição ao longo do tempo?
3. A criação de estudante deve ser permitida somente para administradores ou
	 também para membros autorizados?
4. Instituições inativadas podem ser reativadas? Estudantes vinculados ficam
	 ativos, inativos ou apenas bloqueados para novos vínculos?
5. O MVP deve usar Module Federation real ou apenas simular a composição para
	 validar primeiro os contratos de eventos?
6. O evento precisa atualizar telas em tempo real ou basta atualizar após uma
	 nova consulta?
7. Quais campos obrigatórios existem para instituição e estudante?
8. Quais dados reais podem ser usados sem risco de exposição de dados pessoais?

## 11. Riscos e decisões alternativas

### Riscos

- Tentar entregar cinco MFEs completos no prazo pode deixar o fluxo principal
	sem acabamento.
- Eventos sem versionamento e idempotência dificultam a evolução futura.
- Persistência em memória pode esconder problemas de concorrência e consistência.
- O uso de dados reais pode gerar risco de privacidade e conformidade.
- Module Federation aumenta a complexidade inicial antes de existir um fluxo
	de negócio validado.

### Decisões alternativas

- **Eventos:** barramento em memória no MVP; WebSocket ou broker quando houver
	necessidade de múltiplas instâncias e entrega durável.
- **Composição:** host com Module Federation real; alternativa temporária é
	uma composição por rotas para validar domínio e contratos primeiro.
- **Persistência:** repositórios em memória no protótipo; API de repositório
	estável para trocar por banco relacional depois.
- **Backend:** Node.js para velocidade de prototipação; contratos HTTP/eventos
	independentes da implementação para permitir evolução para Java.

## 12. Diretriz de execução

Antes de implementar, responder as perguntas da seção 10 e registrar as
decisões em `spec-functional.md` e `spec-technical.md`. Em seguida, construir
primeiro o fluxo instituição -> estudante -> evento -> atividade/dashboard.
Os demais MFEs devem ter contratos e estados mínimos, mas não precisam receber
funcionalidades fora do fluxo demonstrável do MVP.

## 13. Plano de dois dias

> **Gate de aprovação:** este plano não autoriza implementação. Nenhum código,
> dependência ou configuração nova deve ser criado até que `context.md`,
> `spec-functional.md` e `spec-technical.md` sejam revisados e aprovados.

### Dia 1 - fundacao e fatia vertical

- Fechar decisões de negócio e contratos.
- Consolidar tipos, repositórios e casos de uso.
- Implementar instituições e estudantes no backend.
- Implementar autenticação demonstrativa e autorização nas rotas.
- Implementar o barramento em memória.
- Criar o fluxo de escrita com testes unitários e de integração.

**Entrega do dia:** é possível criar uma instituição e um estudante por API,
com permissão validada e evento publicado.

### Dia 2 - experiência, consumidores e operação

- Integrar o host e os MFEs prioritários.
- Implementar Activity e Dashboard como consumidores.
- Tratar estados de carregamento, vazio, sucesso e erro.
- Adicionar logs estruturados, `correlationId` e métricas básicas.
- Executar testes, revisar acessibilidade e validar o fluxo ponta a ponta.
- Registrar limitações, evidências e próximos passos.

**Entrega final:** protótipo navegável e demonstrável, com fluxo completo e
evidência automatizada das regras principais.

Este plano entrega um protótipo completo para demonstração. Não entrega um
produto pronto para produção: banco definitivo, identidade real, broker
durável, deploy independente e Module Federation real permanecem etapas
posteriores, salvo se forem priorizados em detrimento de alguma funcionalidade.