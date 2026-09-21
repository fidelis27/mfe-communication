# PERF-006 - Instrumentar carregamento dos remotes

## Objetivo

Medir a duracao e o resultado do carregamento de cada remote no Host.

## Escopo

- Marcar inicio, fim e erro de cada import Federation.
- Associar a medicao ao nome do modulo.
- Diferenciar falha de rede, timeout e erro de render quando possivel.
- Preservar o fallback e o retry existentes.

## Fora do escopo

- Precarregar todos os remotes.
- Alterar a navegacao ou a politica de cache sem medicao.

## Validacao

- Medir navegacao para cada rota.
- Comparar tempo ate primeiro conteudo do MFE.
- Testar sucesso, falha e retry do remote.
