# Contexto do produto

## 0. Instrucoes para a IA

Atue como um desenvolvedor senior full-stack, especialista em React,
TypeScript, Node.js, APIs REST, arquitetura de microfrontends e comunicacao
por eventos. Atue tambem como um arquiteto pragmatico: priorize valor de
negocio, simplicidade, verificabilidade e evolucao segura.

### Comportamento esperado

- Diferencie fatos observados, decisoes aprovadas, hipoteses e perguntas em
	contrato, seguranca ou criterio de aceite.
- Nao implemente codigo, instale dependencias ou altere configuracoes antes da
- Depois da aprovacao, implemente uma fatia vertical por vez, mantendo as
	refatoracoes nao relacionadas ao objetivo.
	evolucao para producao.
- Para cada mudanca aprovada, indique o requisito atendido e a validacao
	executada.
- Sempre valide o comportamento com testes, compilacao ou verificacao manual
	adequada ao tipo de alteracao.
- Nunca trate um prototipo funcional como pronto para producao sem registrar
	seus limites, riscos e trabalho restante.

### Ordem de trabalho



Construir um protótipo de um sistema de secretaria escolar para gestão de
instituições de ensino e estudantes. O produto será organizado como um
ecossistema de microfrontends (MFEs), com comunicação entre domínios por meio
de eventos.

O objetivo do protótipo é validar a separação de responsabilidades, o fluxo
principal de secretaria e os contratos de integração entre MFEs. A solução

### Público primário


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

O ambiente é multi-institucional: um agente da secretaria pode cadastrar e
administrar várias instituições, inclusive diferentes unidades da Fatec,
organizadas por município, estado e região administrativa.

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
- Go no backend do protótipo, com API HTTP e WebSocket.
- Evolução futura do backend para Java sem alterar os contratos funcionais.
- APIs HTTP como caminho de escrita e leitura autoritativo.
- Eventos de domínio para atualização de Activity, Dashboard e outros
	consumidores.
- Dados reais ou representativos, sem expor dados pessoais reais no ambiente
	de demonstração.

## 6. Contratos de eventos iniciais

Os eventos do MVP devem possuir `eventId`, `type`, `version`, `source`,
`correlationId`, `payload` e `occurredAt`.
Contratos atualmente identificados:

- `INSTITUTION_CREATED`
- `INSTITUTION_UPDATED`
- `INSTITUTION_INACTIVATED`
- `STUDENT_CREATED`
- `STUDENT_UPDATED`

Payload mínimo:

- Instituição: `id` e, quando aplicável, `name`.
- Estudante: `id` e `institutionId`.

Além dos eventos de domínio persistidos, os MFEs devem emitir eventos de
interação para o host e para o MFE consumidor. Exemplo: um MFE aberto em modal
emite `STUDENT_CREATED_SUCCESS`; o consumidor fecha o modal, atualiza sua
consulta e exibe a mensagem de sucesso somente depois de receber o evento.
Eventos de interação devem carregar `correlationId` para relacionar início,
sucesso e erro da operação.

O backend publica eventos de domínio após a persistência e um canal realtime
distribui os eventos aos MFEs. O MVP deve demonstrar deduplicação por
`eventId`; broker durável, retentativa e idempotência persistente ficam para a
evolução.

## 7. Escopo completo do protótipo em três dias

### Incluído

- Shell navegável com entradas para Instituições, Estudantes, Administração,
	Atividades e Dashboard.
- CRUD completo de instituições e unidades com persistência MariaDB/MySQL.
- Cadastro, consulta, edição e listagem de estudantes persistidos no banco.
- Trancamento, reabertura e transferência com histórico persistido.
- Module Federation real em todos os MFEs previstos.
- Autenticação demonstrativa e autorização para leitura/edição.
- Barramento simples de eventos no backend.
- Feed de atividades consumindo eventos de instituição e estudante.
- Atualização de pelo menos um indicador do Dashboard após uma alteração.
- Contratos compartilhados tipados e um teste do fluxo principal.
- Logs estruturados, `correlationId` e métricas básicas de requisições e
	eventos.

### Limites operacionais

Todos os módulos e fluxos funcionais documentados fazem parte do protótipo.
Alta disponibilidade, garantia exactly-once, identidade de produção e
integrações externas exigem endurecimento posterior antes de uso real.

## 8. Estados relevantes

### Instituição

- `active` / ativa: pode ser consultada e receber estudantes.
- `inactive` / inativa: permanece no histórico e pode ser reativada por usuário
	autorizado conforme regra administrativa.

### Vínculo acadêmico do estudante

- `active`: estudante regularmente vinculado à instituição.
- `enrolled_locked` / matrícula trancada: vínculo preservado, mas atividades
	acadêmicas e operações restritas ficam bloqueadas.
- `transferred` / transferido: vínculo encerrado na instituição de origem e
	histórico preservado; pode existir novo vínculo em outra instituição.
- `inactive`: vínculo encerrado sem transferência ativa.

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

## 10. Decisões de negócio registradas pelo PO

1. O ambiente atende várias instituições. Um agente da secretaria pode
	cadastrar instituições de diferentes cidades, incluindo várias Fatecs.
2. Um estudante pode ter histórico em mais de uma instituição somente por
	transferência. O sistema deve preservar origem, destino, datas e situação do
	vínculo, sem duplicar o cadastro civil do estudante.
3. Administradores e membros autorizados podem cadastrar estudantes. A
	diferença deve ser explícita: administrador gerencia dados e permissões do
	domínio; membro executa operações delegadas, sem administrar usuários,
	grupos ou políticas.
4. Instituições podem ser reativadas. O trancamento é uma mudança do vínculo
	do estudante: preserva histórico e permite reabertura posterior.
5. Module Federation real é obrigatório no MVP para provar o conceito de MFE.
6. Eventos devem ser escutados em tempo real. O contrato deve suportar eventos
	de sucesso e erro de interação, inclusive fechamento de modais pelo MFE
	consumidor.
7. O cadastro institucional será rico, mas terá campos obrigatórios reduzidos
	no primeiro formulário. Campos recomendados estão abaixo.
8. Dados pessoais devem seguir minimização, mascaramento em telas e logs,
	controle de acesso e criptografia em repouso e em trânsito quando houver
	banco real. Dados de demonstração devem ser fictícios ou anonimizados.

9. O escopo do MVP será multi-institucional, mas não multi-tenant isolado: uma
	instalação compartilha o catálogo e o agente autorizado enxerga apenas o
	escopo permitido pela sua associação.
10. O estudante terá um cadastro civil único e vários vínculos históricos; o
	MVP permite somente um vínculo `active` por vez. Transferência exige vínculo
	de destino ativo e encerra o vínculo de origem na mesma operação lógica.
11. Administrador pode criar, editar, inativar e reativar instituições,
	gerenciar vínculos, usuários e grupos do seu escopo. Membro autorizado pode
	criar estudante e executar operações de vínculo delegadas, mas não pode
	alterar permissões, usuários, grupos ou o catálogo institucional.
12. O cadastro institucional terá duas camadas: dados da organização e dados
	da unidade/campus. O formulário inicial exige nome oficial, tipo, município,
	UF e status; os demais campos entram em edição avançada.
13. O cadastro de estudante exige nome, identificador interno, instituição,
	curso e situação do vínculo. CPF, contatos, endereço e data de nascimento
	serão opcionais, mascarados e nunca serão usados em logs.
14. O MFE de Instituição, o MFE de Estudante e o Host são prioridade P0. MFE
	Activity e MFE Dashboard são P1 e devem consumir pelo menos os eventos do
	fluxo principal. MFE Admin fica com tela mínima de demonstração de papéis.
15. O transporte realtime escolhido para o MVP é WebSocket e será mantido. O
	barramento em memória publica no backend e o adaptador WebSocket distribui os
	eventos aos MFEs. Não haverá broker externo nesta etapa.
16. O `window.bus`/`EventTarget` será usado somente para comunicação local entre
	MFEs na mesma página, como fechamento de modal e feedback de sucesso. O
	WebSocket será usado para eventos emitidos pelo backend e sincronização entre
	clientes.
17. O evento de sucesso só será emitido depois de a API concluir persistência e
	publicação do evento de domínio. O consumidor fecha modal apenas quando o
	`correlationId` corresponder à operação iniciada; erro mantém o modal aberto.
18. A fonte dos dados institucionais será cadastro manual com exemplos
	públicos de USP, UNESP e Fatec. Não haverá scraping nem integração externa.
19. A criptografia de dados em repouso é requisito para banco persistente; como
	o MVP usa memória, o protótipo demonstrará mascaramento e não persistirá
	dados pessoais reais.

### Campos recomendados

**Instituição/unidade:** nome oficial, nome curto, sigla, tipo de mantenedora,
CNPJ da entidade quando aplicável, código institucional, status, endereço,
município, UF, região administrativa, campus/unidade, telefone institucional,
e-mail institucional, site oficial, modalidade, cursos ofertados e datas de
vigência. No MVP, nome oficial, tipo, município, UF e status são obrigatórios.

**Estudante:** nome completo, nome social, identificador interno, CPF
mascarado, data de nascimento, contatos, endereço, nacionalidade, necessidades
de acessibilidade quando estritamente necessárias, instituição, campus, curso,
turno, período/semestre, situação da matrícula, data de ingresso, histórico
de transferências e data de trancamento/reabertura. No MVP, nome, identificador
interno, instituição, curso e situação do vínculo são obrigatórios.

CPF, data de nascimento, endereço, contatos e necessidades de acessibilidade
são dados pessoais e não devem aparecer em logs ou listas sem necessidade.

As páginas públicas de USP, UNESP e Centro Paula Souza/Fatec podem orientar
nomes, siglas, campi, municípios, regiões administrativas, cursos e serviços
institucionais. Elas não serão integradas no MVP e não devem ser usadas para
copiar dados pessoais. Para demonstração, usar dados institucionais públicos e
dados de estudantes fictícios ou anonimizados.

## 11. Riscos e decisões alternativas

### Riscos

- Tentar entregar cinco MFEs completos no prazo pode deixar o fluxo principal
	sem acabamento.
- Eventos sem versionamento e idempotência dificultam a evolução futura.
- MariaDB/MySQL exige transações, migrations, charset `utf8mb4` e credenciais
	seguras para evitar perda ou corrupção de dados.
- O uso de dados reais pode gerar risco de privacidade e conformidade.
- Module Federation real aumenta a complexidade inicial e pode ameaçar o
	prazo de três dias.
- Eventos realtime exigem reconexão, ordenação e tratamento de mensagens
	duplicadas.
- Transferências e trancamentos introduzem histórico e regras de consistência.

### Decisões alternativas

- **Eventos:** barramento em memória no MVP; WebSocket ou broker quando houver
	necessidade de múltiplas instâncias e entrega durável.
- **Composição:** host com Module Federation real, com remotes independentes e
	React compartilhado como singleton. Composição por rotas deixa de ser a
	opção do MVP, podendo existir apenas como fallback de desenvolvimento.
- **Persistência:** MariaDB/MySQL para todos os dados do produto; memória apenas
	para conexões e buffers técnicos temporários.
- **Eventos realtime:** WebSocket ou canal equivalente para notificar MFEs;
	barramento em memória pode permanecer no backend apenas como implementação
	inicial do produtor.
- **Dados pessoais:** mascaramento na interface e nos logs; criptografia em
	repouso deve ser obrigatória quando a persistência deixar de ser em memória.
- **Backend:** Go para API HTTP e WebSocket; contratos independentes da
	implementação.

## 12. Diretriz de execução

As decisões do PO acima encerram as ambiguidades de produto desta rodada e
devem ser refletidas em `spec-functional.md` e `spec-technical.md`. Em
seguida, construir primeiro o fluxo instituição -> estudante -> evento ->
atividade/dashboard.
Os demais MFEs devem ter contratos e estados mínimos, mas não precisam receber
funcionalidades fora do fluxo demonstrável do MVP.

## 13. Plano de três dias

> **Gate de aprovação:** este plano não autoriza implementação. Nenhum código,
> dependência ou configuração nova deve ser criado até que `context.md`,
> `spec-functional.md`, `spec-technical.md` e `deployment.md` sejam revisados
> e aprovados.

### Dia 1 - fundacao e dominio

- Fechar decisões de negócio e contratos.
- Consolidar contratos, schema/migrations MariaDB, repositórios e casos de uso.
- Implementar instituições e estudantes no backend.
- Implementar autenticação demonstrativa e autorização nas rotas.
- Implementar o barramento em memória.
- Configurar o contrato WebSocket e provar a conexão realtime.
- Criar o fluxo de escrita com testes unitários e de integração.

**Entrega do dia:** é possível criar uma instituição e um estudante por API,
com permissão validada e evento publicado.

### Dia 2 - MFEs e integracao

- Configurar Module Federation real, integrar o host e carregar os MFEs
	-	previstos como remotes independentes.
	- Implementar Institution, Student, Admin, Activity e Dashboard.
	- Integrar WebSocket e o barramento local do browser.
	- Implementar transferência, trancamento e reabertura.

	### Dia 3 - qualidade, seguranca e entrega

- Tratar estados de carregamento, vazio, sucesso e erro.
- Adicionar logs estruturados, `correlationId` e métricas básicas.
	- Executar testes, revisar acessibilidade e validar o fluxo ponta a ponta.
	- Configurar builds, deploy, reconexão WebSocket e rollback.
	- Registrar limitações, evidências e próximos passos.

**Entrega final:** protótipo navegável e demonstrável, com fluxo completo e
evidência automatizada das regras principais.

Este plano entrega um protótipo completo para demonstração. Não entrega um
produto pronto para produção: banco definitivo, identidade real, broker
durável e deploy independente permanecem etapas posteriores. Module Federation
real faz parte do MVP e deve ser demonstrado, mesmo que a operação em escala e
a publicação independente de todos os remotes fiquem para uma etapa posterior.

**Status do PO:** as ambiguidades de produto desta rodada estão resolvidas.
As quatro especificações estão prontas para revisão e aprovação; a
implementação continua bloqueada até essa aprovação explícita.

## 14. Decisão final vigente

Este bloco prevalece sobre qualquer referência anterior conflitante neste
documento:

- Prazo do protótipo: três dias de trabalho.
- Backend oficial: Go, com API HTTP e WebSocket.
- Banco oficial: MariaDB/MySQL.
- Todos os dados do produto devem ser persistidos no banco: instituições,
	unidades, cursos, estudantes, vínculos, usuários, grupos, permissões,
	eventos, atividades e projeções do dashboard.
- Memória só pode ser usada para conexões, sessões técnicas, cache transitório
	e buffers do WebSocket; nunca como fonte de verdade ou repositório de negócio.
- Transferências devem preservar histórico e executar origem/destino em uma
	transação MariaDB/MySQL.
- Module Federation real e WebSocket fazem parte do protótipo.
- A implementação continua bloqueada até a aprovação explícita das specs.