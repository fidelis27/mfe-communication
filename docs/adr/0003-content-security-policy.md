# ADR-0003: Generate a Content Security Policy for federated builds

## Status

Accepted.

## Context

The Host loads five remote applications and connects to an API, Supabase, and
optionally Sentry. These origins are selected through `VITE_*` build
variables, while the static Vercel configuration cannot derive a policy from
those values. CSP delivered through a meta element also cannot enforce
`frame-ancestors`.

## Decision

- Generate a CSP meta element in the Host's production Vite build from the
  configured remote, API, Supabase, and optional Sentry origins. Require all
  five remote URLs, `VITE_API_URL`, and `VITE_SUPABASE_URL`; fail the build
  with a clear error if one is missing or invalid.
- Restrict scripts, styles, and fonts to the Host and the five remote
  origins. Federation emits remote CSS links and each remote serves its local
  `@fontsource` files from its own origin; allowing only `'self'` blocks
  remote styles and fonts. Restrict
  connections to the API, API WebSocket scheme, Supabase, Supabase WebSocket
  scheme, and configured Sentry origin. Allow `data:` images, restrict
  `base-uri` and `form-action` to `'self'`, and set `object-src 'none'`.
- Do not allow `unsafe-inline` or `unsafe-eval`. Configure Zod's documented
  `jitless` mode before schema parsing is first used in the Host/shared package
  and in each remote API module because its optional dynamic-code probe
  otherwise reports a CSP violation even when caught. Disable this plugin in
  Vite development mode so HMR remains usable.
- Set `X-Frame-Options: DENY` in Vercel headers because `frame-ancestors` is
  not enforced in a meta-delivered CSP. Set the other host security headers
  there as well. Remotes use `nosniff` and
  `Cross-Origin-Resource-Policy: cross-origin` to support federation without
  imposing a fixed `Access-Control-Allow-Origin`.
- Validate the policy with unit tests and the production-build federation
  E2E suite, including assertions for CSP violation events and console errors.

## Consequences

Host builds require the federation, API, and Supabase URL variables. CI and
local federation E2E builds use reserved example URLs or localhost fixtures.
The tracked Host production environment file supplies the public Supabase
project URL used by the live Host; deployment still must provide the public
anon key needed by authentication. Production origins must use HTTPS. The
policy does not prove that provider-side Vercel headers are active; deployed
headers still need verification.

## Alternatives

- **A fixed CSP in `vercel.json`:** rejected because it cannot stay aligned
  with environment-specific build variables without duplicating remote URLs.
- **Allow `unsafe-inline` or `unsafe-eval`:** rejected because remote CSS
  and font loads are permitted only from known remote origins, and Zod's
  `jitless` mode avoids dynamic-code execution without relaxing script policy.
- **Use a per-response nonce and CSP response header:** rejected for this
  static Host build because no request-time server generates and propagates a
  matching nonce. The build-time meta policy is the smallest available
  integration with the existing hosting model.

The implementation is evidenced by
[`securityHeaders.ts`](../../modules/frontend/packages/host/securityHeaders.ts),
the Host's [`vite.config.ts`](../../modules/frontend/packages/host/vite.config.ts),
the shared [`types.ts`](../../modules/frontend/packages/shared/src/types.ts)
and [`events.ts`](../../modules/frontend/packages/shared/src/events.ts), and
[`federation.spec.mjs`](../../e2e/federation.spec.mjs).
