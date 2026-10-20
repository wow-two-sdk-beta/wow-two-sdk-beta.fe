# Testing — Plan

*Last updated: 2026-06-27*

> Test-layer design for `@wow-two-beta/ui`. **Analysis + plan only** — not yet executed.
> Philosophy mirrors the backend: behavior-first ("E2E covers most"), focused units only where E2E is awkward.

## Goal

A behavior-first test layer over ~250 components, 15 hooks, 20 utils, 17 primitives, and the `themes` engine.
Most coverage comes from **stories run as interaction tests in a real browser**; isolated unit tests are reserved for pure-logic surfaces.

## Principles

- **E2E-first.** Prefer real-browser interaction through the rendered component (covers component → hook → primitive → util in one test) over unit-testing each block. Same shape as backend E2E.
- **Stories are the vehicle.** 224 stories already exist → instant render-smoke; add `play()` to upgrade to interaction "E2E".
- **`.spec.md` / `.standard.md` are the oracle.** 201 spec docs already define per-component behavior — drive `play()`/RTL assertions from them.
- **Refactor-robust > granular.** Test behavior, not internals — cheaper to keep current as components churn.
- **CI-ready now, CI-wired later.** Deterministic + headless Playwright, no machine-specific assumptions. No CI job yet; add `pnpm test` to Actions when ready.
- **No visual regression yet.** Deferred until the design system freezes (see §Deferred).

## Stack

| Concern | Tool |
|---|---|
| Runner | `vitest` |
| Browser env | `@vitest/browser` + `playwright` (chromium, headless) |
| Story tests | `@storybook/addon-vitest` — runs every story incl. `play()` |
| Component API | `@testing-library/react` + `@testing-library/user-event` |
| `play()` utils | `storybook/test` (SB10: `expect`, `userEvent`, `within`, `fn`) |
| DOM matchers | `@testing-library/jest-dom` (via `/vitest`) |
| a11y | `vitest-axe` (+ `axe-core`) |
| Coverage (report-only) | `@vitest/coverage-v8` |

## Vitest workspace — two projects (speed split)

> Paths reflect the 2026-07 restructure: `src/{foundation,domain,presentation}` (foundation = `hooks·http·icons·primitives·themes·utils`; presentation = the 7 component groups).

| Project | Env | Globs | Speed |
|---|---|---|---|
| `unit` | node | `src/foundation/{utils,themes,http}/**/*.test.ts` · `src/domain/**/*.test.ts` | ms — pure logic |
| `browser` | playwright chromium | `src/**/*.test.tsx` · `src/foundation/hooks/**/*.test.ts` | slower |
| `storybook` | playwright chromium | all `src/**/*.stories.tsx` via `@storybook/addon-vitest` (smoke + `play()`) | slower |

- `unit` stays fast → quick local feedback; `browser` is the heavier tier the future CI job can isolate onto a Playwright runner.
- Hooks need a DOM (`renderHook`) → live in `browser` for real-browser fidelity (not jsdom).

## Tiers & targets

| Tier | Vehicle | Scope | Priority |
|---|---|---|---|
| **T1 — Smoke** | `addon-vitest` auto | all 224 stories: render, no throw / console-error | wire first (free baseline) |
| **T2 — a11y** | `vitest-axe` in the story pass | all stories | with T1 |
| **T3 — Interaction "E2E"** | `play()` in `*.stories.tsx` | ~70–90 logic-bearing components | core effort |
| **T4 — Focused unit** | `vitest` | `themes` engine + algorithmic hooks + key utils | alongside T3 |
| ~~T5 — Visual~~ | deferred | `*.matrix.stories` | post design-system freeze |

### T3 — logic-bearing set (driven by `.spec.md`, ordered by logic density)

- **forms:** `pinInput` `combobox` `select` `multiSelect` `datePicker` `dateRangePicker` `slider` `numberInput` `tagsInput` `colorPicker` `stepper` `maskedInput` `wizard` `cronInput` `recurrenceEditor`
- **overlays:** `dialog` `drawer` `popover` `alertDialog` `bottomSheet` `actionSheet` `hoverCard`
- **nav:** `menu` `dropdownMenu` `commandPalette` `menubar` `navigationMenu` `contextMenu` `pagination`
- **interactive display:** `tabs` `accordion` `collapsible` `tree` `dataTable` `dataGrid` `carousel` `sortable` `swipeActions`
- **primitives:** mostly covered transitively via consumers; targeted tests for `focusScope` `dismissableLayer` `rovingFocusGroup` `presence`

### T4 — focused unit set (where E2E is awkward)

- **`themes/` engine (highest value — silent a11y break if wrong):** `Oklch` color math, `contrastRatio`, `clampChromaToGamut`, `generate`, `validate`. **Golden-master:** every curated `THEMES` entry must pass WCAG AA.
- **algorithmic hooks:** `useControlled` (controlled/uncontrolled invariant), `useTypeahead` (match algorithm), `useDisclosure`.
- **key utils:** `Equality` (`shallowEquals`/`byKey`), `polymorphic`, `composeRefs`, `composeEventHandlers`, `KeyboardExtensions`.
- **new since restructure:** `foundation/http` + `domain/color` — pure logic, unit-tier.
- Everything else (`cn`, presentational atoms, trivial utils) is covered transitively — no bespoke test.

## Folder / file conventions

- **Domain components — already 1-per-folder** (`CLAUDE.md`: *"One component per folder"*). Co-locate: `Button/Button.test.tsx`. Interaction tests live **inside** `Button.stories.tsx` as `play()` — no extra file.
- **`themes/`, `icons/`** — cohesive modules; keep as-is, tests co-locate flat (`themes/Oklch.test.ts`).
- **No central `__tests__/`.** `*.test.ts(x)` always co-located.

### D1 — flat `hooks/` + `utils/` → **decided: Option A (fold)**

- Fold every `hooks/` + `utils/` file to its own folder: `hooks/useControlled/{useControlled.ts, index.ts}` (+ `useControlled.test.ts` when tested). Folder `index.ts` re-exports; parent barrels (`src/{hooks,utils}/index.ts`) + `tsup` entries unchanged.
- Each moved file gains one `../` depth on every relative import — uniform transform.
- `themes/` stays a cohesive module (tests co-locate flat). `icons/` unchanged (already foldered-enough: 2 files + barrel).
- Executed in **Iteration 1**.

## Iterations & tasks

Each iteration = a shippable chunk. Fold precedes harness so no test file moves twice.

| It | Focus | Tasks (one-liner each) | Status |
|---|---|---|---|
| **1** | Fold foundation (D1) | `hooks/`+`utils/` → 1-per-folder (`useX/{useX.ts,index.ts}`) · rewrite intra-/cross-dir relative imports (+1 `../`) · parent barrels unchanged · `pnpm typecheck`+`lint`+`build` green | **done** (2026-06-27) |
| **2** | Harness + T1 smoke | install deps · `vitest.config.ts` (`unit`+`browser`+`storybook` projects) · wire `@storybook/addon-vitest` · eslint `*.test.*` override · scripts · run 227 stories smoke → fix throwers | **done** (2026-07-06) — 227 files / 578 story tests green in ~8s. Known quirk: first cold-cache run can emit transient `null useState` errors (vite dep-optimization race); re-run is clean. If it bites CI, pre-warm via `optimizeDeps` |
| **3** | T2 a11y | wire axe into story pass (`@storybook/addon-a11y` + vitest integration) · triage violations | **wired, report-only** (2026-07-06) — `a11y.test: 'todo'` in preview. Baseline: 260/720 stories violate. Profile: `aria-allowed-attr`+`aria-prohibited-attr` (systematic — aria props spread onto non-semantic wrappers) ≫ `color-contrast` (250) > `label` (209, mostly story fixtures) > `aria-required-parent` (289) > real long-tail (`aria-progressbar-name`, `aria-dialog-name`, `nested-interactive`, `button-name`). Burn-down = separate workstream; flip to `'error'` after. Axe adds ~3-25s to story runs |
| **4** | T4 units | `themes` golden-master (all `THEMES` pass AA) · `Oklch`/`contrastRatio`/`validate`/`generate` · `useControlled`/`useTypeahead`/`useDisclosure` · `Equality`/`polymorphic`/`composeRefs` | **~done** (2026-07-06) — 170 unit/browser tests: themes 80 (golden-master pins `smart-qr` as sole AA exception) + hooks/utils 90. Remaining: `http`, `domain/color`, `KeyboardExtensions` |
| **5** | T3 forms | `play()`: `pinInput` `combobox` `select` `multiSelect` `datePicker` `dateRangePicker` `slider` `numberInput` `tagsInput` `colorPicker` `stepper` `maskedInput` `wizard` `cronInput` `recurrenceEditor` | **done** (2026-07-06) — all 15 covered, ~59 interaction stories. Note: `forms/stepper` = wizard-step switcher (not numeric) |
| **6** | T3 overlays + nav | `play()`: `modal` (ex-dialog) `drawer` `popover` `alertModal` (ex-alertDialog) `bottomSheet` `actionSheet` `hoverCard` `menu` `dropdownMenu` `commandPalette` `menubar` `navigationMenu` `contextMenu` `pagination` | **done** (2026-07-06) — all 14 covered, ~61 interaction stories + scroll-lock audit (only `modal`/`alertModal` carry the mount-scoped-lock bug) |
| **7** | T3 display + primitives | `play()`: `tabs` `accordion` `collapsible` `tree` `carousel` `sortable` `swipeActions` · targeted `.test.tsx`: `focusScope` `dismissableLayer` `rovingFocusGroup` `presence` | **done** (2026-07-06) — 24 display interaction stories + 33 primitive browser tests. Deferred: `dataTable`/`dataGrid` (deep organisms — own pass later); `sortable` pointer-drag not synthesizable (native HTML5 DnD) — keyboard path covered |
| **8** | Docs + CI | update `CLAUDE.md` (drop "No tests", fix SB8→10, add commands) · add Actions job (`unit` always, `browser` on Playwright runner) | **done** (2026-07-06) — `CLAUDE.md` updated; `.github/workflows/test.yml` runs the full suite on main push as a non-blocking signal (separate from `release.yml`; retry-once for the cold-cache race) |

| **9** | T3 actions + feedback + layout | `play()`: actions (`button` `toggleButton(Group)` `segmentedControl` `speedDial` `fab` `copyButton` `disclosureButton` `backToTopButton` `optionTile(Group)` `toolbar`) · feedback (`toaster` `undoBar` `tour` `notificationCenter` `onboardingChecklist` `banner` `alert` `progressSteps` `meterBar`) · layout interactive (`resizablePanels` `scrollArea` `pullToRefresh` `appShell` `overlay` `controlGroup`; `navbar` = pure slots, smoke-only) | **done** (2026-07-10) — 78 interaction stories; suite 1278 green. Every presentation group now has interaction coverage |
| **10** | Test kit + config polish | local `src/testing/` helpers (8) · 4 exemplar migrations · `*.browser.test.ts` suffix convention (killed per-file vitest globs) · build-tsconfig/eslint wiring | **done** (2026-07-10) — 1278 green; consumer-facing `/testing` subpath deferred |

### It9 findings (2026-07-10)

- **`Toaster` exit-ghost leak (real bug, chip filed):** dismissed toast's `Presence` unmounts instantly (visible→exiting effect lag) — exit animation never plays, ghost leaks in `exiting` forever, viewport div never returns to empty state.
- **`UndoBar` pause leak (same chip):** hover→dismiss strands `paused=true`; reopened bar never auto-expires.
- Toaster queue model pinned: strict FIFO `slice(0,max)` window, queued toasts don't age, per-toast `duration` override, `Infinity` sticky, NO replace-by-id — empirically settles `targets.md` §10 decision 8.
- `MeterBar` emits unclamped `aria-valuenow` (value>max = invalid ARIA) · `ControlGroup` label↔control binding is visual-only · `AppShell` link-only drawer autofocus parks on the scope wrapper (Radix `removeLinks`) — design-pass items.
- Harness fact: vitest browser viewport = **414×896** → viewport-dependent components (AppShell) always render collapsed; stories pin breakpoints + matchMedia guards.
- Clipboard headless: `navigator.clipboard.writeText` rejects — stub per-story with restore-in-`finally`.

New layers since the original plan — `src/router` (20 src / 13 tests) · `src/query` (17/13) · `foundation/{storage,resilience}` · arrived WITH tests from a parallel lane (vitest globs extended accordingly); baseline before It9: 280 files / 1199 tests green.

Scripts (added It2): `test` `test:watch` `test:ui` `test:unit` `test:browser` `coverage`.

## Test kit — `src/testing/` (It10, 2026-07-10)

Local helpers (NOT exported from the package — consumer-facing `/testing` subpath deferred until the API settles). Each encodes a documented gotcha; imports only `'storybook/test'` so stories stay catalog-safe.

`portal(canvasElement)` · `expectVisible(el)` · `expectDismissed(query, {timeout?})` · `expectFocusReturns(el)` · `expectScrollLocked/Released(doc)` · `stubClipboard(mode?)` (restore-in-`finally`) · `dragPointer(el, {from,to,steps?})`

- **New tests use the kit; existing tests migrate on-touch only** (exemplars migrated: `Modal`, `Menu`, `Toaster`, `CopyButton`).
- No flow-level DSLs — helpers stay mechanical; play() bodies read as user flows.
- Suffix convention: DOM-dependent non-tsx tests are `*.browser.test.ts` (browser project picks them up globally); plain `*.test.ts` in logic layers = `unit`. No per-file vitest globs.

## First-pass findings (2026-07-06 — harness + exemplar wave)

Suite after wave: **237 files / 770 tests / ~8s warm** (`unit` ~220ms · `browser` ~650ms · `storybook` rest).

### Bugs / divergences found by the tests

- **`Modal` scroll-lock is mount-scoped, not open-scoped** (`Modal.tsx` ~163): `ScrollLockProvider` sits outside the `Presence` gate — body `overflow:hidden` applies on mount (even if never opened) and is never released on close. Fix: `<ScrollLockProvider isEnabled={ctx.open}>`.
- **`RovingFocusGroup` doesn't skip disabled items** — disabled tab can take the roving tab-stop while DOM focus can't follow (APG divergence; Menu implements its own skip correctly).
- **`smart-qr` theme fails AA on 11 pairs** — by design (verbatim app colors); pinned as golden-master exception in `registry.test.ts`.
- **Spec drift**: `PinInput.spec.md` says `mask`/`disabled`, code is `isMasked`/`isDisabled`; `Modal.spec.md` still titled "Dialog". Legacy specs — standardization pass will rewrite; code wins.

### Wave-2 findings (2026-07-06 — full T3 rollout, 7 parallel agents)

Suite after wave 2: **244 files / 990 tests / ~9-12s warm** (axe in `todo` mode adds runtime to story project).

Bugs found (assertions omitted where broken; sources untouched):

- **`BottomSheet` drops focus to `<body>` on dismissal** — inner `Presence` unmounts the focused panel before `FocusScope` teardown (Drawer/ActionSheet are correct: whole surface = one Presence subtree). Also: mount autofocus misses the `tabindex=0` handle.
- **`alertModal` inherits the Modal mount-scoped scroll-lock bug** (audit: `drawer`/`bottomSheet`/`actionSheet` clean, `popover`/`hoverCard` no lock).
- **`NavigationMenu` hover-swap races click** — `pointerenter` swaps the panel before click lands, so clicking another trigger always closes it (Radix guards with an opened-by-pointer flag).
- **`ContextMenu` never restores focus on close** (trigger is a non-focusable div; APG wants focus return).
- **`Menubar` lacks roving tabindex** — every trigger is a tab stop (APG: one).
- **`DropdownMenu` ArrowUp-open focuses first item** (APG: last).
- **`RovingFocusGroup` arrow nav gets STUCK at disabled items** (worse than "not skipped": tab-stop lands on unfocusable item, nav can't proceed). Pinned as known divergence.
- **`DismissableLayer` same-commit nesting inverts stack priority** (child effects run first → parent lands topmost). Sequential opens are correct.
- **`SwipeActions` fragment-counting** — `countNodes()` counts a JSX fragment as 1 → wrong snap width for fragment children.
- **`DateRangePicker` mid-selection publishes `null`** — half-picked display branch unreachable; trigger shows placeholder mid-selection.
- **`Tree`** lacks ArrowRight/Left expand/collapse (APG); **`CommandPalette`** empty state is `role="presentation"` (should announce); **`FocusScope`** JSDoc claims `trapped` defaults true (Radix default is false).
- **Spec drift is systemic** — prop renames unreflected (`withAlpha`→`hasAlpha`, `invalid`→`isInvalid`, `final`→`isFinal`, …); `sortable` has no spec. Standardization pass should treat specs as untrusted until rewritten.

### A11y burn-down — phase 1 (2026-07-06)

Baseline 260 → **114 failing story tests** (-56%) in error-mode measurement. Fixed:

- `HeatmapCalendar` cells → `role="img"`, dropped illegal `aria-value*` (~1120 hits — the biggest single source)
- `IconPicker` / `EmojiPicker` / `ScheduleView` — fake ARIA grid (`grid`>`gridcell` with no `row`/no 2D nav) → honest `role="group"` (~290 hits)
- Label sweep — 19 story files got labels/`aria-label`; `PinInput` cells now ship built-in `Digit N of L` labels (component fix)
- `CommentThread` replies → `role="group"`; `ChatBubble` status span → `role="img"`
- Token nudges (light): `--muted-foreground` `#71717a`→`#6d6d76` (4.39→4.66 on muted) · `--subtle-foreground` `#a1a1aa`→`#74747d` (2.56→4.63 on white) · `--info` `#0891b2`→`#0e7490` (3.68→5.36 both directions) · dark `--subtle-foreground` `#71717a`→`#82828b` (4.12→5.2)

Remaining 114 (backlog, granular):

- 17× subtle-foreground on muted bg (4.21) — those usages should switch to `muted-foreground` (component-level token swap)
- 16× unlabeled internal inputs in 4 components lacking labeling APIs: `GradientPicker` (per-stop inputs), `RecurrenceEditor` (interval/count/until), `ColorPicker` (panel hex field), `JSONEditor` (textarea + tree-edit input) — design-pass items
- 9× "children not allowed: table" + misc contrast tail (3.29×14, 2.x on soft-on-solid pairs e.g. `#b9e3c9` on success) — per-component decisions
- Axe only scans **light mode** (preview decorator defaults light) — dark-mode audit is a separate pass; dark `subtle` fixed by math above
- Flip `.storybook/preview.ts` `a11y.test` `'todo'`→`'error'` once the backlog clears

### Wave-3 (2026-07-06 late) — bug-fix pass + a11y burn-down phase 2

A11y: **114 → 72 failing** (total 260 → 72, −72%). Fixed: subtle→muted placeholder swaps in 5 pickers · labeling for `GradientPicker`/`RecurrenceEditor`/`ColorPicker`/`JSONEditor` internals · `dataGrid` grid-role moved onto the `<table>` (legal tree) · `combobox` dangling `aria-activedescendant` + empty/separator listbox children (+ `listbox` mirror) · `markdownEditor` preview pane → `group`.

Bugs FIXED from the wave-2 inventory (each with regression stories):
- `BottomSheet` — restructured to single-Presence subtree (Drawer pattern): focus restores on dismissal; handle gets mount autofocus
- `ContextMenu` — captures `activeElement` at pointerdown, bounded rAF-retry restore on close
- `DropdownMenu` — ArrowUp-open focuses last enabled item (APG)
- `RovingFocusGroup` — skips disabled items, tab-stop never parks on one (DOM-read disabled detection, 3-layer reassignment); `Menubar` adopted roving (single tab stop)
- `NavigationMenu` — opened-by-pointer one-shot guard: hover-then-click keeps the panel open
- `SwipeActions` — fragment children counted correctly (full snap width) · `Tree` — ArrowRight/Left APG nav · `CommandPalette` — empty state `role="status"` · `FocusScope` JSDoc corrected

Still open (deliberate): contrast design-tuning tail (~60: `Surface`/`Button.matrix` soft-variant combos, `success` soft-on-solid, `jsonEditor` tree colors) · `DateRangePicker` mid-selection `null` API shape · `DismissableLayer` same-commit nesting · dark-mode axe pass.

New findings from this wave:
- **`InputStyles.ts` `read-only:bg-muted` matches `<button>` triggers** (buttons are always CSS `:read-only`) — all picker triggers rendered on muted unintentionally; the placeholder swaps compensated. Fixed in the Vue package: the attribute-based `readonly:` variant (`index.css`) replaces `read-only:`, so triggers rest on the field surface and only a read-only control is muted.
- **`Presence` drops the child's own `ref` under React 19** — cloned ref replaces it (worked around via `panelRef` props in BottomSheet; latently affects `Drawer.Content` forwarded ref). Primitive fix = compose refs in `Presence`.
- `dataGrid` cell-editor inputs lack labels (2) · `dateRangePicker` calendar dialog unnamed (`aria-dialog-name`) · `multiSelect` chip-remove is `nested-interactive` — small backlog items.

### Harness learnings (what fits / limits)

- `play()` stories = the right primary tier — caught a real bug (scroll-lock) on the first wave; readable in SB UI; zero extra files.
- **Synthetic-event limit**: native browser default actions (e.g. `<input type=number>` ArrowUp stepping) don't fire from `storybook/test` userEvent — cover via UI affordances (stepper buttons) or skip; don't import `@vitest/browser/context` into stories (breaks the SB catalog).
- **Portals**: query overlays via `canvasElement.ownerDocument.body`; close assertions need `waitFor` (exit animations).
- **Cold-cache flake**: first run after dep changes can emit transient `null useState` errors (vite optimize race) — re-run clean; pre-warm `optimizeDeps` if CI hits it.
- **Path filters are substring matches** — `nav/menu` also runs `nav/menubar`; harmless, be precise when timing single files.
- vitest 4 quirk: bare `vi.fn()` not assignable to `Ref<T>` — use typed mocks.
- **Enter animations start at `opacity:0`** — never assert `toBeVisible` right after `findByRole`; wrap in `waitFor`. Same for transform reads: assert computed `matrix()` inside `waitFor`.
- **Native default actions don't fire from synthetic events** (range-slider arrows, number-input arrows, HTML5 drag) — cover the same code path via UI affordances or keyboard alternatives; report as gap otherwise.
- **Storybook-instrumented `userEvent` refuses `pointer-events:none` targets** — assert `toBeDisabled` instead of clicking disabled controls.
- In `.test.tsx` (browser project) import `userEvent` from `vitest/browser` (real CDP events; `@vitest/browser/context` is deprecated in 4.1). In stories, only `'storybook/test'`.

## Coverage philosophy

- **No line-% gate.** "Done" = T1 + T2 green across all stories + T3 on the logic-bearing set + T4 on `themes`/key foundation.
- `coverage` script (v8) available for visibility, never as a gate.

## Deferred

- **Visual regression.** A visual test *is* its baseline → can't be "kept up to date" passively; while tokens/APIs churn it is high-noise/low-signal. Bridge: `*.matrix.stories` already render every variant combo for manual eyeballing. Adopt when design system freezes — `Chromatic` (hosted, review UI, no git binaries) vs Playwright local snapshots (offline, baselines in git).
- **Apps** (`playground` / `showcase` / `theme-studio`) — dev tooling, not shipped.
