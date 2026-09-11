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

Composicao por rotas e o caminho padrao do MVP. Module Federation sera adotado
quando houver configuracao de build, manifestos remotos, compartilhamento de
React como singleton e um teste de carregamento independente.

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

Rotas protegidas usam a identidade demonstrativa e carregam o usuario antes
da politica de autorizacao. Respostas de erro devem usar pelo menos `401`,
`403`, `404` e `422` conforme a causa.

## 5. Modelo de dados minimo

```ts
type InstitutionStatus = "active" | "inactive";

interface Institution {
	id: string;
	name: string;
	status: InstitutionStatus;
}

interface Student {
	id: string;
	institutionId: string;
	name: string;
	status: "active" | "inactive";
}
```

Os repositorios devem ser interfaces. O caso de uso nao pode depender do
`Map` usado pelo adaptador em memoria.

## 6. Eventos e transporte

Contrato minimo:

```ts
interface DomainEvent<TType extends string, TPayload> {
	type: TType;
	payload: TPayload;
	occurredAt: string;
}
```

O barramento em memoria deve permitir publicar e assinar por tipo de evento.
O produtor publica somente depois da persistencia bem-sucedida. Consumidores
devem ser tolerantes a eventos repetidos e ignorar tipos desconhecidos. Nao ha
garantia de durabilidade no MVP.

Evolucao planejada:

- adicionar `eventId`, `version`, `source` e `correlationId`;
- substituir o barramento por WebSocket/pub-sub ou broker;
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
- Module Federation e broker ficam fora do primeiro incremento para proteger o
	tempo do MVP.
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

1. Integrar o host e os MFEs prioritarios por rotas.
2. Implementar Activity e Dashboard como consumidores.
3. Adicionar estados de interface e tratamento de erros.
4. Adicionar `pino`, `pino-http`, `correlationId` e `prom-client`, se o custo
	de instalacao permanecer compatível com o tempo restante.
5. Validar acessibilidade, fluxo ponta a ponta e regressao.
6. Revisar diff, riscos, evidencias e limites para producao.

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
