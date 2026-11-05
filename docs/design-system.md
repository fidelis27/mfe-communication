# Design system

The Host and five remotes use the shared tokens and UI primitives from
`@mfe/shared`. Keep presentation independent of MFE business logic so components
can be reused without coupling one remote to another.

## Tokens

`modules/frontend/packages/shared/src/tokens.css` is the source of truth for
page and raised surfaces, text, action and status colors, borders, focus,
typography, spacing, radii, and elevation. The page uses one neutral background;
module identity belongs in small accents, not page-level gradients. Inter is
bundled through `@fontsource/inter`; use the regular, medium, and semibold
weights and the shared type scale.

Use semantic variables such as `--color-surface-page`,
`--color-text-secondary`, `--color-danger-text`, `--radius-card`,
`--shadow-sm`, and `--space-4`. Do not introduce fixed colors or MFE-specific
token variants. Add each new foreground/background or control/border pairing to
`scripts/check-contrast.mjs`. `npm run check:contrast` checks the semantic pairs
and rejects fixed colors, shadows, or radii in CSS Modules across the frontend
packages.

## Shared UI

Import primitives from the `@mfe/shared/ui` subpath:

```tsx
import { Button, Field, PageHeader, useConfirm } from "@mfe/shared/ui";

<PageHeader eyebrow="Secretaria" title="Instituições" />;
<Field id="name" label="Nome" required />;
<Button loading>Salvando...</Button>;

const { confirm, dialog } = useConfirm();
const accepted = await confirm({
  title: "Remover pessoa?",
  description: "A remoção não pode ser desfeita.",
  confirmLabel: "Remover",
  tone: "danger",
});
```

`Button` supports primary, secondary, ghost, danger, danger-secondary, and link
variants; small, medium, and large sizes; icon slots; and a typed icon-only
form that requires an accessible label. Loading disables the action while
keeping its content in place. `Field` links labels, help, and errors to input,
select, or textarea controls. `PageHeader`, `Card`, `StatusBadge`,
`DataList`/`DataRow`, `SearchInput`, `Tabs`, `EmptyState`, `ErrorState`,
`Skeleton`, and `ToastRegion` provide reusable presentation and accessible
states.

`Modal` renders a labelled dialog in a portal, traps keyboard focus, supports
Escape/backdrop dismissal, locks body scrolling, restores focus, and honors
reduced motion. `ConfirmDialog` composes it with async action error handling;
danger confirmations focus Cancel first and cannot be dismissed while busy.
`useConfirm` returns a promise resolving to the user's decision and optionally
accepts an async action that must succeed before resolving `true`.

Every primitive lives in its own directory under
`modules/frontend/packages/shared/src/ui/`, with typed props, CSS Modules, and
focused interaction/accessibility tests. Keep components free of business
logic and MFE-specific imports.

## CSS isolation and responsive layout

Vite's CSS Modules scope each application stylesheet under a locally generated
root class. The root wrapper is required: do not remove it or import application
styles as global CSS. Shared global CSS is limited to semantic tokens and the
Host reset. When adding a selector, keep it under its MFE root; do not add
unscoped element selectors such as `h1`, `button`, or `label`.

Use `BREAKPOINTS` from `@mfe/shared` for responsive behavior. Forms stack and
long row content wraps on narrow screens; avoid fixed minimum widths that cause
horizontal overflow at 360 CSS pixels. The Host retains a `100dvh` shell and
owns page scrolling; remotes should not introduce viewport-height constraints.

Validate changes with the affected workspace build, relevant Vitest/Axe tests,
`npm run check:contrast`, `npm run lint`, `npm run typecheck`, and
`npm run format:check`.
