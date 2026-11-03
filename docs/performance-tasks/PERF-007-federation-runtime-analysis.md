# PERF-007 - Confirmar duplicacao de runtime

## Resultado

Analise concluida sem alterar a configuracao do Module Federation: os dados
disponiveis nao demonstram que os fallbacks compartilhados dos remotes estejam
sendo baixados quando executados pelo Host. Portanto, nao ha base mensuravel
para remover `singleton` ou modificar a lista de dependencias compartilhadas.

## Evidencias do build de producao

Os seis workspaces (`host` e cinco remotes) foram compilados localmente com
`npm run build --workspaces --if-present`. O Host declara `react`, `react-dom`
e `@mfe/shared` como singletons; cada remote tambem declara esses pacotes e
`@tanstack/react-query` como singletons.

| Asset do build                     |                         Host |                                          Remotes | Interpretacao                                                                                                                 |
| ---------------------------------- | ---------------------------: | -----------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Proxy Federation React e React DOM |  0.14 kB cada (0.14 kB gzip) |                      0.14 kB cada (0.14 kB gzip) | Sao proxies pequenos, nao copias do runtime React.                                                                            |
| Fallback `@mfe/shared`             |   487.27 kB (143.35 kB gzip) |            397.20 kB (118.09 kB gzip) por remote | O build produz fallbacks locais; isso nao prova que cada fallback e requisitado em runtime quando o Host fornece o singleton. |
| Fallback `@tanstack/react-query`   | Host nao consome esse pacote |              46.85 kB (13.85 kB gzip) por remote | O build de cada remote tem um fallback; a transferencia efetiva entre remotes nao foi observavel.                             |
| `remoteEntry.js`                   |                            — | aproximadamente 1.59-1.60 kB (0.87-0.88 kB gzip) | Entradas Federation pequenas.                                                                                                 |

O nome e hash de alguns arquivos de fallback se repetem entre builds, mas cada
remote e publicado em uma origem propria; so a igualdade dos arquivos nao
determina quantas copias sao transferidas ou executadas.

## Evidencias do Preview

Na rota Estudantes foram observados requests para o Host e para o remote
Student, incluindo `remoteEntry.js`, o modulo exposto e chunks de schemas,
React Query e Federation. Para os assets do Host, a Performance API reportou
`decodedBodySize` de 486,433 bytes para o chunk compartilhado `@mfe/shared`;
na recarga, o mesmo chunk reportou 487,270 bytes decodificados e 146,637 bytes
codificados. Os assets do remote Student reportaram `transferSize`,
`encodedBodySize` e `decodedBodySize` iguais a zero, pois a origem remota nao
expõe os tamanhos ao Host. Assim, nao foi possivel validar os bytes de rede ou
Coverage do remote, nem fazer uma comparacao confiavel cold/warm entre origens.

## Decisao

Manter a configuracao atual. React e React DOM ja sao singletons e seus
artefatos Federation sao proxies minimos no build. Os arquivos de fallback
compartilhados dos remotes justificam uma medicao futura com acesso a Network
ou Coverage em cada origem, mas os dados atuais nao provam duplicacao efetiva.
Nenhuma alteracao de Federation foi feita.

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

- Build de producao de Host e cinco remotes concluido.
- Network/Resource Timing inspecionado na rota Estudantes em Preview.
- Tamanhos do Host disponiveis; tamanhos dos assets cross-origin nao
  observaveis devido a politica de Timing-Allow-Origin.
- Comparacao completa cold/warm e Coverage dos remotes indisponiveis nesse
  ambiente; nenhuma mudanca foi proposta sem evidencia de ganho mensuravel.
