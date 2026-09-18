# PERF-007 - Confirmar duplicacao de runtime

## Objetivo

Medir se React, React DOM ou o runtime do Module Federation estao sendo
baixados mais de uma vez no Host e nos remotes.

## Escopo

- Network waterfall em Preview/producao.
- Coverage e tamanhos transferidos.
- Comparacao entre bytes brutos e bytes efetivamente transferidos.

## Fora do escopo

- Alterar Federation sem evidencia de duplicacao.
- Trocar React, Vite ou o plugin de Federation.

## Validacao

- Registrar requests e tamanhos por rota.
- Comparar cold cache e warm cache.
- Propor mudanca somente se houver ganho mensuravel.
