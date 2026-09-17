# Plano de deploy e produção

## Objetivo

Publicar o protótipo com Host e remotes React/Vite independentes, API Go,
WebSocket e MariaDB persistente, sem usar dados reais antes do endurecimento
de identidade e privacidade.

## Arquitetura alvo

```text
Vercel/Cloudflare Pages
  Host + Student + Institution + Activity + Dashboard + Admin
                         |
                         | HTTPS / WSS
                         v
Render Web Service (Go API)
                         |
                         v
MariaDB/MySQL gerenciado com backup
```

## Fases

### 1. Preparação local

- [x] CI obrigatório com build dos workspaces, testes, lint, cobertura e
      vulnerabilidades.
- [x] URLs de Module Federation configuráveis por `VITE_MFE_*_URL`.
- [x] `.env.example` sem segredos.
- [x] Launcher e `validate:local` disponíveis.
- [ ] Corrigir a condição de corrida do launcher: aguardar `/health` antes de
      iniciar a validação completa.

### 2. Banco de produção

- Criar MariaDB/MySQL gerenciado com backup automático.
- Criar usuário de aplicação com permissões mínimas.
- Aplicar migrations em ordem, incluindo `005_event_institution_scope.sql`.
- Testar restauração de backup antes de aceitar dados reais.
- Registrar host, porta, database e política de rotação de senha fora do Git.

### 3. Backend Go

- Criar Web Service com build:

```powershell
go build -o server ./modules/backend/cmd/server
```

- Configurar `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `DB_TLS=true` e `CORS_ORIGINS`.
- Configurar health check em `/health`.
- Habilitar HTTPS e WSS na plataforma.
- Validar logs JSON, métricas e correlação de requisições.
- Não considerar `x-demo-user`/`demoUser` autenticação de produção.

### 4. Frontends

Criar um projeto por workspace. Cada projeto deve usar o diretório raiz do
repositório e um comando equivalente a:

```powershell
npm ci --legacy-peer-deps
npm run build --workspace=<workspace>
```

Workspaces:

- `mfe-host`
- `mfe-student`
- `mfe-institution`
- `mfe-activity`
- `mfe-dashboard`
- `mfe-admin`

No Host, configurar:

```text
VITE_MFE_STUDENT_URL=https://student.example.com
VITE_MFE_INSTITUTION_URL=https://institution.example.com
VITE_MFE_ACTIVITY_URL=https://activity.example.com
VITE_MFE_DASHBOARD_URL=https://dashboard.example.com
VITE_MFE_ADMIN_URL=https://admin.example.com
VITE_API_URL=https://api.example.com
VITE_DEMO_USER=demo-active
```

## Smoke test publicado

1. `GET /health` retorna `200`.
2. API sem identidade retorna `401`.
3. CORS aceita somente o Host publicado.
4. Cada `remoteEntry.js` retorna `200`.
5. Host carrega os cinco remotes sem Error Boundary.
6. WebSocket conecta por `wss://`.
7. Criar estudante publica evento.
8. Activity recebe o evento uma vez.
9. Dashboard atualiza o indicador.
10. Histórico respeita o escopo institucional.
11. Reiniciar a API não perde dados do MariaDB.
12. Restaurar backup funciona em ambiente descartável.

## Bloqueios para produção

- [ ] Trocar identidade demonstrativa por sessão/token assinado.
- [ ] Não aceitar credencial de usuário em query string no WebSocket.
- [ ] Implementar outbox transacional para mutação e evento.
- [ ] Implementar replay/cursor para consumidores que perderem mensagens.
- [ ] Definir rate limiting, headers de segurança e retenção de logs.
- [ ] Fazer avaliação de LGPD antes de dados pessoais reais.
- [ ] Definir rollback de backend, migrations e frontends.

## Rollback

- Frontend: reverter o deployment para o artefato anterior.
- Backend: voltar à imagem anterior somente quando a migration for compatível.
- Banco: nunca apagar dados para reverter código; usar migration reversível ou
  procedimento de restauração testado.
- Registrar versão publicada, migration aplicada, horário e responsável.

## Critério de pronto

O deploy só está pronto quando o smoke test publicado passa, o banco sobrevive
a restart/redeploy, o WSS funciona, os remotes carregam com URLs públicas e os
bloqueios de identidade e outbox estão resolvidos ou formalmente aceitos como
limitações de protótipo.
