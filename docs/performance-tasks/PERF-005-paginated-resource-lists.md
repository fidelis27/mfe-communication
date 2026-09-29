# PERF-005 - Medir e paginar listas

## Objetivo

Evitar payloads e DOM crescentes quando listas de estudantes, instituicoes,
pessoas, grupos ou eventos aumentarem.

## Escopo

- Medir com volumes representativos antes de alterar a UI.
- Adicionar paginacao somente aos recursos que excederem o limite observado.
- Preservar estados vazio, loading, erro e filtros.

## Fora do escopo

- Virtualizacao sem evidencia de custo.
- Alterar ordenacao sem criterio funcional.

## Validacao

- Cenarios com 100, 1.000 e 10.000 registros.
- Tamanho das respostas, tempo de scripting e heap.
- Testes de paginacao e build dos pacotes afetados.
