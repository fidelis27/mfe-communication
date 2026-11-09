# Visual baseline audit

The pre-change screenshots were captured from the published Host preview at
`https://mfe-communication-host.vercel.app`, with each remote opened through
the Host's routes at 360, 768, and 1280 CSS pixels. The temporary screenshots
were deleted after review as requested; this document preserves the findings.

## Confirmed visual findings

- Each remote paints a different page background. The gradient tokens are
  defined separately for Student, Institution, Activity, Dashboard, and Admin.
- Remote stylesheets include generic selectors such as `h1`, `label`, `input`,
  `button`, `.eyebrow`, `.lede`, `.empty`, and `.status`. Because federated CSS
  shares the document, these rules can affect another remote or the Host.
- `--font-serif` and `--font-sans` resolve to the same Roboto family. Main
  headings mostly use weight 400, and the Institution heading grows to 2.5rem
  at the mobile breakpoint.
- Forms, buttons, cards, status/role badges, empty/error states, and toast UI
  are implemented separately in multiple remotes.
- The Student form/list grid and student rows have child content wider than
  their available width at 360px (for example, 321px of scroll content in a
  301px list). The document itself does not gain horizontal scroll, so the
  overflowing row content is clipped rather than discoverable by scrolling.
- At 360px, headings and supporting copy in multiple remotes appear cut at the
  right edge in the screenshots. This is most visible on Student and
  Institution; responsive wrapping and component sizing need attention.
- Some Admin screenshots taken during the route sweep show the shell and tabs
  before query content appeared. This is a transient loading capture, not
  evidence of a stable blank state.

## Runtime limitations observed

- Published Dashboard and other remotes can render data, but the Host's
  WebSocket attempts to connect to `ws://localhost:3333/events` from the
  published site and reports offline/reconnecting.
- The standalone Admin preview's request to
  `https://secretaria-backend.onrender.com/groups` is blocked by CORS and
  renders its API error state. This is a deployment/backend configuration
  issue, not a styling regression, and is outside this design-system change.

The visual audit does not represent stable API-backed empty, loading, and error
states for every route.
