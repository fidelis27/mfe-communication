# Desenvolvimento local

Este guia descreve como subir o backend Go, o MariaDB pelo XAMPP, os MFEs e acessar o banco pelo phpMyAdmin no Windows.

## Pré-requisitos

- Go instalado e disponível no `PATH`.
- Node.js e npm instalados.
- XAMPP instalado em `C:\xampp`.
- MariaDB/MySQL do XAMPP configurado para a porta `3306`.

O backend fica em `modules/backend` e os frontends em `modules/frontend/packages`.

## 1. Subir o MariaDB pelo XAMPP

Abra o **XAMPP Control Panel** e clique em **Start** para:

- **MySQL**, na porta `3306`;
- **Apache**, se quiser usar o phpMyAdmin pelo navegador.

Pelo PowerShell, é possível confirmar a porta:

```powershell
Get-NetTCPConnection -LocalPort 3306 -State Listen
```

Se o MariaDB não estiver iniciado, o backend falha com erro de conexão recusada.

## 2. Criar o banco

No XAMPP, o usuário local padrão deste projeto é `root` sem senha. Crie o banco uma vez:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE IF NOT EXISTS test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Para um banco com nome próprio:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE IF NOT EXISTS secretaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Aplique as migrations na ordem:

```powershell
$database = "test"
Get-ChildItem .\modules\backend\migrations\*.sql | Sort-Object Name | ForEach-Object {
  Get-Content -Raw $_.FullName | C:\xampp\mysql\bin\mysql.exe -uroot $database
}
```

As migrations atuais são:

1. `001_initial_schema.sql`: tabelas principais;
2. `002_enrollment_lifecycle.sql`: trancamento e reabertura;
3. `003_audit_events.sql`: eventos persistidos;
4. `004_seed_demo_super_admin.sql`: usuário demo `demo-active`.

Para executar somente uma migration:

```powershell
Get-Content -Raw .\modules\backend\migrations\004_seed_demo_super_admin.sql | C:\xampp\mysql\bin\mysql.exe -uroot test
```

## 3. Acessar o banco no phpMyAdmin

Com Apache e MySQL ativos no XAMPP, abra:

[http://localhost/phpmyadmin](http://localhost/phpmyadmin)

Na tela de login local:

- **Servidor:** `localhost`;
- **Usuário:** `root`;
- **Senha:** deixe vazia;
- **Banco:** `test` ou `secretaria`.

Consultas úteis na aba **SQL**:

```sql
SHOW TABLES;
SELECT * FROM institutions;
SELECT * FROM users;
SELECT * FROM students;
SELECT * FROM enrollments;
SELECT event_id, event_type, correlation_id, occurred_at
FROM audit_events
ORDER BY occurred_at DESC;
```

O phpMyAdmin administra o banco, mas não substitui a aplicação das migrations.

## 4. Subir o backend Go

Em um terminal na raiz do projeto:

```powershell
$env:PORT="3333"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="test"
$env:DB_USER="root"
$env:DB_PASSWORD=""
$env:DB_TLS="false"
$env:CORS_ORIGINS="http://localhost:4173,http://localhost:4174,http://localhost:4175,http://localhost:4176,http://localhost:4178,http://localhost:4179"
go -C modules/backend run ./cmd/server
```

O backend fica em `http://localhost:3333`.

`CORS_ORIGINS` controla quais Hosts/remotes podem chamar a API no navegador.
Se omitida, a API aceita os ports locais documentados neste guia.

Teste básico:

```powershell
curl.exe -i http://localhost:3333/health
```

A resposta esperada é `200` com `{"ok":true}`.

As rotas protegidas usam o usuário demo:

```powershell
curl.exe -i http://localhost:3333/institutions -H "x-demo-user: demo-active"
```

Sem o header, a API retorna `401`. Usuário inexistente ou inativo retorna `403`.

O WebSocket fica em:

```text
ws://localhost:3333/events?demoUser=demo-active
```

## 5. Instalar dependências frontend

Na raiz do projeto:

```powershell
npm install
```

A versão disponível do plugin Federation usada pelo projeto é `@originjs/vite-plugin-federation@1.4.1`.

## 6. Build dos MFEs

Execute os builds diretamente no diretório de cada pacote:

```powershell
npx vite build --config modules/frontend/packages/mfe-student/vite.config.ts
npx vite build --config modules/frontend/packages/mfe-institution/vite.config.ts
npx vite build --config modules/frontend/packages/mfe-activity/vite.config.ts
npx vite build --config modules/frontend/packages/mfe-dashboard/vite.config.ts
npx vite build --config modules/frontend/packages/host/vite.config.ts
```

Ou, dentro de cada pacote:

```powershell
Set-Location modules/frontend/packages/mfe-student
npx vite build
```

## 7. Subir os remotes e o Host

Para iniciar backend, Host e todos os remotes com um comando no Windows:

```powershell
npm run dev:local
```

O script abre um terminal PowerShell por serviço e não encerra processos que
já estejam usando a porta esperada. Para parar os processos dessas portas:

```powershell
npm run stop:local
```

O script pressupõe que o MariaDB já esteja ativo no XAMPP. Se o banco ainda
não estiver rodando, inicie-o antes do comando acima.

Cada processo deve ficar em um terminal separado. Primeiro faça os builds e depois inicie os previews:

### Student

```powershell
Set-Location modules/frontend/packages/mfe-student
npx vite preview --host 127.0.0.1 --port 4173
```

### Institution

```powershell
Set-Location modules/frontend/packages/mfe-institution
npx vite preview --host 127.0.0.1 --port 4175
```

### Activity

```powershell
Set-Location modules/frontend/packages/mfe-activity
npx vite preview --host 127.0.0.1 --port 4176
```

### Dashboard

```powershell
Set-Location modules/frontend/packages/mfe-dashboard
npx vite preview --host 127.0.0.1 --port 4178
```

### Host

```powershell
Set-Location modules/frontend/packages/host
npx vite preview --host 127.0.0.1 --port 4174
```

Abra a aplicação em:

[http://localhost:4174/](http://localhost:4174/)

O Host carrega os remotes nestes endereços:

| Componente  | URL do remote                                 |
| ----------- | --------------------------------------------- |
| Student     | `http://localhost:4173/assets/remoteEntry.js` |
| Institution | `http://localhost:4175/assets/remoteEntry.js` |
| Activity    | `http://localhost:4176/assets/remoteEntry.js` |
| Dashboard   | `http://localhost:4178/assets/remoteEntry.js` |

## 8. Verificar os remotes

```powershell
curl.exe -I http://localhost:4173/assets/remoteEntry.js
curl.exe -I http://localhost:4175/assets/remoteEntry.js
curl.exe -I http://localhost:4176/assets/remoteEntry.js
curl.exe -I http://localhost:4178/assets/remoteEntry.js
curl.exe -I http://localhost:4174/
```

Todos devem retornar `HTTP/1.1 200 OK`.

## Problemas comuns

### Porta ocupada

Descubra o processo:

```powershell
Get-NetTCPConnection -LocalPort 3333,4173,4174,4175,4176,4178 -State Listen
```

Encerre um processo específico somente quando tiver certeza do PID:

```powershell
Stop-Process -Id <PID> -Force
```

### `npm run preview` procura `dist` no lugar errado

Como o projeto usa npm workspaces, execute o Vite a partir do pacote com `npx vite preview`, depois de gerar o build local. Isso evita que o script seja resolvido a partir da raiz errada.

### Host responde, mas um remote não carrega

Confirme que o remote correspondente está ativo e que seu `remoteEntry.js` retorna `200`. O Host não consegue carregar um remote que ainda não foi buildado ou está em outra porta.

### Backend não conecta no banco

Confirme:

```powershell
Get-NetTCPConnection -LocalPort 3306 -State Listen
```

Depois confira `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` no mesmo terminal que executará `go run`.

### Reiniciar tudo

Pare os processos dos terminais, reinicie MySQL/Apache no XAMPP, aplique apenas as migrations pendentes e suba novamente o backend antes dos frontends.
