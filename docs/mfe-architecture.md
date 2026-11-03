# MFE Architecture

The frontend is a monorepo of independently built Vite applications. The Go backend owns the authoritative API and publishes domain events.

## MFEs

- `host`: application shell, authentication, navigation, remote loading and the primary domain-event WebSocket.
- `mfe-institution`: institution listing and registration.
- `mfe-student`: student listing and registration, with updates from `STUDENT_CREATED`.
- `mfe-admin`: people, groups and group-membership management.
- `mfe-activity`: recent domain-event history and live activity feed.
- `mfe-dashboard`: institution, student and enrollment indicators.
- `shared`: authentication, validated API request helpers, domain-event contracts, the in-page bus and design tokens.

## Repository layout

```text
modules/frontend/packages/
  host/
  mfe-institution/
  mfe-student/
  mfe-admin/
  mfe-activity/
  mfe-dashboard/
  shared/
```

Each MFE owns its UI and feature API modules under `src/features/<feature>/api/`. The host loads remote applications at runtime through Module Federation. React, React DOM and `@mfe/shared` are shared singletons.

## Communication

HTTP requests follow this path:

```text
component -> feature API -> shared request helper -> authenticatedFetch -> backend
```

Feature APIs validate JSON responses with Zod schemas and surface typed errors. Shared helpers preserve HTTP status and backend error text where appropriate, map common failures to user-friendly messages, and leave aborted requests distinguishable.

Backend domain events reach the host over its WebSocket and are dispatched through the in-page bus to listening MFEs. `mfe-student` also opens its own WebSocket to receive `STUDENT_CREATED`; `mfe-activity` and `mfe-dashboard` use a fallback WebSocket only when the host is not ready. The in-page bus carries host commands, MFE events and re-dispatched domain events; it does not replace HTTP requests.

## Deployment

The host and each MFE are deployed as separate Vercel projects, each building from its package directory. The host resolves remote entry URLs from `VITE_MFE_*_URL`. Frontend API requests use `VITE_API_URL`; authentication uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The backend API and its data model are maintained in the separate `secretaria-backend` repository.
