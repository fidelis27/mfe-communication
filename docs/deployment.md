# Arquitetura e deploy

## Componentes

```text
Vercel: Host React + cinco MFEs
  ├── login e sessao via Supabase Auth
  └── chamadas HTTPS/WSS com access token
          |
          v
Render: secretaria-backend (Go)
  ├── valida JWT Supabase via OIDC/JWKS
  ├── aplica autorizacao e escopo locais
  └── MariaDB/MySQL persistente
```

O backend vive em `fidelis27/secretaria-backend`; o Host e os MFEs continuam
em `fidelis27/mfe-communication`. `@mfe/shared` e compartilhado como singleton
para que os remotes usem a mesma sessao Supabase iniciada pelo Host.

## Supabase Auth

Crie um projeto Supabase e habilite login por e-mail/senha. A aplicacao nao
oferece cadastro publico: crie/convide usuarios administrativamente, exija
confirmacao de e-mail e mantenha cada conta vinculada a um usuario ativo na
tabela `users` da API. Nunca exponha a chave `service_role`.

Configure uma chave JWT de assinatura assimetrica no Supabase (por exemplo,
ES256) para que o backend possa validar tokens pelas chaves publicas JWKS.
Para conceder acesso `super_admin`, a role `super_admin` deve estar em
`app_metadata.roles` no Supabase e o usuario tambem deve estar marcado como
superadmin localmente; ambos sao exigidos.

Configure no build do Host e dos MFEs:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_API_URL=https://secretaria-backend.onrender.com
```

A chave anon/public e apropriada para o navegador; a seguranca dos dados da
aplicacao continua no backend Go, que exige JWT e verifica o usuario local.
O frontend persiste e renova a sessao pelo SDK Supabase. HTTP usa
`Authorization: Bearer <access-token>` e WebSocket usa o subprotocolo
`bearer.<access-token>`.

## Render

O servico `secretaria-backend` usa o repositorio `fidelis27/secretaria-backend`,
com Root Directory vazio, Build Command `go build -o app ./cmd/server`,
Start Command `./app` e health check `/health`.

Configure:

```text
DB_HOST=<host do MariaDB/MySQL>
DB_PORT=3306
DB_NAME=<banco>
DB_USER=<usuario>
DB_PASSWORD=<segredo>
DB_TLS=true
OIDC_ISSUER=https://<project-ref>.supabase.co/auth/v1
OIDC_AUDIENCE=authenticated
```

O banco precisa ser externo, persistente e acessivel pelo Render. `GET /health`
confirma a conexao com o banco; as demais rotas exigem token.
Defina tambem `CORS_ORIGINS` com as origens HTTPS exatas do Host Vercel e de
quaisquer ambientes de preview que devam chamar a API; nao use `*` para rotas
autenticadas.

## Custos e limites

Supabase oferece plano Free, sujeito a quotas e politicas de pausa/recursos que
podem mudar. Render Free tambem pode suspender servicos por inatividade. A
arquitetura evita o custo de manter um servidor Keycloak, mas nao garante
disponibilidade nem custo zero fora dos limites atuais dos provedores.

## Desenvolvimento local

Siga `docs/local-development.md`. O frontend precisa das variaveis
`VITE_SUPABASE_*`; o backend recebe `OIDC_ISSUER` e
`OIDC_AUDIENCE=authenticated`. Para testar a API, use um access token real do
projeto Supabase e um usuario ativo com o mesmo e-mail no banco local.

## Security headers

The Host's Vercel configuration sends `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, and a `Permissions-Policy` that disables
camera, microphone, and geolocation. The frame header prevents embedding; a
`frame-ancestors` directive cannot be enforced from a CSP meta element.

Production builds add a CSP meta element generated from the same `VITE_*`
origins used by federation and API configuration. `default-src 'self'` is the
fallback; `script-src` permits the Host and the five configured remote
origins; `connect-src` permits the API and its WebSocket scheme, Supabase and
its WebSocket scheme, and the Sentry DSN origin when configured. Styles and
fonts may load from the Host and five remote origins: federation emits remote
CSS links, and each MFE serves its local `@fontsource` assets from its own
origin. Images may also use `data:`, forms and
the base URL are restricted to the Host, and plugins are disabled with
`object-src 'none'`. The policy does not use `unsafe-inline` or `unsafe-eval`.
The build fails with the missing variable's name if an origin needed for the
policy is not configured.

The Host's tracked production environment file supplies the public Supabase
project URL used by the live Host. The Supabase anon key remains a deployment
environment variable; never put a `service_role` key in frontend configuration.

Zod runs in `jitless` mode in the Host and remotes so schema parsing does not
probe dynamic code generation and trigger CSP violations. Vite development
mode does not apply the CSP, preserving HMR. The CSP plugin
allows HTTP origins only for localhost E2E builds; production origins must use
HTTPS. Each remote sends `X-Content-Type-Options: nosniff` and
`Cross-Origin-Resource-Policy: cross-origin` so the Host can load its
federated assets. No `Access-Control-Allow-Origin` header is added by these
Vercel configurations. Verify the deployed headers after release; local
builds do not prove provider-side deployment behavior.
