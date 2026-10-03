# Event bus local

O bus local do monorepo usa o `globalThis.__mfeBus` como singleton compartilhado entre host e remotes. Ele mantém filas por canal e entrega eventos imediatamente quando há listeners ativos.

## Convenção de canais

- `cmd:*` para comandos do host para o MFE
- `evt:*` para eventos do MFE para o host
- `domain:*` para eventos de domínio publicados pelo host

Exemplos:

- `cmd:navigate`
- `evt:navigate`
- `domain:connection`
- `INSTITUTION_CREATED` (publicado no módulo `domain`)

## API

```ts
import { dispatch, listen, useDispatch, useListen } from "@mfe/shared";

dispatch("student", "evt:navigate", { path: "/instituicoes" }, { ttl: 10000 });
const unsubscribe = listen("host", "cmd:navigate", ({ path }) => {
  console.log(path);
});

const emit = useDispatch("student");
emit("evt:navigate", { path: "/instituicoes" });

useListen("domain", "STUDENT_CREATED", (payload) => {
  console.log(payload);
});
```

## Fila e TTL

- Se não houver listener em um canal, o evento entra em fila por `moduleId:channel`.
- Quando o primeiro listener for registrado, a fila é drenada em ordem.
- Eventos expirados pelo TTL são descartados.
- A fila tem limite de 100 itens por canal; itens antigos são removidos.

## Fluxo do host

O host abre a conexão WebSocket única e reenvia a cada `DomainEvent` para o bus usando `dispatch("domain", event.type, event.payload)`. Também publica `dispatch("domain", "domain:connection", status)` para comunicar status de conexão.

## Fallback standalone

Se o host não estiver pronto, cada MFE pode abrir sua própria conexão de fallback usando `useDomainEvents` apenas para o ambiente local isolado.
