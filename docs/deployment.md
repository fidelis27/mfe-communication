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
└── Server Node.js          -> web service com API e WebSocket
```

Nao sera criado um backend separado por MFE no MVP. O backend sera um servico
Node.js modular, com fronteiras internas para instituicoes, estudantes,
vinculos, autorizacao, atividades e dashboard. A separacao em servicos
independentes fica para uma etapa posterior.

## 2. Viabilidade

### Viavel

- Hospedar Host e remotes React/Vite como sites estaticos.
- Carregar remotes por Module Federation usando URLs publicas.
- Hospedar o backend Express/Node.js como web service.
- Manter WebSocket entre backend, Host e MFEs.
- Usar um monorepo com varios projetos de deploy.
- Fazer deploy automatico a partir do GitHub.

### Nao esta pronto no repositorio atual

A arquitetura e viavel, mas ainda exige uma etapa de preparacao:

- `packages/host/package.json` possui scripts e dependencias de Vite, mas
  `packages/host/src/index.ts` ainda e um servidor Express HTML, nao uma
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
VITE_API_URL=https://secretaria-api.onrender.com
```

Vercel oferece deploy por Git e ambientes de preview. Cloudflare Pages e uma
alternativa adequada para artefatos estaticos Vite. A escolha final pode ser
Vercel para reduzir a quantidade de plataformas durante o prototipo.

### Backend: Render Web Service

Usar um Web Service gratuito para o Node.js/Express:

```text
https://secretaria-api.onrender.com
```

O Render suporta Node.js, HTTPS, WebSocket e deploy por branch do GitHub. O
servidor deve escutar `process.env.PORT` em `0.0.0.0`.

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

### Banco de dados

No primeiro prototipo, usar repositorios em memoria. Nao usar dados pessoais
reais e nao depender de arquivos locais.

Quando houver persistencia, escolher um PostgreSQL gerenciado com camada
 gratuita, validando antes os limites atuais. O banco deve ter backup, controle
 de acesso, criptografia em repouso e politica de retencao antes de receber
 dados pessoais.

O PostgreSQL gratuito do Render nao deve ser tratado como armazenamento
permanente: a documentacao informa limite de 30 dias para a instancia gratuita.

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
backend precisa de um processo Node.js com conexao persistente; Render Web
Service atende melhor ao requisito do prototipo, apesar do sleep do plano free.

## 6. Monorepo e configuracao dos servicos

Cada servico de frontend deve possuir build independente. Exemplos de comandos
para a plataforma:

```text
Host:
  Root directory: packages/host
  Build command: npm run build
  Output directory: dist

MFE Student:
  Root directory: packages/mfe-student
  Build command: npm run build
  Output directory: dist

API:
  Root directory: .
  Build command: npm install && npm run build
  Start command: npm run start:dev
```

Os comandos reais devem ser ajustados depois que o projeto possuir um build
unificado e um comando de producao para o backend. `start:dev` nao deve ser o
comando final de producao sem verificar compilacao, sinais de encerramento,
logs e variaveis de ambiente.

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
4. Criar build de producao para o backend Node.js.
5. Implementar API e WebSocket realtime.
6. Configurar CORS, variaveis de ambiente e reconexao.
7. Publicar Host e remotes em ambientes de preview.
8. Publicar API no Render e configurar `VITE_API_URL`.
9. Validar fluxo instituicao -> estudante -> evento -> modal/Activity/Dashboard.
10. Registrar URLs, limites, evidencias e rollback.

## 9. Decisao final

Para o MVP de dois dias:

```text
Monorepo GitHub
  -> Vercel para Host e remotes React/Vite
  -> Render Web Service para Node.js + Express + WebSocket
  -> Repositorios em memoria
  -> PostgreSQL somente em etapa posterior
```

Esta decisao atende o conceito de MFE e eventos realtime com custo zero de
infraestrutura para demonstracao, mas aceita cold start, indisponibilidade
transitoria, limites de uso e ausencia de persistencia duravel no plano
gratuito.

## Referencias oficiais

- Render Free: https://render.com/docs/free
- Render Web Services: https://render.com/docs/web-services
- Vercel Deployments: https://vercel.com/docs/deployments/overview
- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Cloudflare Pages: https://pages.cloudflare.com/
