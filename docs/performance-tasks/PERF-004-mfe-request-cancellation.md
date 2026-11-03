# PERF-004 - Request cancellation

## Status

Complete.

## Implementation

TanStack Query manages each remote's server-state queries. Query functions pass
their `AbortSignal` through feature APIs and the shared request helper to
`fetch`. Each remote provides an independent `QueryClient`. When a query loses
its final observer because a remote unmounts or its query key changes, the
request is aborted and treated as query cancellation rather than an application
error.

Mutations use TanStack Query mutation state to prevent duplicate form submits.
The existing per-record pending state remains for user and membership actions
that can run on separate rows.

## Evidence

| Remote      | In-flight requests verified as cancelled     |
| ----------- | -------------------------------------------- |
| Student     | Student and institution list queries         |
| Institution | Institution list query                       |
| Activity    | Event-history query                          |
| Dashboard   | Institution, student and enrollment requests |
| Admin       | User, institution and group list queries     |

The tests unmount the remote while requests are pending and verify that the
signals received by `fetch` are aborted. The Dashboard case checks that all
three parallel requests are cancelled.

## Validation

`npm run typecheck` passed.

The complete frontend test suite passed: 23 test files and 82 tests, including
the five remote cancellation cases, event-envelope delivery and deduplication,
Dashboard refresh behavior, Activity updates, UI states and accessibility
checks. All five remote production builds passed.
