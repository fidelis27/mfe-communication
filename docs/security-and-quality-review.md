# Revisão de segurança e qualidade

| Problema | Risco | Correção | Commit | Teste que cobre |
|---|---|---|---|---|
| Cores e estilos de foco inconsistentes dificultavam a leitura e a navegação por teclado. | Baixa legibilidade e perda de indicação visual do foco. | Tokens compartilhados centralizam cores e foco visível; a validação automática de contraste WCAG ainda está pendente. | `46f9dc7`, `9c08d50` | `modules/frontend/packages/host/src/App.a11y.test.tsx`; `modules/frontend/packages/mfe-admin/src/App.a11y.test.tsx` |
| As opções de instituição, grupo e pessoa podiam expor identificadores em vez de rótulos reconhecíveis. | Administradores poderiam selecionar o registro errado, sem conseguir confirmar seu contexto. | Os selects apresentam nomes e contexto humano-legível; a requisição continua usando o ID estável. | `d0174bd`, `9c08d50` | `modules/frontend/packages/mfe-admin/src/App.test.tsx` — “uses group names and candidate labels while creating groups” |
| Falha ao criar uma pessoa podia remover ou substituir a lista já carregada. | Uma ação malsucedida escondia dados existentes e prejudicava a recuperação do usuário. | A falha permanece associada ao formulário e a lista existente continua renderizada. | `d0174bd` | `modules/frontend/packages/mfe-admin/src/App.test.tsx` — “keeps the people list visible when createUser fails” |
| `drainQueue` entregava mensagens pendentes, mas mantinha as mesmas mensagens na fila. | Um listener registrado novamente podia receber de novo um evento já consumido. | A fila é removida durante o drain; mensagens expiradas são descartadas e as válidas são entregues uma vez. | `d4f5707` | `modules/frontend/packages/shared/src/bus.test.ts` — “removes queued events after the first listener receives them” |
| O host republicava todos os eventos antigos sempre que a lista recebia um item novo. | Activity podia duplicar linhas e Dashboard podia repetir refreshes, inclusive em renderizações de desenvolvimento. | O host registra IDs publicados em um `Set`, despacha somente IDs novos e mantém essa proteção durante replay de efeitos. | `2d9fafd` | `modules/frontend/packages/host/src/App.test.tsx` — “publishes each domain event only once, including under StrictMode”; `modules/frontend/packages/host/src/domain-events.integration.test.tsx` |
| O typecheck de raiz não cobria consistentemente os testes e arquivos de configuração, e não era uma etapa obrigatória do CI. | Erros de tipos podiam chegar ao merge sem falhar a validação automatizada. | O typecheck foi adicionado aos scripts e ao CI; o escopo exclui apenas configurações do bundler cujo formato de compartilhamento não é representado pelos tipos do plugin. O antigo servidor de demonstração do host usa agora `node:http`, sem dependência adicional. | `3e349a9` | `npm run typecheck` |

## Lições

Os testes anteriores do bus exercitavam fila, fan-out e unsubscribe dentro do próprio módulo. Eles não renderizavam o host nem alteravam sequencialmente a lista ordenada de eventos (`[novo, ...anteriores]`), portanto não detectavam que o efeito do host republicava todo o histórico. Também não verificavam uma entrega de ponta a ponta até Activity e Dashboard.

O teste anterior de drain verificava que o primeiro listener recebia a mensagem, mas não removia esse listener e registrava outro para confirmar que a fila havia sido consumida. Assim, a mensagem repetida continuava invisível. A regressão agora testa explicitamente o segundo registro, e a integração cobre host → bus → MFEs.

## Pendências

- A checagem automática de contraste WCAG e a remoção dos últimos valores hexadecimais fixos ainda não foram concluídas.
- Os testes Axe dos quatro MFEs restantes (student, institution, activity e dashboard), nos estados loading, vazio, erro e preenchido, ainda estão pendentes.
- O `tsc --noEmit -p .` não compila os `vite.config.ts`: o tipo de `shared` do plugin não declara a opção `singleton`, embora a configuração seja consumida pelo plugin no build. As aplicações e os testes TypeScript incluídos no escopo de raiz são verificados.
- A integração testa o relay do host com os dois MFEs renderizados juntos em StrictMode; não substitui uma validação visual de produção nem testes contra uma conexão WebSocket real.
