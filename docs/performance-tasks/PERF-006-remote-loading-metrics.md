# PERF-006 - Instrumentar carregamento dos remotes

## Objetivo

Medir a duracao e o resultado do carregamento de cada remote no Host.

## Status e implementacao

Instrumentacao implementada para os cinco remotes. O Host publica o evento
`mfe:remote-load` no `window`, com `remoteName`, numero da tentativa, fase
(`start`, `success` ou `error`) e timestamps; os eventos de conclusao incluem
a duracao em milissegundos. Tambem sao criadas marcas e medidas User Timing
com o formato `mfe:remote:<nome>:<tentativa>:duration`, disponiveis em
`performance.getEntriesByType("measure")`.

O erro da importacao e relancado para preservar o fluxo do Error Boundary.
Erros de render continuam sendo capturados pelo `RemoteBoundary` e enviados ao
Sentry existente. A medicao identifica falha de importacao, mas nao consegue
distinguir por si so falha de rede de timeout; isso depende do erro exposto
pelo runtime do Module Federation. Nao foi adicionado um timeout artificial.

## Escopo

- Marcar inicio, fim e erro de cada import Federation.
- Associar a medicao ao nome do modulo.
- Diferenciar erro de importacao de erro de render.
- Preservar o fallback e o retry existentes.

## Fora do escopo

- Precarregar todos os remotes.
- Alterar a navegacao ou a politica de cache sem medicao.

## Validacao

- Testes automatizados verificam eventos de inicio, sucesso e erro, medida de
  duracao e propagacao da rejeicao ao Error Boundary.
- O tempo instrumentado termina quando o import dinamico resolve; ele mede o
  carregamento do modulo e nao o tempo ate o primeiro conteudo renderizado.
- A medicao em navegador deve ser coletada apos o deploy ouvindo o evento
  `mfe:remote-load` ou consultando a Performance API. Comparacoes de rotas e
  tempos de render permanecem fora da validacao automatizada local.
