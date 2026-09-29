# PERF-003 - Reduzir refresh do Dashboard

## Objetivo

Evitar tres GETs completos a cada mensagem WebSocket recebida pelo Dashboard.

## Escopo

- Coalescer eventos em uma janela controlada.
- Evitar requests concorrentes e refresh redundante.
- Preservar indicadores e estado de conexao.

## Fora do escopo

- Criar endpoint de agregados sem medir volume.
- Alterar eventos do backend.
- Introduzir cache global.

## Validacao

- Contar requests por evento antes e depois.
- Testar eventos consecutivos e atualizacao dos indicadores.
- Executar build e testes do Dashboard.
