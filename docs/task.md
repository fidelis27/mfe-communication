# Plano de execucao - prototipo completo

## Gate

- [x] Aprovar `context.md`.
- [x] Aprovar `spec-functional.md`.
- [x] Aprovar `spec-technical.md`.
- [x] Aprovar `deployment.md`.
- [x] Confirmar inicio da implementacao.

Nenhum codigo de aplicacao deve ser implementado antes de todos os itens do
Gate serem aprovados.

## Dia 1 - backend Go e MariaDB/MySQL

- [x] Criar modulo Go em `modules/backend` com estrutura `cmd/server` e `internal`.
- [x] Criar migrations MariaDB e configuracao com `DB_HOST`, `DB_PORT`, `DB_NAME`,
      `DB_USER`, `DB_PASSWORD` e `DB_TLS`.
- [x] Persistir instituicoes e usuarios.
- [x] Persistir estudantes e vinculos academicos.
- [x] Implementar transacao de transferencia.
- [x] Implementar trancamento e reabertura.
- [x] Implementar autorizacao por escopo.
- [x] Expor API HTTP e erros padronizados.
- [x] Criar testes de repositorios, casos de uso e autorizacao.

## Dia 2 - eventos, WebSocket e MFEs

- [x] Consolidar contratos de eventos no pacote compartilhado.
- [x] Persistir eventos no MariaDB/MySQL antes da distribuicao.
- [x] Implementar WebSocket `/events` com `eventId` e `correlationId`.
- [x] Implementar reconexao, deduplicacao e estado de conexao.
- [ ] Implementar barramento local `window.bus`/`EventTarget`.
- [x] Configurar Vite e Module Federation real no Host.
- [x] Publicar e carregar o MFE Institution.
- [x] Publicar e carregar o MFE Student.
- [ ] Separar containers e componentes de apresentacao.
- [ ] Criar fundacao visual institucional com SCSS, tokens e namespaces BEM.
- [ ] Configurar React Aria Components para controles acessiveis.
- [x] Implementar Shell, navegacao lateral, barra superior e area principal.

## Dia 3 - MFEs restantes, qualidade e deploy

- [x] Implementar MFE Admin com papeis e escopos.
- [x] Implementar MFE Activity consumindo eventos persistidos.
- [x] Implementar MFE Dashboard com projecoes persistidas.
- [x] Implementar estados `idle`, `loading`, `empty`, `success` e `error`.
- [ ] Garantir layout responsivo, foco visivel, labels e feedback acessivel.
- [ ] Validar isolamento de estilos entre remotes.
- [x] Adicionar logs estruturados e metricas sem dados pessoais.
- [ ] Validar acessibilidade, CORS, HTTPS/WSS e LGPD.
- [x] Configurar build independente de Host e todos os remotes.
- [ ] Publicar backend Go conectado a MariaDB/MySQL persistente.
- [x] Executar testes unitarios e de integracao opt-in.
- [ ] Validar reinicio/redeploy sem perda de dados.
- [ ] Registrar URLs, variaveis, limites e rollback.

## Criterios de pronto

- [x] Todos os dados de negocio estao no MariaDB/MySQL.
- [x] Nenhum repositorio de negocio usa memoria como fonte de verdade.
- [x] Host carrega todos os remotes por Module Federation.
- [ ] API Go e WebSocket funcionam em ambiente publicado.
- [x] Activity e Dashboard reagem aos eventos.
- [x] Transferencia e feita em transacao e preserva historico.
- [x] Administrador e membro possuem permissoes diferentes.
- [x] Testes e builds passam.
- [ ] Banco persiste apos restart e redeploy.
- [ ] Nao existem dados pessoais reais no ambiente de demonstracao.

## Fora da primeira entrega

- Alta disponibilidade multi-regiao.
- Broker distribuido com garantia exactly-once.
- SSO/OAuth de producao.
- Integracoes externas com USP, UNESP ou Fatec.
- Operacao com dados pessoais reais sem avaliacao de privacidade.
