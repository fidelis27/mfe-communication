# Aprendizados para criar um projeto do zero

Este documento resume o que precisa ser decidido, configurado e validado ao
iniciar um projeto semelhante ao `mfe-communication`. A ordem importa: uma
fundacao pequena e verificavel evita retrabalho em seguranca, deploy e CI.

## 1. Definir o produto antes do codigo

- Registrar objetivo, usuarios, escopo do MVP e o que fica fora dele.
- Definir os fluxos criticos de aceite, por exemplo:
  `instituicao -> estudante -> vinculo -> evento -> Activity/Dashboard`.
- Registrar decisoes estruturais em ADRs: frontend, backend, persistencia,
  eventos, autenticacao, deploy e observabilidade.
- Definir uma fonte de verdade para cada dado e cada contrato.
- Definir uma politica de branches, commits, PRs e revisao.

## 2. Fixar o toolchain

- Fixar a versao de Node suportada pelo CI e pelo gerenciador de pacotes.
- Fixar a versao de Go usada localmente e no CI.
- Fixar versoes de npm, Vite, Vitest, TypeScript, ESLint e Prettier.
- Comitar o lockfile e garantir que `npm ci` reproduza a instalacao.
- Comitar `go.mod` e `go.sum`.
- Documentar os comandos oficiais de instalar, testar, formatar e compilar.
- Verificar engines das dependencias antes de atualizar versoes major.

## 3. Estruturar o repositorio

Uma estrutura inicial clara reduz acoplamento:

```text
.github/
  workflows/ci.yml
  PULL_REQUEST_TEMPLATE.md
docs/
  adr/
  deployment.md
  local-development.md
modules/
  backend/
    cmd/server/
    internal/application/
    internal/domain/
    internal/adapters/
    internal/platform/
    migrations/
  frontend/packages/
    host/
    mfe-institution/
    mfe-student/
    mfe-activity/
    mfe-dashboard/
    mfe-admin/
    shared/
scripts/
  start-local.ps1
  stop-local.ps1
```

- Separar dominio, casos de uso, adaptadores e composition root.
- Manter `main` apenas como montagem de dependencias e inicializacao.
- Manter cada MFE com build e configuracao independentes.
- Evitar codigo legado ou prototipos paralelos sem uma pasta e um README que
  expliquem seu status.

## 4. Configurar o backend

- Criar o modulo Go e um `cmd/server` pequeno.
- Ler configuracao por ambiente: porta, banco, TLS, CORS e credenciais.
- Validar tipos e valores obrigatorios na inicializacao.
- Criar migrations versionadas e idempotentes quando possivel.
- Usar MariaDB/MySQL como fonte de verdade dos dados de negocio.
- Manter repositorios atras de interfaces de dominio.
- Usar transacoes para operacoes que alteram mais de um vinculo.
- Separar claramente:
  - dominio: regras e entidades;
  - aplicacao: casos de uso;
  - adaptadores: HTTP, MariaDB e WebSocket;
  - plataforma: configuracao e infraestrutura.

## 5. Projetar autorizacao desde o inicio

- Definir identidade, papeis, escopos e recursos antes das rotas.
- Colocar a autorizacao na fronteira do handler ou em middleware explicito.
- Usar middlewares pequenos, com responsabilidade unica e composicao clara.
- Nao confiar em verificacoes feitas somente no frontend.
- Testar handlers, nao apenas funcoes de policy.
- Para cada rota, registrar:
  - como identifica o usuario;
  - qual policy consulta;
  - qual escopo de dados retorna;
  - quais respostas `401` e `403` produz.
- Documentar limites do prototipo, como headers demonstrativos ou credenciais
  em query string.

## 6. Definir contratos de eventos

Todo evento deve possuir, no minimo:

- `eventId`;
- `type`;
- `version`;
- `source`;
- `correlationId`;
- `occurredAt`;
- `payload`.

Antes de publicar eventos:

- Definir tipos compartilhados e uma politica de compatibilidade.
- Alteracoes aditivas nao devem quebrar consumidores.
- Alteracoes incompativeis devem aumentar a versao.
- Consumidores devem ignorar e registrar versoes desconhecidas sem quebrar a
  tela.
- Persistir eventos antes de distribui-los.
- Definir deduplicacao por `eventId`.
- Definir como o payload identifica a instituicao ou tenant para evitar
  vazamento cross-tenant.

## 7. Configurar os microfrontends

- Criar um Host e remotes com contratos de runtime claros.
- Configurar Module Federation com React compartilhado como singleton.
- Ler URLs dos remotes por variaveis de ambiente no build.
- Manter fallback local para desenvolvimento.
- Evitar `localhost` fixo em configuracao de producao.
- Expor somente componentes publicos necessarios.
- Adicionar Error Boundary ao redor de cada remote.
- Preservar navegacao, skip-link, `aria-current` e estado do shell quando um
  remote falhar.
- Cada MFE deve tratar `loading`, `empty`, `success` e `error`.
- Cada campo deve ter `label` associado, foco visivel e feedback acessivel.
- O backend continua sendo a autoridade para permissao e dados.

## 8. Tratar efeitos assincornos no React

- Cancelar fetches no cleanup com `AbortController`.
- Ignorar `AbortError` como cancelamento normal.
- Cancelar timers de reconexao ao desmontar.
- Fechar WebSockets no cleanup.
- Evitar `setState` depois de unmount.
- Centralizar reconexao, backoff, parsing e cleanup em um hook compartilhado
  quando varios MFEs usam o mesmo protocolo.
- Testar reconexao, deduplicacao e desmontagem.

## 9. Configurar qualidade automatizada

O CI deve ser um gate, nao uma lista escrita manualmente no PR:

- `npm ci`;
- `npm run lint`;
- `npm test`;
- `npm run format:check`;
- build de todos os workspaces frontend;
- `go build ./...`;
- `go vet ./...`;
- `go test -race ./...`;
- cobertura com piso inicial medido e versionado;
- `govulncheck ./...`;
- `npm audit --audit-level=high`.

- Usar matriz para builds independentes.
- Criar um job agregado `CI gate` que falha se qualquer job necessario falhar.
- Configurar branch protection exigindo o check do CI e PR.
- Em repositorio solo, permitir bypass administrativo sem remover o CI.
- Manter template de PR com validacoes, riscos, rollback e teste de
  autorizacao para rotas novas ou alteradas.

## 10. Criar testes por camada

- Dominio: regras puras e invariantes.
- Aplicacao: casos de uso e erros de repositorio.
- Adaptadores: repositorios, HTTP, CORS e WebSocket.
- Seguranca: `401`, `403`, isolamento de escopo e tentativa de escalacao.
- Integracao: MariaDB real, migrations e persistencia de eventos.
- Frontend: estados, acessibilidade, retry, cleanup e contratos de eventos.
- E2E: launcher, health, autenticacao, CORS, WebSocket e `remoteEntry.js`.

Todo bug de autorizacao deve ganhar um teste de handler que falharia antes da
correcao.

## 11. Configurar ambiente local

- Fornecer um launcher unico para backend, Host e remotes.
- Fornecer um script de parada que nao dependa de IDs fixos de processos.
- Documentar MariaDB/XAMPP, migrations e phpMyAdmin.
- Documentar portas, variaveis e usuarios demonstrativos.
- Criar um comando de validacao local que verifique API, CORS, metricas,
  WebSocket e `remoteEntry.js`.
- Fazer o comando falhar com mensagens claras quando um servico ou banco nao
  estiver disponivel.

## 12. Preparar deploy

- Separar build e deploy do Host, remotes e backend.
- Usar HTTPS/WSS e CORS por ambiente.
- Usar MariaDB/MySQL persistente, com backup e migrations controladas.
- Armazenar segredos somente na plataforma de deploy.
- Definir health check, logs, metricas, alertas e rollback.
- Testar reinicio e redeploy sem perda de dados.
- Registrar URLs, variaveis, limites do plano e evidencias de validacao.
- Declarar explicitamente o que ainda e apenas prototipo.

## 13. Checklist antes do primeiro merge

- [ ] README explica como iniciar, testar e compilar.
- [ ] ADRs registram decisoes estruturais.
- [ ] Variaveis de ambiente possuem exemplo sem segredos.
- [ ] Migrations podem ser aplicadas em uma base vazia.
- [ ] Rotas possuem identidade, policy e testes de autorizacao.
- [ ] Eventos possuem contrato versionado e `correlationId`.
- [ ] Host carrega remotes por URLs configuraveis.
- [ ] Estados de erro e cleanup existem nos MFEs.
- [ ] CI executa todos os gates automaticamente.
- [ ] Branch protection impede merge com CI vermelho.
- [ ] Vulnerabilidades de dependencia possuem tratamento ou excecao
      documentada.
- [ ] O fluxo principal foi validado localmente e em ambiente publicado.

## 14. Regra de manutencao

Cada mudança estrutural deve atualizar o ADR correspondente. Cada rota nova ou
alterada deve trazer teste de autorizacao. Cada novo consumidor de evento deve
usar o contrato compartilhado. Cada dependência nova deve ter justificativa no
PR. O objetivo e manter o projeto compreensivel para a proxima pessoa, mesmo
quando essa pessoa for o proprio autor alguns meses depois.
