# PERF-002 - Centralizar WebSocket no Shared

## Objetivo

Eliminar a duplicacao da conexao WebSocket entre `@mfe/shared`, Activity e Dashboard.

## Escopo

- Reutilizar `useDomainEvents` nos consumidores.
- Preservar reconexao, backoff, cleanup, parsing e deduplicacao por `eventId`.
- Manter filtros e estados visuais especificos em cada MFE.

## Fora do escopo

- Alterar o contrato da API.
- Trocar WebSocket por outro transporte.
- Adicionar cache global.

## Validacao

- Testar cleanup no unmount.
- Testar reconexao e deduplicacao.
- Confirmar uma conexao por MFE montado.
- Executar testes e builds dos pacotes afetados.
