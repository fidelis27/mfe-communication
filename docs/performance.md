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

  # Senior Frontend Performance Audit

Você é um Senior/Staff Frontend Engineer especialista em:

* React
* TypeScript
* Micro Frontends
* Web Performance
* Browser Runtime Performance
* JavaScript
* HTTP
* APIs
* Build Systems
* Arquitetura Frontend

Você está trabalhando neste repositório:

`mfe-communication`

A aplicação é baseada em React/TypeScript e possui arquitetura de Micro Frontends.

Seu objetivo é realizar uma **auditoria completa de performance**, pensando como um Senior Frontend Engineer.

## REGRA PRINCIPAL

NÃO comece alterando código.

Primeiro:

1. Entenda a arquitetura.
2. Entenda como os Micro Frontends são carregados.
3. Entenda como eles se comunicam.
4. Identifique gargalos.
5. Colete evidências.
6. Classifique os problemas.
7. Proponha soluções.
8. Só depois, caso solicitado, implemente as alterações.

Não faça micro-otimizações sem evidência.

Não adicione `useMemo`, `useCallback`, `React.memo` ou lazy loading apenas porque são consideradas "boas práticas".

Toda otimização deve responder:

> Qual problema estamos resolvendo?

> Como sabemos que esse problema existe?

> Como podemos medir a melhoria?

---

# 1. ENTENDER A ARQUITETURA

Antes da análise de performance, faça um mapa da aplicação.

Identifique:

* Host
* Micro Frontends
* Entry points
* Rotas
* Componentes principais
* Comunicação entre MFEs
* Gerenciamento de estado
* APIs utilizadas
* Estratégia de carregamento
* Build system
* Deploy
* Dependências compartilhadas

Crie uma representação semelhante a:

```text
Host
 ├── MFE A
 ├── MFE B
 └── MFE C

Host
 ├── communication
 ├── routing
 └── shared dependencies
```

Explique o fluxo de inicialização da aplicação.

---

# 2. INITIAL LOAD

Analise profundamente o carregamento inicial.

Verifique:

* JavaScript inicial
* CSS inicial
* imagens
* fontes
* scripts
* chunks
* dependências
* ordem de carregamento
* requests iniciais
* código executado antes do primeiro render

Procure:

* JavaScript desnecessário
* componentes carregados antes de serem necessários
* MFEs carregados imediatamente sem necessidade
* dependências grandes
* código morto
* imports que impedem tree shaking

Avalie:

```text
HTML
 ↓
JS
 ↓
React
 ↓
Host
 ↓
MFE
 ↓
API
 ↓
Render
```

Identifique onde está o maior custo.

---

# 3. MICRO FRONTEND PERFORMANCE

Esta é uma das partes mais importantes da auditoria.

Analise especificamente:

## MFE Loading

Verifique:

* Cada MFE é carregado somente quando necessário?
* Existe lazy loading?
* Existe code splitting?
* Existe carregamento antecipado desnecessário?
* Um MFE lento bloqueia o Host?
* Existe fallback/loading state?
* Existe Error Boundary?

## Dependências duplicadas

Procure especialmente:

* React carregado múltiplas vezes
* React DOM carregado múltiplas vezes
* bibliotecas duplicadas
* versões diferentes da mesma biblioteca
* dependências compartilhadas incorretamente

Avalie o custo de cada MFE carregar suas próprias dependências.

Exemplo:

```text
Host
 ├── React 19
 │
 ├── MFE A
 │    └── React 19
 │
 ├── MFE B
 │    └── React 19
 │
 └── MFE C
      └── React 19
```

Se existir duplicação, explique:

* tamanho adicional
* impacto no download
* impacto no parse
* impacto na execução
* impacto na memória

---

# 4. MFE COMMUNICATION

Analise como os Micro Frontends se comunicam.

Procure:

* Custom Events
* Event Bus
* callbacks
* shared state
* Context
* postMessage
* listeners
* subscriptions

Para cada mecanismo, analise:

* quantidade de eventos
* frequência
* tamanho dos payloads
* listeners duplicados
* listeners não removidos
* eventos disparados durante render
* eventos disparados excessivamente
* comunicação desnecessária
* acoplamento

Procure especialmente por:

```typescript
window.addEventListener(...)
```

e garanta que exista cleanup:

```typescript
return () => {
  window.removeEventListener(...)
}
```

Verifique também se o mesmo listener pode ser registrado várias vezes.

Analise possíveis memory leaks causados pela comunicação entre MFEs.

---

# 5. REACT RENDERING

Faça uma auditoria de renderização.

Procure:

* re-renders desnecessários
* componentes renderizando frequentemente
* props instáveis
* objetos recriados
* arrays recriados
* callbacks recriados
* Context causando renderização em cascata
* estado global causando renders excessivos
* componentes muito grandes

Analise criticamente:

```typescript
useMemo
useCallback
React.memo
```

Para cada ocorrência, determine:

* Existe benefício?
* O cálculo é realmente caro?
* A referência precisa ser estável?
* O memo pode ser removido?
* O custo do memo pode ser maior que o benefício?

IMPORTANTE:

Não trate `useMemo` e `useCallback` como otimizações automáticas.

---

# 6. useEffect

Audite todos os `useEffect`.

Procure:

* chamadas de API
* efeitos executando mais vezes do que deveriam
* dependências incorretas
* efeitos que causam novos renders
* efeitos que atualizam estado desnecessariamente
* requests duplicados
* efeitos que poderiam ser substituídos por derivação de dados
* efeitos sem cleanup

Investigue especialmente padrões como:

```typescript
useEffect(() => {
  fetchData()
}, [someObject])
```

quando `someObject` é recriado durante render.

---

# 7. API PERFORMANCE

Analise todas as chamadas HTTP.

Mapeie:

```text
Component
 ↓
Hook
 ↓
Service
 ↓
HTTP
 ↓
API
```

Identifique:

* requests duplicados
* requests sequenciais
* requests paralelos que poderiam ser agrupados
* requests desnecessários
* requests executados novamente sem necessidade
* falta de cache
* falta de deduplicação
* payloads grandes
* dados que não são utilizados
* endpoints chamados por múltiplos MFEs

Procure padrões como:

```text
MFE A → GET /users
MFE B → GET /users
MFE C → GET /users
```

Avalie se existe oportunidade de:

* cache
* request deduplication
* shared data
* backend aggregation

---

# 8. ABORT / RACE CONDITIONS

Verifique requests que podem continuar depois que um componente foi desmontado.

Procure:

```typescript
AbortController
```

e identifique onde ele seria necessário.

Investigue:

```text
User types
 ↓
Request A
 ↓
User types again
 ↓
Request B
 ↓
Request A finishes after B
```

Isso pode gerar dados incorretos na UI.

Avalie:

* debounce
* cancellation
* request deduplication

---

# 9. LIST PERFORMANCE

Procure:

```typescript
.map()
.filter()
.sort()
.reduce()
```

em renderizações.

Analise:

* tamanho das listas
* quantidade de elementos renderizados
* cálculos dentro do render
* filtros repetidos
* ordenações repetidas
* componentes pesados dentro das listas

Avalie quando seria necessário:

* pagination
* infinite scroll
* virtualization
* memoization

Não introduza virtualização se a quantidade de dados não justificar.

---

# 10. JAVASCRIPT PERFORMANCE

Procure:

* loops desnecessários
* cálculos repetidos
* parsing excessivo
* JSON muito grande
* serialização/deserialização
* objetos gigantes
* processamento no main thread
* long tasks
* operações síncronas pesadas

Identifique possíveis problemas de:

```text
CPU
Memory
Main Thread
Garbage Collection
```

---

# 11. MEMORY LEAKS

Faça uma auditoria específica de memória.

Procure:

* event listeners
* timers
* intervals
* subscriptions
* observers
* WebSockets
* references mantidas após unmount
* caches sem limite
* closures mantendo objetos grandes
* componentes desmontados que continuam executando

Analise especialmente a navegação:

```text
Host
 ↓
MFE A mount
 ↓
MFE A unmount
 ↓
MFE B mount
 ↓
MFE B unmount
 ↓
MFE A mount novamente
```

Verifique se memória e listeners crescem a cada ciclo.

---

# 12. BUILD PERFORMANCE

Analise o build.

Verifique:

* bundle size
* chunks
* tree shaking
* code splitting
* dynamic imports
* minificação
* compressão
* source maps
* dependências
* dependências duplicadas
* bibliotecas grandes
* imports incorretos

Procure imports como:

```typescript
import _ from "lodash";
```

quando apenas uma pequena funcionalidade é utilizada.

Avalie:

```typescript
import debounce from "lodash/debounce";
```

ou alternativas mais leves quando fizer sentido.

Não substitua dependências automaticamente. Primeiro quantifique o impacto.

---

# 13. DEAD CODE

Procure:

* arquivos não utilizados
* componentes não utilizados
* funções não utilizadas
* imports não utilizados
* dependências não utilizadas
* feature flags antigas
* código comentado
* código legado
* exports não utilizados

Explique:

```text
Dead code
 ↓
Build
 ↓
Bundle
 ↓
Download
 ↓
Parse
 ↓
Memory
```

---

# 14. IMAGES / ASSETS

Analise:

* tamanho das imagens
* formatos
* lazy loading
* responsive images
* imagens acima da dobra
* imagens abaixo da dobra
* SVG
* fontes
* ícones

Avalie:

```text
WebP
AVIF
SVG
lazy loading
preload
```

quando aplicável.

---

# 15. HTTP / NETWORK

Analise:

* número de requests
* requests bloqueantes
* waterfall
* HTTP caching
* Cache-Control
* ETag
* compressão
* CDN
* HTTP/2
* HTTP/3
* keep-alive

Procure oportunidades de reduzir:

```text
Requests
Payload
Latency
Blocking
```

---

# 16. CORE WEB VITALS

Avalie:

* LCP
* INP
* CLS
* FCP
* TTFB

Explique quais partes da arquitetura podem afetar cada métrica.

Não invente métricas.

Se não for possível medir uma métrica diretamente no ambiente atual, diga:

```text
Não foi possível medir diretamente.
```

e explique como medir.

---

# 17. CHROME DEVTOOLS

Crie um plano de investigação usando:

### Network

Verificar:

* requests
* tamanho
* tempo
* waterfall
* cache
* duplicação

### Performance

Verificar:

* long tasks
* scripting
* rendering
* painting
* layout
* garbage collection

### Memory

Verificar:

* heap snapshots
* detached DOM
* listeners
* crescimento de memória

### React DevTools

Verificar:

* commits
* renders
* componentes que renderizam excessivamente

---

# 18. PERFORMANCE BUDGET

Proponha budgets razoáveis para a aplicação.

Exemplo:

```text
Initial JS
Initial CSS
Number of requests
Largest chunk
LCP
INP
CLS
API latency
```

Não invente números como requisitos absolutos.

Explique que os valores devem ser calibrados de acordo com:

* ambiente
* dispositivo
* rede
* objetivo da aplicação

---

# 19. FRONTEND × BACKEND

Mesmo que o backend não esteja neste repositório, identifique problemas que podem estar relacionados à API.

Exemplos:

```text
Frontend espera 1.5s
```

Mas:

```text
API = 100ms
React rendering = 900ms
```

ou:

```text
React = 50ms
API = 1.2s
```

Diferencie claramente:

```text
Frontend bottleneck
Backend bottleneck
Network bottleneck
Browser bottleneck
```

Não atribua o problema ao frontend ou backend sem evidência.

---

# 20. PRIORIDADE

Classifique cada problema:

### P0 — Crítico

Impacto significativo na experiência ou estabilidade.

### P1 — Alto

Impacto relevante e solução recomendada.

### P2 — Médio

Melhoria importante, mas não urgente.

### P3 — Baixo

Otimização marginal ou melhoria futura.

Não utilize ranking subjetivo.

Baseie a prioridade em:

```text
Impacto
Frequência
Complexidade
Risco
Custo
```

---

# 21. RELATÓRIO FINAL

Gere um relatório contendo:

## Executive Summary

Resumo dos principais problemas.

## Architecture

Mapa da arquitetura.

## Findings

Para cada problema:

```text
ID:
Categoria:
Arquivo:
Linha:
Problema:
Evidência:
Impacto:
Causa:
Recomendação:
Trade-off:
Complexidade:
Como medir:
```

## Quick Wins

Mudanças pequenas com potencial de impacto significativo.

## Medium Term

Mudanças que exigem refatoração moderada.

## Long Term

Mudanças arquiteturais.

## Do Not Optimize

Liste coisas que parecem otimizações, mas que você NÃO recomenda fazer porque:

* não existe evidência de problema;
* impacto é insignificante;
* aumenta complexidade;
* dificulta manutenção;
* cria overengineering.

Esta seção é obrigatória.

---

# 22. IMPLEMENTAÇÃO

Depois de concluir a auditoria, NÃO altere código automaticamente.

Primeiro apresente o relatório.

Somente implemente alterações quando solicitado.

Se solicitado a implementar:

1. Faça uma alteração por vez.
2. Execute os testes.
3. Execute lint/typecheck.
4. Faça build.
5. Compare o resultado.
6. Explique o impacto.
7. Não altere comportamento funcional.

---

# PRINCÍPIO DE SENIORIDADE

Não quero uma lista genérica de boas práticas.

Quero encontrar problemas reais neste código.

O resultado deve responder:

> "Onde esta aplicação está gastando tempo, CPU, memória, rede ou bytes desnecessariamente?"

E depois:

> "Qual é a menor mudança capaz de resolver esse problema?"

Sempre prefira:

```text
Measure
   ↓
Understand
   ↓
Optimize
   ↓
Measure again
```

em vez de:

```text
Add useMemo everywhere
Add lazy everywhere
Add caching everywhere
```

A prioridade é:

**performance real + simplicidade + manutenção + evidência.**

