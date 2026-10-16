# Architecture

> Applies the ecosystem's [wow-two-ws frontend architecture](../../../../../conventions/development/frontend/architecture/architecture.md) to `@wow-two-beta/ui`. The `wow-two-ws/conventions/` are the converging single source of truth; this doc is the SDK's local application + ESLint mechanics.

The single architectural rule of `@wow-two-beta/ui`: **layered imports**.

## Layers

`src/` is split into three physical layer folders + the root barrel:

| Layer | `src/{layer}/` holds | May import | May NOT import |
|---|---|---|---|
| **Foundation** | `utils` · `hooks` · `icons` · `primitives` · `themes` · `http` | other foundation | anything above |
| **Domain** | `color` (pure value-types + ops, no React) | foundation | presentation · root |
| **Presentation** | `actions` · `display` · `feedback` · `forms` · `layout` · `nav` · `overlays` (component *groups*) | foundation · domain · **any sibling presentation group** | root barrel |
| **Root** | `src/index.ts` | everything below | nothing else |

Foundation never reaches up. Domain is pure logic on foundation. Presentation composes foundation + domain + sibling groups. Root only assembles.

> **Terminology**: inside **presentation**, each folder (`actions`, `display`, …) is a component *group*. Older sections below call these groups "domains" — historically the SDK's only grouping; they now live under `presentation/`. The **domain** layer (`color`, …) is the separate pure-logic layer.

## Foundation sub-layers

Foundation is internally ordered (informal — not ESLint-enforced, but respected by convention): `utils` / `hooks` / `icons` are leaves; `primitives` (L2 headless) sits on top; all are consumed by `domain` + `presentation`.

- **`utils`** — pure helpers (`cn`, ref/event composition, polymorphic types, `tv` wrapper).
- **`hooks`** — pure React hooks (state, refs, observers). May use `utils`.
- **`icons`** — `<Icon>` registry. May use `utils`.
- **`primitives`** — headless components (Slot, Portal, FocusScope, etc.). Behavior + a11y only, no visuals beyond layout. May use `utils` + `hooks`. **This is L2.**
- **`themes`** — OKLCH theming engine + tokens (JS at `@wow-two-beta/ui/foundation/themes`; `themes.css` / `themes.json` stay top-level).
- **`http`** — HTTP client helpers.

## Domain layer

Pure value-types + operations — no React, no presentation. Depends only on foundation.

- **`color`** — the `Gradient` union + `withStop` / `reverseStops` / `withAngle` / `withRadius`, `GradientType`; color math. Exported at `@wow-two-beta/ui/domain/color`.

## Why the foundation rule

Foundation never depending on domain/presentation keeps `utils/`, `hooks/`, `icons/`, `primitives/` standalone. They can be lifted to a `@wow-two-beta/core` package any time without touching component code.

## Cross-group rule (revised 2026-05-04)

Originally, sibling-group imports were forbidden — the goal was every group lifting cleanly into its own repo. In practice this generated significant duplication: `Select` rebuilt popover internals; `DatePicker / TimePicker / DateRangePicker` each reconstructed `Portal + AnchoredPositioner + FocusScope + DismissableLayer` rather than importing `Popover` from `overlays/`.

**Rule today**: presentation groups may import any sibling group. Convention (not lint-enforced):

- **L3 atoms / L4 molecules** — should stay in-group when natural. Reaching across is allowed but signals the component might belong in a shared layer or a different group.
- **L5+ organisms** — compose freely across groups. `forms/DatePicker` may import `overlays/Popover` directly.

The lift-out story is preserved at the L3/L4 layer (atoms/molecules stay group-local). When the day comes to split, L5+ wrappers rebuild against the standalone packages.

## Enforcement

`eslint-plugin-boundaries` configured in `eslint.config.js`. Element types:

- `foundation` — `src/foundation/*/**`
- `domain` — `src/domain/*/**`
- `presentation` — `src/presentation/*/**`
- `root` — `src/index.ts`

Rules:

```
foundation   → foundation
domain       → foundation
presentation → foundation + domain + any sibling presentation
root         → foundation + domain + presentation
```

Violations fail `pnpm lint`. CI runs lint on every push.

## Atom & molecule rule (within a presentation group)

A presentation component lives in one of three tiers:

- **L3 atom** — imports only foundation (+ domain value-types). May not import another component (atoms never compose atoms).
- **L4 molecule** — composes L3 atoms or other L4s in the same group. May import foundation freely. Cross-group imports allowed but should be deliberate.
- **L5 organism / L6 pattern** — composes any component from any group.

The L3-doesn't-import-L3 rule is convention (not lint-enforced) — when you find yourself wanting to compose two atoms, that composition is L4.

L3 atoms can use **L1 Icon** (it's foundation) and **L2 primitives** (Slot, Portal, FocusScope, etc.). When atom-on-atom composition is wanted, the result is L4.

## Group-internal helpers

Each presentation group may co-locate non-component utility files alongside its component folders. Naming convention:

| Suffix | Use | Examples |
|---|---|---|
| `*Extensions.ts` | Helpers extending a built-in or external type | `DateExtensions.ts`, `ColorExtensions.ts` |
| `*Styles.ts` | Shared `tailwind-variants` style configs | `InputStyles.ts` |
| `*Helpers.ts` | Other group-specific utilities | `FormHelpers.ts` |

These files are not exported from the group barrel — they're consumed by the group's components only. The "internal" signal is "absent from `index.ts`", not file naming.

## Casing

- Folders: `camelCase`
- Files: `PascalCase` (component files, spec, stories, variants)
- Index: `index.ts` (lowercase, always)

## Per-component shape

```
{group}/{componentName}/
├── {ComponentName}.tsx
├── {ComponentName}.spec.md     ← written FIRST, fills component-standard.md
├── {ComponentName}.stories.tsx
├── {ComponentName}.variants.ts
└── index.ts
```

Spec before code. Stories cover every visual state in spec. Components without visual variants may omit `*.variants.ts`. Primitives (foundation) typically omit `*.stories.tsx` since they're headless.

## Vue package

`@wow-two-beta/ui-vue` (`engineering/codebase/wow-two-sdk-beta-fe/`) is the active package; React
implementation and release are parked. Settled decisions:

- Package `@wow-two-beta/ui-vue`, `0.x.y` beta-forever — the React package's release contract.
- Vue 3.5+ `<script setup>` SFCs, not TSX — the DX gain is the point of the port.
- Vite library mode + `@vitejs/plugin-vue` + `vite-plugin-dts` — `tsup` cannot compile SFCs.
- Self-contained: the package copies the agnostic layer; no shared `core` package with React.
- Every public component has a spec and a playground fixture; risky behavior gets focused tests.
- `release-vue.yml` carries a `paths:` filter, separate from `release.yml` — a React push never publishes Vue.
- The package carries the full React capability surface, `router` and `query` included.
- Exact decimal and int64 wire representations are agreed per endpoint with the backend; the SDK sets no global
  coercion policy.
