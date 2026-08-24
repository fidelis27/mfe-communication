# MFE Architecture

Overview
- We split the frontend into independent Micro Frontends (MFEs), one per bounded context.
- Each MFE is independently developed, tested and deployed. They communicate via domain events and shared contracts.

Recommended MFEs
- `mfe-institution`: Institution CRUD, CNPJ validation, quick-create modal for Student flow.
- `mfe-student`: Student CRUD, paginated lists, filters by institution.
- `mfe-admin`: People (CRM), groups, membership management.
- `mfe-activity`: Activity feed (read-only projections), consumes write events from other domains.
- `mfe-dashboard`: Aggregations and KPIs, subscribes to events for live updates.

Monorepo layout (recommended)
- `packages/mfe-institution/`
- `packages/mfe-student/`
- `packages/mfe-admin/`
- `packages/mfe-activity/`
- `packages/mfe-dashboard/`
- `packages/shared-ui/` (shared components)
- `packages/shared-client/` (shared APIs, types, event schemas)

Communication
- Backend services own authoritative APIs and publish domain events (event bus / message broker).
- MFEs call backend APIs for writes and listen to events (WebSocket or pubsub) for realtime UI updates and revocation.

Module Federation
- Use Module Federation to load and compose MFEs at runtime when needed.
- Shared libraries (React, UI kit) should be singletons and provided by the host shell.

APIs & Contracts
- Define stable REST/gRPC endpoints for core operations (create/edit/inactivate), and an event schema for emitted events.

Next steps
- Scaffold `packages/*` folders and add minimal README in each MFE. Connect CI/CD and deployment per MFE.
