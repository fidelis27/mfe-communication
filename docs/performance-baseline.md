# Frontend navigation baseline

## Scope and method

Captured on 2026-11-03 from the deployed Host and the five remote routes using
the integrated Chromium browser with an authenticated session. Viewport:
557 x 359 CSS pixels. Each route was opened as a full-page navigation after the
Dashboard had already loaded, so this is a warm-cache snapshot, not a cold-load
benchmark.

The remote-ready time is measured from navigation start until the remote's
`h1` is visible. Request count, Navigation Timing, FCP, LCP and CLS come from
the browser Performance APIs. JavaScript sizes are decoded response-body bytes
for the Host and route scripts; they are not compressed network-transfer sizes.

| Route | TTFB (ms) | FCP (ms) | LCP (ms) | CLS | Remote ready (ms) | Requests | Decoded JS (bytes) | Largest JS (bytes) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | 11 | 292 | 400 | 0.0003 | 429 | 22 | 800,237 | 486,433 |
| Estudantes | 10 | 212 | 408 | 0.0474 | 429 | 22 | 801,254 | 486,433 |
| Instituicoes | 10 | 292 | 416 | 0.0489 | 479 | 21 | 800,094 | 486,433 |
| Atividade | 15 | 232 | 336 | 0.0003 | 353 | 21 | 799,288 | 486,433 |
| Admin | 15 | 304 | 448 | 0.0200 | 526 | 21 | 815,216 | 486,433 |

The largest JavaScript asset on each route was the Host's shared bundle
(`shared-BqK99diX.js`, 486,433 decoded bytes). The largest remote asset was
`schemas` at 89,921 decoded bytes.

## Limits

- One observation per route; these values are reference points, not statistical
  distributions.
- The browser reported 3,000 visible transfer bytes per route, but the
  cross-origin remotes do not expose complete Resource Timing data. Total wire
  bytes and reliable compressed chunk sizes were therefore unavailable.
- INP was not measured because no representative interaction sequence was
  recorded.
