# ADR-0001: Isolate TanStack Query clients by remote

## Status

Accepted.

## Context

The five remotes query and mutate backend resources independently while running
in the same browser page through Module Federation. They need a consistent
TanStack Query runtime, but sharing one cache across separately deployed MFEs
would couple their query keys, invalidation behavior and lifecycles.

## Decision

- Share `@tanstack/react-query` as a Module Federation singleton in every
  remote.
- Create one `QueryClient` in each remote's root and provide it only to that
  remote's component tree.
- Keep cache keys feature-specific and include the API URL and resource
  identity where applicable.
- Propagate domain-event envelopes through the in-page bus so each remote can
  update or invalidate its own cache, deduplicating by `eventId`.

## Alternatives considered

- **One cache in the host or `@mfe/shared`:** rejected because it creates
  cross-remote cache ownership and invalidation coupling.
- **A separate Query library runtime in each remote:** rejected because
  providers and hooks may resolve to different React contexts under
  federation.

## Consequences

Cache entries and mutations remain isolated to the remote that owns them, while
all remotes use the same federated Query runtime. Domain events are the
cross-remote synchronization mechanism; they do not expose one remote's cache
to another.
