# PERF-005 - Paginar listas de recursos

## Status

Concluido. As listas de estudantes, instituicoes, pessoas, grupos, membros e
eventos exibem no maximo 20 itens por pagina, com navegacao anterior/proxima.
Filtros, estados de carregamento, erro e vazio permanecem disponiveis.

## Limites atuais

A paginacao acontece no frontend e limita o DOM renderizado; ela nao reduz o
payload recebido. As APIs ainda retornam as listas completas. O historico de
atividade permanece limitado a 30 eventos pela consulta e exibe ate 20 por
pagina.

## Evidencia de renderizacao

No teste sintetico local do Student, foram observados 624 nos DOM com 100
registros, 6.024 com 1.000 e 60.024 com 10.000. A medicao ocorreu em JSDOM e
nao representa um benchmark de navegador em producao. Com a pagina de 20 itens,
a interface mantem no maximo 20 linhas de cada lista visivel.
