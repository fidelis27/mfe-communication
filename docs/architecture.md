# Architecture

Diagrams for the School Secretariat platform. Frontend lives in this repository (`mfe-communication`); the API lives in [`secretaria-backend`](https://github.com/fidelis27/secretaria-backend). All diagrams are Mermaid and render on GitHub.

Contents: [1. System context](#1-system-context) · [2. Runtime composition](#2-runtime-composition-in-the-browser) · [3. Communication layers](#3-communication-layers) · [4. Main flow](#4-main-flow-create-a-student) · [5. Backend layers](#5-backend-layers-hexagonal) · [6. Deployment](#6-deployment-topology) · [7. Data model](#7-data-model) · [8. Known gaps](#8-known-gaps-reflected-in-the-diagrams)

---

## 1. System context

Who talks to whom, at the highest level.

```mermaid
flowchart LR
    user(["Secretariat agent"])

    subgraph browser["Browser"]
        host["Host shell<br/>auth, routing, one WebSocket"]
        remotes["5 remote MFEs<br/>institution, student, admin,<br/>activity, dashboard"]
        host -- "loads at runtime<br/>(Module Federation)" --> remotes
    end

    api["secretaria-backend<br/>Go API + WebSocket"]
    db[("MariaDB")]
    auth["Supabase Auth<br/>OIDC / JWKS"]
    sentry["Sentry<br/>error tracking"]

    user --> host
    host -- "email + password" --> auth
    auth -- "access token (JWT)" --> host
    remotes -- "HTTPS + Bearer token" --> api
    host -- "WSS /events<br/>token in subprotocol" --> api
    api -- "verifies signature<br/>via JWKS" --> auth
    api --> db
    host -. "host errors" .-> sentry
```

---

## 2. Runtime composition in the browser

The host owns the shell. Remotes are separate builds, loaded lazily. React, React DOM and `@mfe/shared` are **singletons**, so every remote shares one session and one event bus.

```mermaid
flowchart TB
    subgraph host["Host (Vercel project)"]
        shell["Shell: nav, login, URL routing"]
        boundary["RemoteBoundary<br/>lazy + Suspense + error boundary"]
        ws["useDomainEvents<br/>single WebSocket, backoff reconnect"]
        shell --> boundary
        shell --> ws
    end

    subgraph remotes["Remotes (one Vercel project each)"]
        inst["mfe-institution<br/>/instituicoes"]
        stud["mfe-student<br/>/estudantes"]
        adm["mfe-admin<br/>/admin"]
        act["mfe-activity<br/>/atividade"]
        dash["mfe-dashboard<br/>/dashboard"]
    end

    subgraph shared["@mfe/shared (singleton)"]
        contract["Typed event contract"]
        bus["In-page bus<br/>globalThis.__mfeBus"]
        authlib["Auth + authenticatedFetch"]
        tokens["Design tokens"]
    end

    boundary -- "remoteEntry.js<br/>URL from VITE_MFE_*_URL" --> remotes
    host --> shared
    remotes --> shared
```

If one remote is down, only its `RemoteBoundary` shows "module unavailable"; the shell and the other remotes keep working.

---

## 3. Communication layers

Two layers, each with one job.

```mermaid
flowchart LR
    subgraph backend["Backend"]
        svc["Event service"]
        gobus["In-process Bus"]
        svc --> gobus
    end

    subgraph page["Browser page"]
        hostws["Host WebSocket"]
        pagebus["__mfeBus (in-page)"]
        a["mfe-activity"]
        d["mfe-dashboard"]
        s["mfe-student"]
        hostws -- "dispatch('domain', type, payload)" --> pagebus
        pagebus -- "domain:* (fan-out)" --> a
        pagebus -- "domain:* (fan-out)" --> d
        s -- "evt:navigate" --> pagebus
        pagebus -- "cmd:navigate / evt:navigate" --> hostws
    end

    gobus -- "WSS: domain events<br/>backend to clients" --> hostws
```

| Layer | Scope | Channels | Use |
| --- | --- | --- | --- |
| Backend domain events over WebSocket | Server to every connected client | event `type` (for example `STUDENT_CREATED`) | State changes that other screens must react to |
| In-page bus | Same page only | `cmd:*` host to MFE, `evt:*` MFE to host, `domain:*` re-dispatched backend events | Navigation, modal close, connection status |

Bus delivery rules: no listener means a per-channel queue (100 items, TTL 10 s by default); once a listener exists, delivery is fan-out. Details in [`event-bus.md`](event-bus.md).

---

## 4. Main flow: create a student

The flow that the whole architecture exists to prove: *write, persist, publish, react*.

```mermaid
sequenceDiagram
    autonumber
    actor U as Agent
    participant S as mfe-student
    participant API as Backend (Go)
    participant POL as Authorization policy
    participant DB as MariaDB
    participant BUS as Backend bus
    participant H as Host WebSocket
    participant A as mfe-activity
    participant D as mfe-dashboard

    U->>S: fill form, submit
    S->>API: POST /students (Bearer JWT, x-correlation-id)
    API->>API: verify JWT, map sub to active local user
    API->>POL: CanEditInstitution(user, institutionId)
    alt not allowed
        POL-->>API: false
        API-->>S: 403 forbidden
    else allowed
        API->>DB: INSERT student
        API-->>S: 201 Created
        Note over API,DB: Event is saved AFTER the write, in a separate operation (ADR 0001)
        API->>DB: INSERT audit_events (STUDENT_CREATED)
        API->>BUS: Publish(event)
        BUS-->>H: event for allowed institutions only
        H->>A: dispatch domain:STUDENT_CREATED
        H->>D: dispatch domain:STUDENT_CREATED
        A->>A: append to feed
        D->>API: GET refresh KPIs
    end
```

Failure behavior: if saving or publishing the event fails, the error is logged and the client still gets `201`. The write is not rolled back and the event can be lost. This is the documented trade-off until the transactional outbox exists.

---

## 5. Backend layers (hexagonal)

Dependencies point inward. The domain knows nothing about HTTP or SQL.

```mermaid
flowchart TB
    subgraph cmd["cmd/ (composition roots)"]
        server["server"]
        migrate["migrate"]
        seed["seed (non-production only)"]
    end

    subgraph adapters["internal/adapters"]
        http["httpserver<br/>handlers, identity, rate limit,<br/>security headers, WebSocket"]
        maria["mariadb<br/>repositories"]
        oidc["oidc<br/>JWT verifier"]
    end

    subgraph app["internal/application"]
        usecases["use cases<br/>institution, student, enrollment,<br/>group, user, bootstrap, health"]
        evsvc["event service + in-process bus"]
    end

    subgraph domain["internal/domain"]
        entities["entities and rules"]
        policy["authorization policy"]
        ports["repository interfaces (ports)"]
    end

    server --> http
    server --> maria
    server --> oidc
    http --> usecases
    http --> policy
    http --> evsvc
    usecases --> entities
    usecases --> ports
    evsvc --> ports
    policy --> ports
    maria -. "implements" .-> ports
```

Request pipeline in front of every handler (outermost first): security headers, CORS, identity (JWT to local user), rate limit, then the mux. Observability wraps all of it.

---

## 6. Deployment topology

```mermaid
flowchart LR
    gh["GitHub<br/>CI: lint, typecheck, test,<br/>a11y, contrast, audit, build"]

    subgraph vercel["Vercel (6 projects)"]
        vh["host"]
        v1["mfe-institution"]
        v2["mfe-student"]
        v3["mfe-admin"]
        v4["mfe-activity"]
        v5["mfe-dashboard"]
    end

    subgraph render["Render"]
        rb["secretaria-backend<br/>GET /health"]
    end

    subgraph ext["External services"]
        maria[("MariaDB<br/>TLS")]
        supa["Supabase Auth"]
    end

    gh --> vercel
    gh --> render
    vh -- "VITE_MFE_*_URL" --> v1
    vh -- "VITE_MFE_*_URL" --> v2
    vh -- "VITE_MFE_*_URL" --> v3
    vh -- "VITE_MFE_*_URL" --> v4
    vh -- "VITE_MFE_*_URL" --> v5
    vh -- "VITE_API_URL" --> rb
    rb --> maria
    rb --> supa
    vh --> supa
```

Each package builds and deploys on its own. The host only knows remote origins through build-time variables.

---

## 7. Data model

```mermaid
erDiagram
    INSTITUTION ||--o{ CAMPUS : has
    INSTITUTION ||--o{ COURSE : offers
    STUDENT ||--o{ ENROLLMENT : has
    INSTITUTION ||--o{ ENROLLMENT : receives
    USER ||--o{ GROUP_MEMBER : joins
    GROUP ||--o{ GROUP_MEMBER : has
    INSTITUTION ||--o{ GROUP : scopes
    INSTITUTION ||--o{ AUDIT_EVENT : scopes
    USER ||--o{ AUDIT_EVENT : causes
```

A student has one civil record and many enrollments over time; only one can be `active`. A transfer closes the origin enrollment and opens the destination in a single database transaction. The full column-level model is in [`diagramas.md`](diagramas.md).

---

## 8. Known gaps reflected in the diagrams

- **Event delivery is best effort** (diagram 4): the event is saved after the write, not in the same transaction. Fix: transactional outbox (backend ADR 0001).
- **Authorization is applied per handler** (diagram 5), not by a declarative route table (backend ADR 0003).
- **Single-instance bus:** the backend bus is in-process, so horizontal scaling needs a broker.
- **`mfe-student` opens its own WebSocket** even when hosted, unlike `mfe-activity` and `mfe-dashboard`, which only do so when the host is not ready. This contradicts diagram 3; either fix the code or change the diagram.
