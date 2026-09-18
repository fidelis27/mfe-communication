# Plano de melhorias de performance frontend

Este plano transforma a auditoria em tarefas pequenas e independentes. Cada
tarefa deve ser executada em uma branch propria, com uma PR, validacao antes e
depois e sem agrupar melhorias de naturezas diferentes.

## Regras de execucao

- Uma tarefa por branch e por PR.
- Nao otimizar sem evidencia mensuravel.
- Registrar o problema, a metrica antes, a menor mudanca e a metrica depois.
- Preservar comportamento funcional e contratos publicos.
- Nao adicionar `useMemo`, `useCallback`, `React.memo` ou virtualizacao sem
  demonstrar beneficio.
- Rodar os testes do slice afetado antes de abrir a PR.
- Rodar build, lint, format check e `git diff --check` antes de concluir cada
  tarefa.

## Ordem das tarefas

### PERF-BASELINE - Criar baseline de navegacao

- Branch: `perf/frontend-baseline`
- Objetivo: medir Host, Estudantes, Instituicoes, Admin, Activity e Dashboard.
- Medir: requests, bytes transferidos, maior chunk, tempo de remote, LCP, FCP,
  INP, CLS e TTFB quando disponiveis.
- Nao alterar codigo de produto.
- Entrega: relatorio com evidencias e valores de referencia.

### PERF-001 - Remover request duplicado do Student

- Branch: `perf/student-institutions-request`
- Arquivo principal: `mfe-student/src/App.tsx`.
- Problema: `loadInstitutions` depende de `institutionId`, que tambem causa a
  reexecucao do efeito.
- Resultado esperado: uma consulta de instituicoes na montagem inicial.
- Validacao: teste de requests e build do MFE Student.

### PERF-002 - Centralizar WebSocket no Shared

- Branch: `perf/shared-domain-events`
- Arquivos: `shared/src/events.ts`, Activity e Dashboard.
- Problema: tres implementacoes de conexao, retry, parsing e cleanup.
- Resultado esperado: um hook compartilhado com o mesmo contrato e deduplicacao.
- Validacao: testes de cleanup, reconexao e uma conexao por MFE montado.

### PERF-003 - Reduzir refresh do Dashboard

- Branch: `perf/dashboard-event-refresh`
- Problema: cada mensagem WebSocket refaz tres GETs completos.
- Primeiro passo: coalescer eventos e evitar requests concorrentes.
- Segundo passo: avaliar endpoint de agregados somente com evidencia de volume.
- Validacao: contagem de requests por evento e testes de atualizacao.

### PERF-004 - Cancelar requests dos MFEs

- Branch: `perf/mfe-request-cancellation`
- Escopo: Institution, Activity, Dashboard e Admin.
- Problema: requests continuam apos unmount ou podem terminar fora de ordem.
- Resultado esperado: `AbortController` e tratamento consistente de cancelamento.
- Validacao: desmontagem durante request, navegacao rapida e testes de abort.

### PERF-005 - Medir e paginar listas

- Branch: `perf/paginated-resource-lists`
- Escopo: estudantes, instituicoes, pessoas, grupos e eventos.
- Primeiro passo: medir comportamento com listas grandes.
- Implementar paginacao apenas nos recursos que excederem o limite definido.
- Nao introduzir virtualizacao sem evidencia de custo de DOM.

### PERF-006 - Instrumentar carregamento dos remotes

- Branch: `perf/remote-loading-metrics`
- Escopo: Host e Module Federation.
- Medir inicio, fim, erro e duracao do carregamento de cada remote.
- Resultado esperado: distinguir latencia, falha de rede e erro de render.

### PERF-007 - Confirmar duplicacao de runtime

- Branch: `perf/federation-runtime-analysis`
- Escopo: React, React DOM, runtime Federation e chunks comuns.
- Primeiro passo: medir Network e Coverage em producao/Preview.
- Alterar configuracao apenas se houver bytes duplicados em runtime.

### PERF-008 - Remover codigo legado do Host

- Branch: `chore/remove-legacy-host-entry`
- Arquivo candidato: `host/src/index.ts`.
- Primeiro confirmar referencias e scripts que ainda o utilizam.
- Remover somente depois de validar todos os builds e comandos locais.

## Criterios de pronto

Uma tarefa esta pronta quando:

1. O problema foi reproduzido ou medido.
2. A menor alteracao necessaria foi implementada.
3. O comportamento funcional anterior foi preservado.
4. Existe teste ou verificacao adequada ao risco.
5. O build do workspace afetado passou.
6. O diff nao possui erros de whitespace ou arquivos gerados indevidos.
7. A PR informa metricas antes/depois ou explica por que a medicao ficou
   limitada ao ambiente local.

## Nao otimizar agora

- Nao adicionar memoizacao por padrao.
- Nao virtualizar listas pequenas.
- Nao pre-carregar todos os MFEs.
- Nao trocar bibliotecas sem comparacao de bundle e runtime.
- Nao criar cache global antes de definir invalidacao.
- Nao transformar cada render em uma abstracao compartilhada.
