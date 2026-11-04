# ADR-0002: Test the real federation in browser E2E checks

## Status

Accepted.

## Context

The Host loads five independently built remotes at runtime through Module
Federation. Component tests that replace remotes with mocks cannot catch
failures in `remoteEntry.js`, exposed modules, federated dependencies or
navigation between the shell and real remotes. Running the complete backend,
database and identity provider for every browser test would make the CI gate
depend on additional services and mutable state.

## Decision

- Use Playwright with Chromium to exercise production builds of the Host and
  all five remotes served locally.
- Load remotes through the Host's real Module Federation configuration; do not
  replace remote components in federation E2E scenarios.
- Intercept API and WebSocket traffic at the browser network boundary with
  deterministic fixtures. Do not start the backend, database or Supabase for
  this test suite.
- Cover the critical browser integration paths: module navigation, a student
  creation request, event-driven updates, an unavailable remote, an expired
  session and the unauthenticated login state.
- Make this suite a required CI check and retain Playwright diagnostics when it
  fails.

## Alternatives considered

- **Mock remotes in the browser tests:** rejected because it bypasses the
  federation runtime and cannot detect broken remote entries or exposed
  modules.
- **Start all production-like backend and identity services for every E2E
  run:** rejected for this CI suite because external service availability and
  mutable data would make the gate less deterministic. A separately managed
  deployed integration suite may provide that coverage later.
- **Use network-level API and WebSocket mocks with built remotes:** accepted
  because it retains real browser federation while isolating backend behavior
  from UI integration checks.

## Consequences

The suite detects browser-level integration regressions across the Host and
real remote builds while remaining deterministic and self-contained. It does
not prove compatibility with the deployed API, database, Supabase or a real
WebSocket server. Mock fixtures can drift from backend behavior, so shared
contracts and backend tests remain necessary; this suite must not be described
as a live-backend E2E test.
