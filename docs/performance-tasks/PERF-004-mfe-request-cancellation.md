# PERF-004 - Cancelar requests dos MFEs

## Objetivo

Evitar respostas tardias e trabalho de rede depois que um MFE foi desmontado ou
quando uma consulta mais nova substituiu a anterior.

## Escopo

- Institution, Activity, Dashboard e Admin.
- Propagar `AbortSignal`.
- Tratar `AbortError` como cancelamento normal.
- Proteger submits contra duplicidade.

## Fora do escopo

- Criar cache ou cliente HTTP completo.
- Alterar contratos de resposta.

## Validacao

- Desmontar cada MFE durante request em voo.
- Usar throttling e navegar rapidamente.
- Testar ausencia de atualizacao apos abort.
