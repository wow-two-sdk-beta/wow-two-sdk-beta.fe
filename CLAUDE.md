# wow-two-sdk-beta.ui

## What is this

Two independently built beta packages: React `@wow-two-beta/ui` and Vue `@wow-two-beta/ui-vue`, under
`engineering/codebase/wow-two-front-beta-sdk/` and `engineering/codebase/wow-two-sdk-beta-fe/`.
Both remain intentionally pre-1.0. The active sweep is Vue; the legacy React-specific sections below apply only to React.

> **Beta-forever rules**: no CHANGELOG, no PR gates, direct main releases, fix-forward when broken. Package-scoped CI auto-bumps `0.0.y`. Vue release CI gates types, lint, format, tests, build and the actual packed consumer; the legacy React workflow and guidance remain separate.

## Vue sweep scope

- The active conventions sweep targets `engineering/codebase/wow-two-sdk-beta-fe/` (`@wow-two-beta/ui-vue`).
- React implementation and release are parked; the React-specific guidance below does not override the Vue sweep.
- Vue source follows the workspace frontend conventions; instance API contracts live in adjacent `*.spec.md` files.
- Vue tests and executable demos live under `tests/` and `apps/playground/`; do not add colocated React stories.
- Vue utility roles use the owning convention's suffix; do not add `*Helpers.ts` or duplicate `*.standard.md` rules.
- The sweep includes specifications and behavior verification; deferring standardization does not apply to it.
- Run commands from the Vue package directory; the repository root is not a pnpm package.
- Validate typecheck, SFC compilation, lint, format, tests, build and the packed artifact before release.
- Existing staged/unstaged work belongs to the shared sweep; preserve it and record each implementation lane.
- Versioning remains beta `0.0.y`; radical changes are permitted and there are no production consumers.

## Tech catalog & roadmap

Source-of-truth for every UI tech, pattern, and browser API we may consider. Two co-located docs in [`engineering/architecture/analysis/ui-philosophy/`](./engineering/architecture/analysis/ui-philosophy/):

- **[`ideas.md`](./engineering/architecture/analysis/ui-philosophy/ideas.md)** — every UI tech / pattern / framework / cross-cutting vector / component / delegate / browser API (full MDN encyclopedia) / React+client ecosystem (sketch) that exists in Web2. **No verdicts** — pure inventory. Source of ideas; read when considering scope expansion.
- **[`targets.md`](./engineering/architecture/analysis/ui-philosophy/targets.md)** — verdict per item: **DONE / NOW / NEXT / LATER / MAYBE / SKIP / LOCKED**. Mirrors `ideas.md`'s structure. Read when deciding what to ship next; cross-references the [roadmap](../../../../docs/ui-beta-roadmap.md) for phase placement.

When scope expansion is considered, walk `targets.md` first. If the desired vector is missing or marked **MAYBE/LATER**, raise it for triage and update both files. Treat these two as a paired source-of-truth — when one changes, sync the other.

## Casing convention

- Folders: `camelCase` (`numberInput/`, `actions/`, `inputPrimitives/`)
- Files: `PascalCase` (`Button.tsx`, `Button.stories.tsx`, `Button.variants.ts`)
- Index files: lowercase (`index.ts`)

### Shared/internal helper files (within a domain)

Each domain may co-locate non-component utility files alongside its component folders. Use descriptive PascalCase + role-based suffix:

| Suffix | Use | Examples |
|---|---|---|
| `*Extensions.ts` | Helpers that extend a built-in or external type | `DateExtensions.ts`, `ColorExtensions.ts`, `StringExtensions.ts` |
| `*Styles.ts` | Shared `tailwind-variants` configurations | `InputStyles.ts`, `ButtonStyles.ts` |
| `*Helpers.ts` | Domain-specific utility fns that don't fit `Extensions` | `FormHelpers.ts` |

These files are not exported from the domain barrel — they're consumed by the domain's components only. The "internal" signal is "absent from `index.ts`", not file naming.

The `*Extensions.ts` postfix is borrowed from .NET extension methods — files of this shape extend an existing type with utilities. Most JS libs use camelCase for utilities; we deliberately diverge for consistency with the broader wow-two ecosystem (which is .NET-heavy).

## Per-component pattern

Every component lives in its own folder with this minimal shape:

```
forms/numberInput/
├── NumberInput.tsx           ← implementation
├── NumberInput.stories.tsx   ← Storybook stories (≥ 1 per key visual state)
├── NumberInput.variants.ts   ← tailwind-variants config (when needed)
└── index.ts                  ← barrel
```

**Build first; standardize later.** First-generation components ship code + stories + barrel only. The per-component standardization pass (separate chat per component, in a later phase) adds:

- `Component.standard.md` — behavioral contract (RFC 2119 rules + rationale)
- `Component.spec.md` — concrete API (enums, prop signatures, anatomy)

Templates exist at [`engineering/architecture/templates/component-standard.md`](./engineering/architecture/templates/component-standard.md) and [`engineering/architecture/templates/component-spec.md`](./engineering/architecture/templates/component-spec.md) — they're picked up during the standardization pass, not during first-gen build.

> **Note**: many existing components still have a legacy `*.spec.md` from earlier iterations. These will be rewritten (or replaced by the dual-doc pair) when the standardization pass walks each component. Don't author new ones during build batches.

## Layout

- `src/foundation/{utils,hooks,http,icons,primitives,themes,storage,resilience,identifiers,i18n}` — **foundation** (no upward deps; ESLint enforces). `identifiers/` = branded `Guid`; `http/` also holds the `Page`/`TokenPage` pagination contracts; `i18n/` = `LocaleProvider` + `Intl` formatters. `primitives/` is the L2 headless layer (Slot, Portal, FocusScope, AnchoredPositioner, etc.). Hooks/utils are 1-per-folder (`useControlled/{useControlled.ts,index.ts}`).
- `src/domain/*` — pure types/ops (may import foundation only).
- `src/presentation/{actions,display,feedback,forms,layout,nav,overlays}` — **components** (may import foundation + domain **and any sibling presentation group**; ESLint enforces no upward reach into root)
- `engineering/architecture/templates/component-standard.md` — template every `*.standard.md` fills
- `engineering/architecture/templates/component-spec.md` — template every `*.spec.md` fills
- `engineering/architecture/architecture.md` — full layering rule + ESLint mechanics
- `engineering/architecture/component-catalog.md` — every shipped component, per group + import subpath (**derived** — run `node engineering/architecture/gen-catalog.mjs` to sync)
- `engineering/architecture/vector-registry.md` — master list of all vectors (shipped modules + cross-cutting + possible-unbuilt); indexes `targets.md`/`frontend-modules.md`
- `engineering/architecture/testing.md` — test-layer plan, tiers, iteration tracker, findings
- `engineering/architecture/decisions/` — cross-component ADRs
- `engineering/planning/backlog.md` — every unbuilt item · `engineering/planning/version-track/v{X.Y}/v{X.Y}.md` — one per version, newest = active
- `engineering/development/rules.md` — agent working rules: Vue house rules, parallel lanes, sweep method
- `.storybook/` — catalog config (+ `vitest.setup.ts` for story tests)
- `apps/playground/` — Vite sandbox for ad-hoc prototyping

## Versioning

- `0.x.y` forever. CI auto-bumps `y` on every push to `main`.
- No semver guarantees. Consumers should pin exact versions if stability matters.
- Breaking changes go in normally — fix-forward in consumers.

## Stack

- React 19 · TypeScript strict · **Tailwind v4** (CSS-first via `@theme`) · `@floating-ui/react` · `@radix-ui/react-focus-scope` · `lucide-react`
- Build: `tsup` (ESM) + `tsc --emitDeclarationOnly` (DTS) · Dev: `vite` (in playground) · Catalog: Storybook 10 + `@tailwindcss/vite` plugin · Lint: ESLint 9 flat config + `eslint-plugin-boundaries`
- Tests: Vitest 4 — `unit` (node) · `browser` (Playwright chromium) · `storybook` (`@storybook/addon-vitest`: every story = smoke test, `play()` = interaction test)
- Pkg manager: `pnpm` workspace (root pkg + `apps/*`)

## Testing

- `pnpm test` (all) · `test:unit` · `test:browser` · `test:stories` · `test:watch` · `test:ui` · `coverage` (report-only, never a gate)
- E2E-first: interaction `play()` stories in `*.stories.tsx` are the primary tier; bespoke unit tests only for pure logic (themes engine, hooks, utils). Plan, conventions, and known harness gotchas: **`engineering/architecture/testing.md`**.
- New component → ship interaction `play()` stories with it (import from `'storybook/test'`).
- Path filters are substring matches: `pnpm vitest run --project storybook src/presentation/nav/menu` also runs `menubar`.

## Theming

- "Use theme X" / generate a brand theme → **[`THEMES.md`](./THEMES.md)** (token contract, curated ids, `generateTheme` seed, how to apply: import `@wow-two-beta/ui/themes.css` + add `theme-{id}` & `dark`).
- Themes carry a `validated | candidate` status — `validated` (e.g. `smart-qr`) is app-proven and safe for production; `candidate` is AA-proven but not yet app-validated. Prefer `validated` for real apps. Full lifecycle in `THEMES.md`.
- Engine lives in `src/themes/` (OKLCH, no color library); ships at `@wow-two-beta/ui/themes` + `themes.css` + `themes.json`. [Studio](https://wow-two-sdk-beta.github.io/wow-two-sdk-beta.ui/theme-studio).

## Working rules

- **Build first, standardize later.** First-gen components ship code + stories + barrel only. The standardization pass (per-component, separate chats, later phase) adds `*.standard.md` + `*.spec.md`.
- **Foundation cannot import domains.** ESLint enforces.
- **Domains can import any sibling domain.** Convention: L3 atoms / L4 molecules should stay in-domain when natural; L5+ organisms compose freely across domains. The lint rule is permissive — judgment calls go to the spec.
- **Subpath exports per top-level src/ folder.** Consumers can pull just the slice they need.
- **One component per folder.** Multiple files share the folder; never flatten.
- **Default theme out-of-box.** Configure key tokens; rest defaults gracefully.

## Out of scope (deliberately deferred)

- React's legacy CI test-gate guidance is unchanged. Vue release CI runs the complete package gates.
- No CHANGELOG. Git log is the changelog.
- No PR review. Push to main.
- No graduation/distill rule yet. Beta-forever until platform layer matures.
