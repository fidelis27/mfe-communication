# Estrategia de deploy

## 1. Decisao arquitetural

O projeto permanece em um unico repositorio Git, mas cada parte sera uma
unidade de deploy independente:

```text
Monorepo
├── Host                    -> site estatico
├── MFE Institution         -> remote estatico
├── MFE Student             -> remote estatico
├── MFE Activity            -> remote estatico
├── MFE Dashboard           -> remote estatico
├── MFE Admin               -> remote estatico
└── Server Go               -> web service com API, WebSocket e MariaDB/MySQL
```

Nao sera criado um backend separado por MFE no MVP. O backend sera um servico
Go modular, com fronteiras internas para instituicoes, estudantes,
vinculos, autorizacao, atividades e dashboard. A separacao em servicos
independentes fica para uma etapa posterior.

## 2. Viabilidade

### Viavel

- Hospedar Host e remotes React/Vite como sites estaticos.
- Carregar remotes por Module Federation usando URLs publicas.
- Hospedar o backend Go como web service.
- Manter WebSocket entre backend, Host e MFEs.
- Usar um monorepo com varios projetos de deploy.
- Fazer deploy automatico a partir do GitHub.

### Nao esta pronto no repositorio atual

A arquitetura e viavel, mas ainda exige uma etapa de preparacao:

- `modules/frontend/packages/host/package.json` possui scripts e dependencias de Vite, mas
  `modules/frontend/packages/host/src/index.ts` ainda e um servidor Express HTML, nao uma
  aplicacao React/Vite do Host.
- Nao foram encontrados arquivos `vite.config.*` nos pacotes.
- `mfe-student` possui `App.tsx` e `main.tsx`, mas ainda e uma tela de exemplo.
- Module Federation ainda nao esta configurado com `name`, `remotes`,
  `exposes` ou manifestos.
- Nao existe servidor WebSocket implementado.
- O backend ainda nao possui o fluxo funcional completo nem persistencia
  duravel.

Conclusao: e possivel atingir a arquitetura proposta, mas nao e possivel
publicar o sistema completo com Module Federation e WebSocket usando o estado
atual sem antes implementar a configuracao e os fluxos previstos nas specs.

## 3. Hospedagem gratuita recomendada

### Frontend: Vercel ou Cloudflare Pages

Usar um projeto de hospedagem para cada aplicacao:

- `secretaria-host`
- `secretaria-institution`
- `secretaria-student`
- `secretaria-activity`
- `secretaria-dashboard`
- `secretaria-admin`

Cada projeto deve construir somente o seu workspace e publicar os artefatos
estaticos. O Host recebe as URLs dos remotes por variaveis de ambiente.

Exemplo:

```text
VITE_MFE_INSTITUTION_URL=https://secretaria-institution.example
VITE_MFE_STUDENT_URL=https://secretaria-student.example
VITE_MFE_ACTIVITY_URL=https://secretaria-activity.example
VITE_MFE_DASHBOARD_URL=https://secretaria-dashboard.example
VITE_MFE_ADMIN_URL=https://secretaria-admin.example
VITE_API_URL=https://secretaria-api.onrender.com
VITE_DEMO_USER=demo-active
```

As variáveis `VITE_MFE_*_URL` são consumidas pelo build do Host para montar os
remotes. Os fallbacks `localhost` existem apenas para desenvolvimento local;
ambientes publicados devem sempre fornecer URLs HTTPS próprias.

Vercel oferece deploy por Git e ambientes de preview. Cloudflare Pages e uma
alternativa adequada para artefatos estaticos Vite. A escolha final pode ser
Vercel para reduzir a quantidade de plataformas durante o prototipo.

### Backend: Render Web Service

Usar um Web Service para Go conectado a um MariaDB/MySQL hospedado. O banco
nao deve depender do filesystem local do Web Service:

```text
https://secretaria-api.onrender.com
```

O servico deve suportar Go e WebSocket. O servidor deve escutar `PORT` em
`0.0.0.0` e receber `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e
`DB_TLS` por variaveis de ambiente.

Limites relevantes do plano gratuito, conforme a documentacao do Render:

- O servico pode dormir apos 15 minutos sem trafego.
- O primeiro acesso depois do sleep pode levar aproximadamente um minuto.
- O filesystem local e efemero e nao pode ser usado como banco.
- O servico pode reiniciar sem aviso.
- Ha limite mensal de horas gratuitas por workspace.
- O WebSocket pode ser interrompido em sleep ou reinicio; o cliente precisa de
  reconexao e estado de conexao visivel.
- O servico gratuito e adequado para prototipo, teste e estudo, nao para
  producao.

### Banco de dados MariaDB/MySQL

MariaDB/MySQL sera o banco oficial do prototipo. O desenvolvimento local usa
MariaDB 10.4.32 instalado via XAMPP; o deploy usa um servidor MariaDB/MySQL
compativel:

```text
DB_HOST=localhost
DB_PORT=3306
DB_NAME=secretaria
DB_USER=secretaria_app
DB_PASSWORD=secret
DB_TLS=false
```

Em producao, usar credenciais separadas, `DB_TLS=true`, usuario sem privilegios
administrativos, migrations versionadas e backup do banco.

## 4. Module Federation em producao de prototipo

Cada remote deve publicar seu artefato de entrada em uma URL estavel. O Host
nao deve embutir o codigo interno dos MFEs; deve consumir os contratos expostos.

Requisitos:

- `@originjs/vite-plugin-federation` configurado no Host e nos remotes.
- React e React DOM compartilhados como singletons.
- `exposes` nos remotes e `remotes` no Host.
- URLs dos remotes configuraveis por ambiente.
- CORS e headers configurados para permitir o carregamento dos remotes.
- Fallback visivel quando um remote estiver indisponivel.
- Teste de build e carregamento do Host com pelo menos um remote real.

O deploy independente dos remotes prova o conceito de MFE. O deploy nao exige
que cada MFE tenha um backend proprio.

## 5. WebSocket e eventos realtime

O backend continua sendo a fonte autoritativa das escritas. O fluxo deve ser:

```text
MFE -> HTTP API -> persistencia -> evento de dominio -> WebSocket -> Host/MFEs
```

Requisitos de deploy:

- URL WebSocket derivada da URL HTTPS da API.
- `correlationId` preservado entre comando, resultado e evento.
- Reconexao automatica com backoff limitado.
- Deduplicacao por `eventId`.
- Indicador de conexao no Host.
- Modal fecha somente ao receber evento de sucesso correlato.
- Evento de erro mantem o modal aberto e exibe mensagem segura.

Nao usar Vercel Functions como servidor principal de WebSocket nesta etapa. O
backend precisa de um processo Go com conexao persistente; Render Web
Service atende melhor ao requisito do prototipo, apesar do sleep do plano free.

## 6. Monorepo e configuracao dos servicos

Cada servico de frontend deve possuir build independente. Exemplos de comandos
para a plataforma:

```text
Host:
  Root directory: modules/frontend/packages/host
  Build command: npm run build
  Output directory: dist

MFE Student:
  Root directory: modules/frontend/packages/mfe-student
  Build command: npm run build
  Output directory: dist

MFE Institution:
  Root directory: modules/frontend/packages/mfe-institution
  Build command: npm run build
  Output directory: dist

MFE Activity:
  Root directory: modules/frontend/packages/mfe-activity
  Build command: npm run build
  Output directory: dist

MFE Dashboard:
  Root directory: modules/frontend/packages/mfe-dashboard
  Build command: npm run build
  Output directory: dist

MFE Admin:
  Root directory: modules/frontend/packages/mfe-admin
  Build command: npm run build
  Output directory: dist

API:
  Root directory: .
  Build command: npm install && npm run build
  Start command: npm run start:dev
```

Este padrao e compatível com o Vercel em monorepo: cada subdiretorio vira um
projeto separado dentro do mesmo repositorio GitHub. O Vercel identifica a
pasta do app, executa seu build e publica o `dist` correspondente. Em seguida,
o Host aponta para cada URL publica do remote com variaveis de ambiente como
`VITE_MFE_STUDENT_URL` e `VITE_MFE_INSTITUTION_URL`.

Os comandos reais devem ser ajustados depois que o projeto possuir um build
unificado e um comando de producao para o backend. `start:dev` nao deve ser o
comando final de producao sem verificar compilacao, sinais de encerramento,
logs e variaveis de ambiente.

## 6.2 Backend publicado no Render

O Web Service `secretaria-api` foi criado no Render a partir do repositorio
`fidelis27/mfe-communication`.

```text
URL: https://secretaria-api-58jh.onrender.com
Root Directory: modules/backend
Runtime: Go
Build Command: go build -o app ./cmd/server
Start Command: ./app
Health Check: /health
Plano: Free
```

O primeiro deploy usou o comando Go padrao sem `./cmd/server` e falhou porque o
modulo possui o entrypoint em `modules/backend/cmd/server`. O comando foi
corrigido no painel do Render e um novo deploy foi iniciado com sucesso no
estagio de compilacao.

Antes de considerar a API pronta, configurar no Render as variaveis secretas
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `DB_TLS=true` para
um MariaDB/MySQL externo com persistencia. Sem esse banco, o processo Go nao
consegue iniciar a conexao e o endpoint `/health` nao retorna `200`.

O MySQL Free da Aiven usa uma CA propria que nao estava presente no trust store
do container Go. Para destravar o prototipo, o Render usa temporariamente
`DB_TLS_SKIP_VERIFY=true` junto com `DB_TLS=true`. Em um ambiente real, trocar
essa opcao por um CA da Aiven configurado como Secret File e manter a validacao
do certificado habilitada.

## 6.1 Processo automatizado de deploy do Host no Vercel

O deploy do frontend Host foi automatizado a partir do repositório GitHub e
validado com o fluxo real do Vercel. O processo atual e:

```text
1. Importar o repositório https://github.com/fidelis27/mfe-communication
2. Selecionar o projeto Vercel com nome: mfe-communication-host
3. Definir Root Directory como: modules/frontend/packages/host
4. Usar Vite como preset do framework
5. Configurar Build Command: npm run build
6. Configurar Output Directory: dist
7. Salvar e disparar o deploy
8. A cada push na branch principal, o Vercel executa o build e publica a versao
   automaticamente
```

Configuracao recomendada do projeto no Vercel:

```text
Project Name: mfe-communication-host
Root Directory: modules/frontend/packages/host
Build Command: npm run build
Output Directory: dist
Framework Preset: Vite
```

Variaveis de ambiente esperadas no Host:

```text
VITE_MFE_STUDENT_URL=https://<student-vercel-url>
VITE_MFE_INSTITUTION_URL=https://<institution-vercel-url>
VITE_MFE_ACTIVITY_URL=https://<activity-vercel-url>
VITE_MFE_DASHBOARD_URL=https://<dashboard-vercel-url>
VITE_MFE_ADMIN_URL=https://<admin-vercel-url>
VITE_API_URL=https://<api-render-url>
VITE_DEMO_USER=demo-active
```

Validacao local executada antes do deploy:

```bash
npm run build --workspace=@mfe/shared
npm run build --workspace=mfe-host
```

Resultado verificado: ambos os builds terminaram com sucesso e geraram artefatos
na pasta `dist` do host. A criacao dos projetos no Vercel foi validada, mas um
projeto com status `Created` ainda precisa de conexao ao repositorio e de um
deploy de producao com status `Ready`.

Estado observado no painel Vercel em 2026-09-16:

```text
mfe-communication-host: Ready
mfe-communication-mfe-student: Ready
mfe-communication-mfe-admin: Ready
mfe-communication-mfe-activity: Ready
mfe-communication-mfe-institution: Ready
mfe-communication-mfe-dashboard: Ready
```

O fluxo somente deve ser considerado concluido quando cada projeto tiver
repositorio conectado, deployment de producao `Ready` e uma URL publica
validada. Depois disso, as URLs dos remotes devem ser cadastradas no Host.

URLs de producao confirmadas nesta etapa:

```text
mfe-communication-host:
  https://mfe-communication-host.vercel.app
mfe-communication-mfe-student:
  https://mfe-communication-mfe-student.vercel.app
mfe-communication-mfe-admin:
  https://mfe-communication-mfe-admin.vercel.app
mfe-communication-mfe-activity:
  https://mfe-communication-mfe-activity.vercel.app
mfe-communication-mfe-institution:
  https://mfe-communication-mfe-institution.vercel.app
mfe-communication-mfe-dashboard:
  https://mfe-communication-mfe-dashboard-awmdgmlnp-fidelis27s-projects.vercel.app
```

Importante: os seis frontends foram publicados como projetos independentes no
Vercel. A API continua sendo um servico independente e ainda precisa receber
seu endereco publico e suas variaveis de ambiente conforme a arquitetura MFE.

## 7. Seguranca e LGPD

- Usar somente dados institucionais publicos e estudantes ficticios ou
  anonimizados no prototipo.
- Mascara de CPF e outros identificadores na interface.
- Nao registrar CPF, endereco, telefone, e-mail pessoal ou data de nascimento
  nos logs.
- Armazenar segredos somente nas variaveis de ambiente da plataforma.
- Usar HTTPS/WSS.
- Aplicar CORS somente aos Hosts conhecidos.
- Criptografar dados em repouso quando houver banco persistente.
- Definir retencao, exclusao e auditoria antes de usar dados reais.
- Nao realizar scraping ou integracao com USP, UNESP ou Fatec no MVP.

Hospedagem gratuita e adequada para demonstracao tecnica, mas nao deve receber
informacoes pessoais reais de estudantes.

## 8. Plano de implementacao antes do deploy

1. Transformar o Host em aplicacao React/Vite.
2. Configurar Module Federation no Host e no MFE Student.
3. Provar o carregamento de um remote publicado.
4. Criar build de producao para o backend Go.
5. Implementar API e WebSocket realtime.
6. Configurar CORS, variaveis de ambiente e reconexao.
7. Publicar Host e remotes em ambientes de preview.
8. Publicar API no Render e configurar `VITE_API_URL`.
9. Validar fluxo instituicao -> estudante -> evento -> modal/Activity/Dashboard.
10. Registrar URLs, limites, evidencias e rollback.

## 9. Decisao final

Para o prototipo completo de tres dias:

```text
Monorepo GitHub
  -> Vercel para Host e remotes React/Vite
  -> Web Service Go + WebSocket
  -> MariaDB/MySQL hospedado
```

Esta decisao atende o conceito de MFE, eventos realtime e persistencia em banco
relacional. O custo zero depende da disponibilidade de uma camada gratuita de
MariaDB/MySQL; a API e o banco devem ser tratados como servicos separados.

## Referencias oficiais

- Render Free: https://render.com/docs/free
- Render Web Services: https://render.com/docs/web-services
- Vercel Deployments: https://vercel.com/docs/deployments/overview
- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Cloudflare Pages: https://pages.cloudflare.com/

## 10. Decisao final vigente

- Backend oficial: Go com API HTTP e WebSocket.
- Banco oficial: MariaDB/MySQL.
- Desenvolvimento local: MariaDB 10.4.32.
- Producao: MariaDB/MySQL hospedado com persistencia e backup.
- Todos os dados de negocio devem sobreviver a reinicio e redeploy.
- O plano gratuito pode ser usado somente se oferecer persistencia real; caso
  contrario, o ambiente e apenas uma demonstracao descartavel.
- Frontends continuam como remotes independentes via Module Federation.
