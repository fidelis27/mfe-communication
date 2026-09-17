# MFE Architecture

Overview

- We split the frontend into independent Micro Frontends (MFEs), one per bounded context.
- Each MFE is independently developed, tested and deployed. They communicate via domain events and shared contracts.
- In this repository, the frontend is organized as a monorepo of Vite apps, one package per MFE plus a host shell.

Recommended MFEs

- `mfe-institution`: Institution CRUD, CNPJ validation, quick-create modal for Student flow.
- `mfe-student`: Student CRUD, paginated lists, filters by institution.
- `mfe-admin`: People (CRM), groups, membership management.
- `mfe-activity`: Activity feed (read-only projections), consumes write events from other domains.
- `mfe-dashboard`: Aggregations and KPIs, subscribes to events for live updates.

Monorepo layout (recommended)

- `modules/frontend/packages/host/`
- `modules/frontend/packages/mfe-institution/`
- `modules/frontend/packages/mfe-student/`
- `modules/frontend/packages/mfe-admin/`
- `modules/frontend/packages/mfe-activity/`
- `modules/frontend/packages/mfe-dashboard/`
- `modules/frontend/packages/shared/`

Communication

- Backend services own authoritative APIs and publish domain events (event bus / message broker).
- MFEs call backend APIs for writes and listen to events (WebSocket or pubsub) for realtime UI updates and revocation.
- The host shell decides which module to render and loads remote modules at runtime via Module Federation.

Module Federation

- Use Module Federation to load and compose MFEs at runtime when needed.
- Shared libraries (React, UI kit) should be singletons and provided by the host shell.
- Each MFE exposes a remote entry and the host declares the remote URLs through environment variables.

Vercel + monorepo

- Vercel supports monorepos by project, not by forcing a single app per repo.
- Each Vite package can be imported as a separate project with its own root directory.
- For this repo, the deploy model is:
  - `host` -> one Vercel project
  - `mfe-student` -> one Vercel project
  - `mfe-institution` -> one Vercel project
  - `mfe-activity` -> one Vercel project
  - `mfe-dashboard` -> one Vercel project
  - `mfe-admin` -> one Vercel project
- Each deployed project builds from its own folder and publishes its own `dist` output.
- The host receives the remote URLs via `VITE_MFE_*_URL` and loads each remote at runtime.

APIs & Contracts

- Define stable REST/gRPC endpoints for core operations (create/edit/inactivate), and an event schema for emitted events.
- The backend remains the source of truth for writes; the frontends are consumers of the event stream and API responses.

Next steps

- Keep each MFE as a Vite project with independent build and deploy.
- Connect CI/CD and deployment per MFE.
- Validate remote URLs and CORS in production before enabling live event traffic.
