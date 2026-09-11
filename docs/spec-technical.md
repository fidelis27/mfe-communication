# Especificacao tecnica - Secretaria escolar multi-MFE

## 1. Objetivo tecnico

Entregar um prototipo verificavel em Node.js, React e TypeScript, mantendo
contratos independentes da implementacao para permitir uma futura migracao do
backend para Java.

## 2. Fronteiras de responsabilidade

```text
Interface MFE
	-> cliente HTTP / adaptador de eventos
	-> caso de uso e autorizacao
	-> repositorio e barramento de eventos
	-> persistencia em memoria no MVP
```

- **Host:** navegacao, composicao e ciclo de vida dos MFEs.
- **MFE:** tela, estado visual e interacao do seu bounded context.
- **Backend:** autenticacao demonstrativa, autorizacao, casos de uso,
	persistencia autoritativa e publicacao de eventos.
- **Shared:** tipos e esquemas de contratos; nao deve conter regra de negocio
	de outro dominio.
- **Activity/Dashboard:** consumidores e projecoes; nao alteram a fonte
	autoritativa de Instituicao ou Estudante.

## 3. Stack e ambiente

- TypeScript 5 e Node.js.
- Express 4 para API HTTP.
- React para os MFEs.
- Vitest para testes.
- Monorepo npm com workspaces em `packages/*`.
- Repositorios em memoria para reduzir tempo de setup.
- `@originjs/vite-plugin-federation` para Module Federation no host e nos
	remotes, aproveitando a dependência já declarada no workspace frontend.
- WebSocket como transporte realtime do protótipo.

Module Federation real e obrigatorio no MVP. O host deve carregar remotes por
manifesto ou URL configuravel, compartilhar React como singleton e validar o
carregamento independente de cada MFE. Rotas simples podem existir como
fallback local, mas nao substituem a demonstracao principal.

## 4. APIs do MVP

Rotas planejadas:

- `GET /health`
- `GET /institutions`
- `POST /institutions`
- `PUT /institutions/:institutionId`
- `POST /institutions/:institutionId/inactivate`
- `GET /institutions/:institutionId/students`
- `POST /institutions/:institutionId/students`
- `GET /activities`
- `GET /dashboard/summary`
- `POST /students/:studentId/enrollments/:enrollmentId/suspend`
- `POST /students/:studentId/enrollments/:enrollmentId/reopen`
- `POST /students/:studentId/transfer`
- `GET /events/stream` ou endpoint WebSocket equivalente para eventos realtime

Rotas protegidas usam a identidade demonstrativa e carregam o usuario antes
da politica de autorizacao. Respostas de erro devem usar pelo menos `401`,
`403`, `404` e `422` conforme a causa.

## 5. Modelo de dados minimo

```ts
type InstitutionStatus = "active" | "inactive";
type EnrollmentStatus = "active" | "suspended" | "transferred" | "inactive";

interface Institution {
	id: string;
	name: string;
	status: InstitutionStatus;
}

interface Student {
	id: string;
	name: string;
	status: "active" | "inactive";
}

interface Enrollment {
	id: string;
	studentId: string;
	institutionId: string;
	campusId?: string;
	courseId?: string;
	status: EnrollmentStatus;
	startedAt: string;
	endedAt?: string;
}
```

Os repositorios devem ser interfaces. O caso de uso nao pode depender do
`Map` usado pelo adaptador em memoria.

## 6. Eventos e transporte

Contrato minimo para dominio e interacao realtime:

```ts
interface DomainEvent<TType extends string, TPayload> {
	eventId: string;
	type: TType;
	version: number;
	source: string;
	correlationId: string;
	payload: TPayload;
	occurredAt: string;
}
```

O barramento em memoria deve permitir publicar e assinar por tipo de evento.
O produtor publica somente depois da persistencia bem-sucedida. Consumidores
devem ser tolerantes a eventos repetidos e ignorar tipos desconhecidos. Um
adaptador WebSocket distribui eventos ao host e aos MFEs. Acoes de modal usam
eventos de sucesso/erro correlacionados; o
consumidor nao deve fechar o modal por mera tentativa de envio.

Evolucao planejada:

- autenticar e controlar a assinatura dos canais WebSocket;
- substituir o barramento local por broker;
- adicionar retentativa, dead-letter e idempotencia persistente.

## 7. Autenticacao e autorizacao

- A autenticacao demo resolve o usuario por `x-demo-user`.
- O middleware de identidade responde `401` quando nao ha sessao valida.
- O middleware de usuario rejeita usuarios inexistentes ou inativos.
- `AuthorizationPolicy` decide acesso por superadministrador e participacao em
	grupos/instituicoes.
- A regra deve ser testada fora do Express e coberta por testes de middleware.

Este mecanismo nao e adequado para producao; ele existe para validar o fluxo.

## 8. Testes e verificacao

Ordem de validacao de cada fatia:

1. Teste unitario do caso de uso ou politica.
2. Teste de integracao da rota com repositorio em memoria.
3. Teste do evento publicado e do consumidor correspondente.
4. Verificacao manual dos estados `loading`, `empty`, `success` e `error`.
5. Revisao do diff contra `context.md` e `spec-functional.md`.

Comandos atuais:

```bash
npm test
npm run start:dev
```

Antes da entrega, o TypeScript deve ser compilado sem erros e o fluxo
instituicao -> estudante -> evento deve possuir um teste automatizado.

## 9. Observabilidade minima

Registrar em desenvolvimento: identificador do caso de uso, tipo do evento,
data de ocorrencia, resultado do consumidor e erro de validacao. Nao registrar
dados pessoais completos nos logs.

## 10. Riscos tecnicos e limites

- Memoria local nao representa concorrencia, reinicio ou escalabilidade.
- Eventos em memoria nao sobrevivem a falhas.
- A ausencia de um banco pode ocultar constraints de unicidade e transacao.
- Module Federation real, remotes indisponiveis e reconexao realtime sao riscos
	centrais do primeiro incremento.
- Transferencias exigem consistencia entre o vinculo de origem e o de destino.
- Dados pessoais exigem minimizacao, mascaramento, criptografia e auditoria de
	acesso conforme a politica de privacidade do produto.
- Dados reais devem ser anonimizados ou substituidos por dados ficticios no
	ambiente local.

## 11. Plano de dois dias

### Dia 1 - backend e fatia vertical

1. Consolidar tipos, repositorios, casos de uso e testes de dominio.
2. Expor leitura, criacao, edicao e inativacao de instituicao.
3. Expor cadastro e listagem de estudante com autorizacao.
4. Publicar eventos apos escrita bem-sucedida.
5. Cobrir o fluxo com testes unitarios e de integracao.

### Dia 2 - frontend, consumidores e observabilidade

1. Configurar Module Federation real e integrar o host aos MFEs prioritarios.
2. Configurar WebSocket e validar eventos realtime correlacionados.
3. Implementar Activity e Dashboard como consumidores.
4. Adicionar estados de interface e tratamento de erros.
5. Adicionar `pino`, `pino-http`, `correlationId` e `prom-client`, se o custo
	de instalacao permanecer compatível com o tempo restante.
6. Validar acessibilidade, fluxo ponta a ponta e regressao.
7. Revisar diff, riscos, evidencias e limites para producao.

Cada fatia deve terminar com teste executado e diff revisado. Qualquer
requisito novo deve ser registrado nas specs antes de ampliar a implementacao.

## 12. Definicao de pronto do prototipo

Esta definicao descreve o alvo futuro do prototipo e nao autoriza seu inicio.
Nenhuma implementacao, instalacao de dependencia ou alteracao de configuracao
deve ocorrer antes da aprovacao explicita das tres especificacoes.

O prototipo sera considerado completo quando:

- o fluxo instituicao -> estudante -> evento -> Activity/Dashboard funcionar;
- as regras de autorizacao tiverem testes;
- estados de sucesso, vazio e erro forem visiveis;
- logs nao expuserem dados pessoais desnecessarios;
- `npm test` e a compilacao TypeScript passarem;
- as limitacoes de producao estiverem documentadas.

Completo, neste contexto, significa completo para demonstracao e validacao do
MVP. Nao significa pronto para operar em producao.
