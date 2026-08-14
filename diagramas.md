# Diagramas — Sistema de Secretaria Escolar (multi-MFE)

Visualização de ponta a ponta da arquitetura. Ordem sugerida de leitura:
visão geral → composição em runtime → camadas internas do código →
fluxo completo de uma escrita → revogação de permissão em tempo real.

---

## 0. Identidade e autenticação — do login à autorização

```mermaid
sequenceDiagram
    actor U as Usuário
    participant SSO as SSO / IdP da organização
    participant Browser as Navegador (cookie httpOnly)
    participant Shell as shell / qualquer MFE
    participant Auth as autenticacao()<br/>(identidade-middleware.ts)
    participant Carrega as carregarUsuarioAutorizacao()<br/>(carregar-usuario-middleware.ts)
    participant UsuarioRepo as UsuarioRepository<br/>(cadastro de Pessoa)
    participant Authz as require*Permission()<br/>(autorizacao-middleware.ts)

    U->>SSO: login (usuário/senha, MFA — fora deste sistema)
    SSO-->>Browser: sessão/token (cookie httpOnly, secure, sameSite)
    U->>Shell: navega/usa qualquer MFE
    Shell->>Auth: request com cookie de sessão anexado automaticamente
    Auth->>Auth: valida assinatura/expiração via lib de sessão confiável<br/>(nunca parsing manual — CWE-1390)
    alt sessão inválida/expirada
        Auth-->>Shell: 401 → redireciona pro login do SSO
    else sessão válida
        Auth->>Carrega: req.identidade = { userId }
        Carrega->>UsuarioRepo: findById(userId)
        alt Pessoa não cadastrada OU status "inativo"
            Carrega-->>Shell: 403 (autenticado, mas sem acesso aqui)
        else Pessoa cadastrada e ativa
            Carrega->>Authz: req.usuario = { id, nome, email, status, superAdmin }
            Authz->>Authz: AutorizacaoPolicy decide (seção 7.1 da spec técnica)
        end
    end
```

**Ponto-chave**: duas checagens distintas, nunca fundidas em uma só —
"está autenticado?" (SSO, fora do nosso código) e "está cadastrado e ativo
aqui?" (nosso `UsuarioRepository`, o CRM interno gerido pelo `mfe-admin`).
Uma pessoa pode passar na primeira e falhar na segunda (ex: alguém que saiu
do time de secretaria continua autenticando no SSO da empresa, mas foi
inativada aqui).

---

## 1. Visão geral de arquitetura (composição de MFEs)

```mermaid
graph TB
    Shell["shell (host)<br/>layout, roteamento, identidade, orquestração"]
    Inst["mfe-instituicoes<br/>dono: Instituição"]
    Alu["mfe-alunos<br/>dono: Aluno"]
    Admin["mfe-admin<br/>dono: Grupo, Vínculo Usuário-Grupo"]
    Ativ["mfe-atividade<br/>read-model de auditoria"]
    Dash["mfe-dashboard<br/>read-model agregado"]
    Bus[["Event Bus<br/>(shared, framework-agnostic)"]]
    API_Inst[("API Instituições")]
    API_Alu[("API Alunos")]
    API_Admin[("API Grupos/Permissões<br/>(fonte de verdade da autorização)")]
    API_Ativ[("API Atividades<br/>(fonte de verdade da auditoria)")]

    Shell --> Inst
    Shell --> Alu
    Shell --> Admin
    Shell --> Ativ
    Shell --> Dash

    Inst -. emite/escuta .-> Bus
    Alu -. emite/escuta .-> Bus
    Admin -. emite/escuta .-> Bus
    Ativ -. escuta .-> Bus
    Dash -. escuta .-> Bus

    Inst --> API_Inst
    Alu --> API_Alu
    Alu -. federação de componente .-> Inst
    Admin --> API_Admin
    Ativ --> API_Ativ
    Dash -. lê agregados, sem API própria .-> API_Inst
    Dash -. lê agregados, sem API própria .-> API_Alu

    API_Inst -. valida permissão a cada escrita .-> API_Admin
    API_Alu -. valida permissão a cada escrita .-> API_Admin
    API_Inst -. grava auditoria .-> API_Ativ
    API_Alu -. grava auditoria .-> API_Ativ
```

**Como ler**: linhas cheias = dependência de composição (shell monta o MFE) ou
chamada de API direta. Linhas pontilhadas = acoplamento fraco (evento,
federação de componente, backend-a-backend). Repare que `mfe-dashboard` e
`mfe-atividade` não têm API própria de escrita — são puros read-models.

---

## 2. Composição em runtime (Module Federation)

```mermaid
graph LR
    subgraph deploy ["Deploy independente — cada MFE tem seu próprio pipeline/CDN"]
        RE_Inst["mfe-instituicoes<br/>remoteEntry.[hash].js"]
        RE_Alu["mfe-alunos<br/>remoteEntry.[hash].js"]
        RE_Admin["mfe-admin<br/>remoteEntry.[hash].js"]
        RE_Ativ["mfe-atividade<br/>remoteEntry.[hash].js"]
        RE_Dash["mfe-dashboard<br/>remoteEntry.[hash].js"]
    end
    Browser["Navegador do usuário"]
    Shell["shell<br/>carrega remotes via import() sob demanda"]

    Browser -->|"1 . carrega o shell"| Shell
    Shell -->|"2 . usuário navega /alunos → import() lazy"| RE_Alu
    Shell -->|"3 . usuário abre /instituicoes → import() lazy"| RE_Inst
    Shell -.->|"carregado só quando a rota/ação precisa"| RE_Admin
    Shell -.->|"carregado só quando a rota/ação precisa"| RE_Ativ
    Shell -.->|"carregado só quando a rota/ação precisa"| RE_Dash
```

**Ponto-chave**: a composição acontece em **runtime**, no navegador do
usuário — não em build time. Isso é o que permite deploy independente por
time: `mfe-alunos` pode publicar uma versão nova às 15h sem coordenar com
`mfe-instituicoes`, porque o shell só busca o `remoteEntry.js` mais recente
na próxima navegação. O hash no nome do arquivo (seção de performance da
spec técnica) é o que permite cache agressivo em CDN sem servir bundle
desatualizado.

---

## 3. Camadas internas do código (Clean Architecture)

```mermaid
graph LR
    subgraph frontend ["Adapter — frontend"]
        Hook["use-permissions.ts<br/>(hook React)"]
        Store["permission-store.ts<br/>(framework-agnostic)"]
    end
    subgraph infra ["Adapter — infra (HTTP)"]
        MW["autorizacao-middleware.ts<br/>(Express)"]
    end
    subgraph dominio ["Domínio — sem I/O, sem framework"]
        Policy["AutorizacaoPolicy"]
        Port["MembroGrupoRepository<br/>(porta / interface)"]
        Tipos["tipos.ts"]
    end
    DB[("Banco / API Grupos")]

    Hook --> Store
    Store -. tipos apenas .-> Tipos
    MW --> Policy
    MW -. tipos apenas .-> Tipos
    Policy --> Tipos
    Policy --> Port
    Port -. implementado por .-> DB
```

**Ponto-chave**: as setas nunca saem do domínio em direção a infra/frontend —
só entram. `AutorizacaoPolicy` não importa Express nem React; quem depende
dela são os adapters. É essa inversão que permite trocar a implementação de
`MembroGrupoRepository` (Postgres hoje, um motor de política real como
`@platsec-security/authz` amanhã) sem tocar middleware nem hook.

---

## 4. Fluxo completo de uma escrita — editar um Aluno (ponta a ponta)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant FE as mfe-alunos (UI)
    participant PStore as permission-store (client)
    participant API as API Alunos
    participant MW as autorizacao-middleware
    participant Policy as AutorizacaoPolicy (domínio)
    participant Repo as MembroGrupoRepository
    participant AtivAPI as API Atividades
    participant Bus as Event Bus
    participant Outros as mfe-dashboard / mfe-atividade

    U->>FE: abre tela de edição do Aluno
    FE->>PStore: usePodeEditarInstituicao(instituicaoId)
    PStore-->>FE: true/false (só decide mostrar o botão — UX, não segurança)
    U->>FE: clica "salvar"
    FE->>API: PUT /alunos/:id
    API->>MW: requireAlunoEditPermission
    MW->>MW: loadAluno(id) → resolve instituicaoId real<br/>(nunca confia no body do request)
    MW->>Policy: podeEditarInstituicao(usuario, instituicaoId)
    Policy->>Repo: findByUsuarioAndInstituicao
    Repo-->>Policy: papel do usuário (admin/membro/nenhum)
    Policy-->>MW: true/false
    alt não autorizado
        MW-->>FE: 403 Forbidden
    else autorizado
        MW->>API: next() → executa a escrita de negócio
        API->>API: grava Aluno + registro de Atividade (mesma transação)
        Note over API,AtivAPI: auditoria é responsabilidade do backend,<br/>nunca depende do evento chegar (spec técnica §7)
        API-->>FE: 200 OK
        API->>Bus: emit(aluno.data.changed.v1, {correlationId})
        Bus-->>Outros: notifica (gatilho de revalidação, nunca fonte do dado)
        Outros->>AtivAPI: refetch pontual, se necessário
    end
```

Este diagrama amarra tudo que foi desenhado na conversa: UX de permissão
(client), decisão real de autorização (backend, ADR-4), resolução segura do
recurso (CWE-639), auditoria confiável (backend, não frontend), e
propagação por evento como sinal — não como dado.

---

## 5. Revogação de permissão em tempo quase real

```mermaid
sequenceDiagram
    actor SA as Super-admin / Admin de Grupo
    participant AdminFE as mfe-admin
    participant AdminAPI as API Grupos/Permissões
    participant Bus as Event Bus
    participant UFE as MFE do usuário afetado<br/>(aba já aberta)
    participant PStore as permission-store<br/>(do usuário afetado)

    SA->>AdminFE: remove usuário do Grupo / rebaixa admin
    AdminFE->>AdminAPI: PATCH /grupos/:id/membros/:usuarioId
    AdminAPI->>AdminAPI: grava mudança + atividade
    AdminAPI-->>AdminFE: 200 OK
    AdminFE->>Bus: emit(permissoes.usuario.changed.v1, {affectedUserId})
    Bus-->>UFE: notifica (se affectedUserId === usuário logado)
    UFE->>AdminAPI: GET /me/permissions (revalidação)
    AdminAPI-->>UFE: novo snapshot de permissões
    UFE->>PStore: refresh(snapshot)
    PStore-->>UFE: botão de editar some, sem precisar logout
    Note over UFE,PStore: Se o evento não chegasse (aba em outra rota),<br/>a próxima tentativa de escrita seria barrada<br/>pelo backend de qualquer forma (ADR-4) —<br/>o evento só melhora a UX, não é a garantia de segurança
```
