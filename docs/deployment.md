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
