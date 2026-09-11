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
	pertence, seus estudantes e seus vinculos; administra permissoes dentro do
	escopo autorizado.
- **Membro autorizado:** cadastra e consulta estudantes dentro do escopo
	delegado, mas nao administra usuarios, grupos ou politicas.
- **Usuario inativo ou nao autenticado:** nao acessa operacoes protegidas.

No prototipo, a identidade e selecionada pela cabecalho `x-demo-user`.

## 3. MVP

### Incluido

1. Shell com navegacao para Instituicoes, Estudantes, Atividades e Dashboard,
	com Module Federation real.
2. Lista e cadastro de instituicoes.
3. Edicao e inativacao de instituicoes.
4. Lista e cadastro de estudantes por instituicao.
5. Trancamento, reabertura e transferencia de vinculo, com historico.
6. Autorizacao para leitura e edicao de administradores e membros delegados.
7. Publicacao de eventos de instituicao, estudante e vinculo.
8. Feed de atividades derivado dos eventos.
9. Contador de instituicoes ou estudantes atualizado pelo consumo de eventos.
10. Atualizacao realtime entre MFE, host e modal consumidor.

### Fora do escopo

- Banco persistente, importacao em massa e integracoes externas.
- Login real, OAuth, recuperacao de senha e gestao completa de identidade.
- Notas, frequencia, financeiro e documentos escolares.
- Entrega duravel, retentativas distribuidas e garantia exactly-once.
- Integracoes externas com sistemas academicos de USP, UNESP ou Fatec.

## 4. Regras de negocio

- O ambiente possui varias instituicoes e unidades, identificadas por nome,
	sigla, tipo, municipio, UF, campus e status.
- Uma instituicao ativa pode receber novos estudantes.
- Uma instituicao inativa permanece consultavel para historico, mas nao recebe
	novos estudantes.
- Um estudante possui cadastro civil unico e um ou mais vinculos historicos;
	nao pode haver dois vinculos ativos simultaneos sem uma regra aprovada.
- O vinculo referencia instituicao, campus, curso, situacao e datas.
- Transferencia encerra o vinculo de origem e cria o vinculo de destino dentro
	de uma operacao rastreavel.
- Trancamento preserva o vinculo e permite reabertura por usuario autorizado.
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

### Transferencia, trancamento e reabertura

1. Usuario autorizado seleciona o vinculo do estudante.
2. Para trancamento, informa motivo e data; o vinculo passa a `suspended`.
3. Para reabertura, confirma a operacao; o vinculo retorna a `active`.
4. Para transferencia, seleciona instituicao e curso de destino; o sistema
	encerra o vinculo de origem e cria o vinculo de destino, preservando o
	historico.
5. O sistema publica o evento correspondente com o mesmo `correlationId` da
	operacao.

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
- `ENROLLMENT_SUSPENDED`, `ENROLLMENT_REOPENED`, `STUDENT_TRANSFERRED`.
- `STUDENT_CREATED_SUCCESS`, `STUDENT_CREATED_ERROR` para interacao entre MFE
	e consumidor de modal.

Todos possuem `eventId`, `type`, `version`, `source`, `correlationId`,
`occurredAt` e `payload`. Eventos de sucesso/erro devem ser consumidos em
tempo real e permitir que o consumidor reaja sem importar codigo do MFE.

## 8. Criterios de aceite

- Instituicoes podem ser listadas, criadas, editadas e inativadas por usuario
	autorizado.
- Estudantes podem ser listados e criados dentro de uma instituicao ativa por
	usuario autorizado.
- Usuario sem permissao recebe `401` ou `403` e nenhum dado e alterado.
- Instituicao inexistente ou inativa impede o cadastro do estudante.
- Um estudante transferido possui historico de origem e novo vinculo de destino.
- Trancamento e reabertura alteram a situacao sem apagar o historico.
- Cada escrita bem-sucedida publica exatamente um evento valido.
- Um modal consumidor fecha somente ao receber o evento de sucesso correlato;
	em erro, permanece aberto e exibe a falha.
- Activity exibe os eventos consumidos em ordem decrescente de ocorrencia.
- Dashboard altera seu indicador depois do consumo do evento.
- Listas vazias, carregamento, sucesso e erro sao distinguiveis na interface.
- O fluxo principal possui testes automatizados de regra e autorizacao.

## 9. Decisoes do PO

- O produto e multi-institucional dentro de uma instalacao compartilhada.
- O fluxo instituicao -> estudante -> vinculo -> evento e prioritario.
- O estudante possui cadastro unico e no maximo um vinculo ativo no MVP.
- Administrador gerencia configuracao e permissoes; membro executa operacoes
	delegadas de estudante e vinculo dentro do seu escopo.
- Instituicao, Estudante e Host sao P0; Activity e Dashboard sao P1; Admin
	tem apenas o necessario para demonstrar papeis.
- Module Federation real e obrigatorio para validar a arquitetura MFE.
- WebSocket e o transporte realtime escolhido para o MVP.
- Eventos de dominio serao produzidos pelo backend e eventos de interacao
	serao transmitidos em tempo real ao host e aos MFEs interessados.
- Os dados de demonstracao serao institucionais publicos e estudantes
	ficticios/anonimizados; nao havera integracao com USP, UNESP ou Fatec.
- `spec-functional.md` e `spec-technical.md` sao os nomes canonicos atuais;
	os nomes abreviados `func.spec.md` e `tec.spec.md` representam a mesma
	intencao documental.

## 10. Validacao antes de expandir escopo

Depois de cada fatia, executar testes, verificar estados de erro e revisar o
diff contra os criterios acima. A primeira fatia deve provar o carregamento de
um remote por Module Federation e a conexao WebSocket; o fluxo de negocio sera
expandido em seguida sem substituir a composicao real por rotas como
demonstracao principal.

## 11. Gate de aprovacao

Esta especificacao e apenas documental nesta etapa. A implementacao fica
bloqueada ate a aprovacao explicita do contexto, desta especificacao funcional
e da especificacao tecnica.
