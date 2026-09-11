# Especificacao funcional - Secretaria escolar multi-MFE

## 1. Objetivo e resultado

Permitir que um operador de secretaria consulte instituicoes e cadastre
estudantes vinculados a elas. Cada alteracao deve gerar um evento de dominio
que possa ser consumido por Activity e Dashboard sem acoplamento direto entre
as telas.

O resultado do MVP e um fluxo demonstravel e testavel, nao cinco MFEs
completos.

## 2. Atores e permissoes

- **Superadministrador:** le e altera qualquer instituicao; administra grupos
	e usuarios.
- **Administrador da instituicao:** le e altera dados da instituicao a que
	pertence e seus estudantes.
- **Membro:** le dados autorizados, mas nao executa alteracoes administrativas.
- **Usuario inativo ou nao autenticado:** nao acessa operacoes protegidas.

No prototipo, a identidade e selecionada pela cabecalho `x-demo-user`.

## 3. MVP

### Incluido

1. Shell com navegacao para Instituicoes, Estudantes, Atividades e Dashboard.
2. Lista e cadastro de instituicoes.
3. Edicao e inativacao de instituicoes.
4. Lista e cadastro de estudantes por instituicao.
5. Autorizacao para leitura e edicao.
6. Publicacao de eventos de instituicao e estudante.
7. Feed de atividades derivado dos eventos.
8. Contador de instituicoes ou estudantes atualizado pelo consumo de eventos.

### Fora do escopo

- Banco persistente, importacao em massa e integracoes externas.
- Login real, OAuth, recuperacao de senha e gestao completa de identidade.
- Matricula, notas, frequencia, financeiro e documentos escolares.
- Entrega duravel, retentativas distribuidas e garantia exactly-once.
- Module Federation real, caso ele nao seja necessario para validar o fluxo.

## 4. Regras de negocio

- Uma instituicao possui identificador, nome e estado.
- Uma instituicao ativa pode receber novos estudantes.
- Uma instituicao inativa permanece consultavel para historico, mas nao recebe
	novos estudantes.
- Todo estudante possui identificador e `institutionId`.
- O `institutionId` deve referenciar uma instituicao existente e ativa no
	momento do cadastro.
- Uma operacao de escrita autorizada publica um unico evento correspondente.
- Eventos consumidos devem alimentar Activity e Dashboard sem importar
	implementacoes internas de outro MFE.

## 5. Estados de interface

Toda tela de leitura ou escrita deve representar:

- `idle`: tela pronta para iniciar uma acao.
- `loading`: consulta ou envio em andamento; controles relevantes ficam
	protegidos contra duplicidade.
- `success`: operacao concluida e feedback visivel.
- `empty`: consulta valida sem registros.
- `error`: falha com mensagem acionavel e possibilidade de tentar novamente.

## 6. Fluxos principais

### Cadastro de instituicao

1. Usuario autorizado abre Instituicoes.
2. Sistema exibe lista ou estado vazio.
3. Usuario informa os campos obrigatorios e confirma.
4. Sistema valida, persiste, publica `INSTITUTION_CREATED` e atualiza a lista.

### Cadastro de estudante

1. Usuario seleciona uma instituicao ativa.
2. Sistema exibe estudantes e opcao de cadastro conforme permissao.
3. Usuario informa os campos obrigatorios e confirma.
4. Sistema valida o vinculo, persiste, publica `STUDENT_CREATED` e atualiza a
	 lista.

### Consumo de evento

1. Activity registra uma entrada legivel para cada evento consumido.
2. Dashboard atualiza pelo menos uma agregacao relacionada ao evento.
3. Falha de consumo nao pode apagar o dado autoritativo nem bloquear novas
	 escritas; deve ser observavel no estado de erro.

## 7. Contratos funcionais de eventos

Eventos iniciais:

- `INSTITUTION_CREATED`, `INSTITUTION_UPDATED`,
	`INSTITUTION_INACTIVATED`.
- `STUDENT_CREATED`, `STUDENT_UPDATED`.

Todos possuem `type`, `payload` e `occurredAt`. A proxima versao deve incluir
`eventId`, `version`, `source` e `correlationId`.

## 8. Criterios de aceite

- Instituicoes podem ser listadas, criadas, editadas e inativadas por usuario
	autorizado.
- Estudantes podem ser listados e criados dentro de uma instituicao ativa por
	usuario autorizado.
- Usuario sem permissao recebe `401` ou `403` e nenhum dado e alterado.
- Instituicao inexistente ou inativa impede o cadastro do estudante.
- Cada escrita bem-sucedida publica exatamente um evento valido.
- Activity exibe os eventos consumidos em ordem decrescente de ocorrencia.
- Dashboard altera seu indicador depois do consumo do evento.
- Listas vazias, carregamento, sucesso e erro sao distinguiveis na interface.
- O fluxo principal possui testes automatizados de regra e autorizacao.

## 9. Decisoes desta rodada

- O fluxo instituicao -> estudante e prioritario.
- O transporte de eventos sera em memoria no MVP.
- A composicao pode ser feita por rotas durante a validacao funcional; Module
	Federation fica como etapa tecnica posterior.
- `spec-functional.md` e `spec-technical.md` sao os nomes canonicos atuais;
	os nomes abreviados `func.spec.md` e `tec.spec.md` representam a mesma
	intencao documental.

## 10. Validacao antes de expandir escopo

Depois de cada fatia, executar testes, verificar estados de erro e revisar o
diff contra os criterios acima. Nao iniciar Dashboard, Activity ou Module
Federation como trabalho separado enquanto o cadastro de instituicao e
estudante nao estiver verificavel de ponta a ponta.

## 11. Gate de aprovacao

Esta especificacao e apenas documental nesta etapa. A implementacao fica
bloqueada ate a aprovacao explicita do contexto, desta especificacao funcional
e da especificacao tecnica.
