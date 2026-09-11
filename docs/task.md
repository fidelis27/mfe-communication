# Plano de execucao - prototipo completo

## Gate

- [ ] Aprovar `context.md`.
- [ ] Aprovar `spec-functional.md`.
- [ ] Aprovar `spec-technical.md`.
- [ ] Aprovar `deployment.md`.
- [ ] Confirmar inicio da implementacao.

Nenhum codigo de aplicacao deve ser implementado antes de todos os itens do
Gate serem aprovados.

## Dia 1 - backend Go e MariaDB/MySQL

- [ ] Criar modulo Go e estrutura `cmd/server` e `internal`.
- [ ] Criar migrations MariaDB e conexao com `DB_HOST`, `DB_PORT`, `DB_NAME`,
  `DB_USER`, `DB_PASSWORD` e `DB_TLS`.
- [ ] Persistir instituicoes, unidades, cursos e usuarios.
- [ ] Persistir estudantes e vinculos academicos.
- [ ] Implementar transacao de transferencia.
- [ ] Implementar trancamento e reabertura.
- [ ] Implementar autorizacao por escopo.
- [ ] Expor API HTTP e erros padronizados.
- [ ] Criar testes de schema, repositorios, casos de uso e autorizacao.

## Dia 2 - eventos, WebSocket e MFEs

- [ ] Consolidar contratos de eventos no pacote compartilhado.
- [ ] Persistir eventos no MariaDB/MySQL antes da distribuicao.
- [ ] Implementar WebSocket `/events` com `eventId` e `correlationId`.
- [ ] Implementar reconexao, deduplicacao e estado de conexao.
- [ ] Implementar barramento local `window.bus`/`EventTarget`.
- [ ] Configurar Vite e Module Federation real no Host.
- [ ] Publicar e carregar o MFE Institution.
- [ ] Publicar e carregar o MFE Student.
- [ ] Separar containers e componentes de apresentacao.
- [ ] Criar fundacao visual institucional com SCSS, tokens e namespaces BEM.
- [ ] Configurar React Aria Components para controles acessiveis.
- [ ] Implementar Shell, navegacao lateral, barra superior e area principal.

## Dia 3 - MFEs restantes, qualidade e deploy

- [ ] Implementar MFE Admin com papeis e escopos.
- [ ] Implementar MFE Activity consumindo eventos persistidos.
- [ ] Implementar MFE Dashboard com projecoes persistidas.
- [ ] Implementar estados `idle`, `loading`, `empty`, `success` e `error`.
- [ ] Garantir layout responsivo, foco visivel, labels e feedback acessivel.
- [ ] Validar isolamento de estilos entre remotes.
- [ ] Adicionar logs estruturados e metricas sem dados pessoais.
- [ ] Validar acessibilidade, CORS, HTTPS/WSS e LGPD.
- [ ] Configurar build independente de Host e todos os remotes.
- [ ] Publicar backend Go conectado a MariaDB/MySQL persistente.
- [ ] Executar testes unitarios, integracao e ponta a ponta.
- [ ] Validar reinicio/redeploy sem perda de dados.
- [ ] Registrar URLs, variaveis, limites e rollback.

## Criterios de pronto

- [ ] Todos os dados de negocio estao no MariaDB/MySQL.
- [ ] Nenhum repositorio de negocio usa memoria como fonte de verdade.
- [ ] Host carrega todos os remotes por Module Federation.
- [ ] API Go e WebSocket funcionam em ambiente publicado.
- [ ] Activity e Dashboard reagem aos eventos.
- [ ] Transferencia e feita em transacao e preserva historico.
- [ ] Administrador e membro possuem permissoes diferentes.
- [ ] Testes e builds passam.
- [ ] Banco persiste apos restart e redeploy.
- [ ] Nao existem dados pessoais reais no ambiente de demonstracao.

## Fora da primeira entrega

- Alta disponibilidade multi-regiao.
- Broker distribuido com garantia exactly-once.
- SSO/OAuth de producao.
- Integracoes externas com USP, UNESP ou Fatec.
- Operacao com dados pessoais reais sem avaliacao de privacidade.
