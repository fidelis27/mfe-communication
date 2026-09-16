# Contexto

Repositório: mfe-communication — protótipo "Secretaria Escolar".
Backend Go (hexagonal) em `modules/backend`, frontend React + Vite Module
Federation em `modules/frontend/packages` (host + 5 remotes + shared).

Regras de trabalho (não negociáveis):

- Uma PR por bloco abaixo. NÃO agrupe blocos.
- Branch `fix/<slug>` ou `feat/<slug>`, commit convencional, corpo de PR com
  seção "Validações" listando os comandos executados.
- Antes de abrir cada PR rode: build do workspace afetado, `npm run lint`,
  `npm test`, `go test ./...`, `prettier --check` nos arquivos tocados,
  `git diff --check`.
- Ao refatorar, liste explicitamente no corpo do PR o que o código ANTIGO
  fazia e que o novo precisa continuar fazendo. Não perca comportamento.
- Não introduza dependências novas sem justificar em uma linha no PR.

---

## PR 1 — fix: aplicar CanManageUsers nas rotas de usuário

Em `modules/backend/internal/adapters/httpserver/server.go`, as rotas
`GET /users` e `POST /users` não consultam a policy. `CanManageUsers` existe
em `internal/domain/authorization/policy.go` e é testada, mas nunca é chamada.
Hoje qualquer usuário autenticado consegue criar outro com `superAdmin: true`.

- Aplicar `policy.CanManageUsers(user)` nas duas rotas, retornando 403.
- Adicionar testes de HANDLER (não só de policy) cobrindo: superadmin
  autorizado, usuário comum recebendo 403 no GET e no POST, e tentativa de
  criar `superAdmin: true` por usuário comum.
- Varrer TODAS as rotas de `server.go` e listar no corpo do PR quais outras
  não passam por nenhuma checagem de policy. Não corrija as outras aqui.

## PR 2 — fix: escopar GET /events/history por instituição

`GET /events/history` retorna eventos de todos os tenants para qualquer
usuário autenticado.

- Aplicar `policy.VisibleInstitutionIDs` e filtrar os eventos retornados,
  mantendo o comportamento atual para superadmin.
- Se o evento persistido não carrega `institutionId` hoje, proponha no PR a
  migration necessária antes de implementar — não invente o campo em memória.
- Teste de handler cobrindo o vazamento cross-tenant.

## PR 3 — fix: restaurar guard de unmount no mfe-student

A PR #39 (branch `feat/student-retry-accessibility`) extraiu o fetch para
`loadStudents` com `useCallback` e removeu a flag `active` que impedia
`setState` após unmount.

- Reintroduzir o guard via `AbortController` no `loadStudents`, abortando no
  cleanup do `useEffect`.
- Manter tudo que a PR #39 ganhou: retry manual, `aria-busy`, `htmlFor`.
- Teste com Testing Library: desmontar o componente com o fetch em voo e
  garantir ausência de warning de state update.

## PR 4 — refactor: extrair contrato de eventos e useDomainEvents para shared

`@mfe/shared` está morto: define `InstitutionEvent`/`StudentEvent` e nenhum
MFE importa. Cada MFE redefine o shape do evento e duplica conexão WebSocket,
backoff exponencial e filtro por `type` string.

- Em `packages/shared`: tipo discriminado `DomainEvent` cobrindo todos os
  tipos publicados pelo backend (`STUDENT_CREATED`, `STUDENT_TRANSFERRED`,
  `ENROLLMENT_SUSPENDED`, `ENROLLMENT_REOPENED`, e os de institution),
  com `version` para permitir evolução do contrato.
- Hook `useDomainEvents(apiUrl, demoUser)` encapsulando conexão, reconexão
  com backoff, cleanup e parsing tipado; consumidor filtra por tipo sem
  comparar string solta.
- Migrar mfe-student primeiro. Os demais MFEs em PR separada.
- Testes de unidade do hook cobrindo reconexão e cleanup.
- Ajustar `shared` para ser consumível pelos remotes (build/exports), e
  declarar em `shared` do federation se necessário para não duplicar bundle.

## PR 5 — chore: remover localhost hardcoded dos remotes

Os `vite.config.ts` do host e dos 5 remotes têm URLs `http://localhost:41xx`
fixas, o que impede qualquer deploy fora da máquina local.

- Ler as URLs de variáveis de ambiente com fallback para os valores locais
  atuais, para não quebrar `npm run dev:local`.
- `.env.example` documentado por pacote.
- Atualizar `docs/local-development.md` e `docs/deployment.md`.

## PR 6 — feat: error boundary nos remotes do host

`host/src/App.tsx` carrega os remotes com `lazy()` + `Suspense`. Suspense não
captura erro de import — um remote fora do ar quebra a aplicação inteira.

- Error boundary por remote, com fallback que nomeia o módulo indisponível e
  oferece retry, sem derrubar a navegação do host.
- Teste simulando falha de import de um remote.

## PR 7 — feat: roteamento real no host

O host troca de módulo com `useState`: sem deep-link, sem botão voltar,
refresh perde o módulo ativo.

- Introduzir roteamento por URL (`/estudantes`, `/instituicoes`, ...),
  preservando o layout, o skip-link e o `aria-current` da navegação atual.
- Rota desconhecida cai no estado "módulo em preparação" que já existe.

## PR 8 — refactor: quebrar server.go em handlers por domínio

`server.go` tem ~535 linhas com todas as rotas inline; handler, validação,
autorização e publicação de evento no mesmo closure, repetidos.

- Separar em arquivos por agregado (`student_handler.go`,
  `enrollment_handler.go`, `group_handler.go`, `user_handler.go`,
  `institution_handler.go`), mantendo `New()` como composition root.
- Extrair os helpers repetidos de decode+validate e de publicação de evento.
- Refactor sem mudança de comportamento: nenhuma rota, status code ou payload
  pode mudar. Adicione testes de handler ANTES de mover o código.

## PR 9 — chore: remover protótipo TypeScript legado da raiz

`domain/`, `middleware/` e `server/index.en.ts` na raiz duplicam conceitos já
implementados de verdade no backend Go (authorization policy, middleware de
identidade). É código morto que confunde quem abre o repo.

- Remover, ou mover para `docs/legacy/` deixando claro que não roda.
- Limpar `package.json` (scripts `start:dev`, deps express/body-parser) e
  `vitest.config.ts` do que ficar órfão.
- Reescrever o `README.md`, que hoje documenta APENAS esse protótipo morto:
  precisa cobrir backend Go, frontend MFE, como subir tudo e como rodar os
  testes dos dois lados.

## PR 10 — test: acessibilidade e testes nos demais MFEs

Os 6 pacotes React não têm nenhum arquivo `.test.tsx`. mfe-student recebeu
skip-link, `aria-live` e `aria-busy`; os outros (activity, institution,
dashboard, admin) não têm o mesmo cuidado.

- Configurar Vitest + Testing Library + jest-dom no workspace frontend.
- Padronizar nos 4 MFEs restantes: labels associados por `htmlFor`/`id`,
  `aria-live` nas listas, `aria-busy` no carregamento, foco visível.
- Teste por MFE cobrindo estados loading / empty / error / success.
- No mfe-admin: esconder o checkbox `superAdmin` de quem não é superadmin
  (a UI hoje oferece ação que o backend deve recusar após a PR 1).
