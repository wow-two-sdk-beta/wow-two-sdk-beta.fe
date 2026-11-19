# UI Implementation Targets — what we'll build

*Last updated: 2026-11-20*

> Companion: [`ideas.md`](./ideas.md) — universe of options.
>
> **Purpose**: per-vector verdict for `@wow-two-beta/ui`. This is the **roadmap** that mirrors `ideas.md`'s structure. When scope expansion is considered, walk this file first; if the desired vector is already covered, build to that target — if not, raise it for discussion and update this doc.
>
> **Phase reference**: [`docs/ui-beta-roadmap.md`](../../../../../../../docs/ui-beta-roadmap.md) (P1–P7). Current phase: P3 (base layer build-out).

---

## 0. Verdict legend

Vue exact-number scope (2026-09-12): **NOW** — SDK-owned immutable numeric values, explicit exact arithmetic,
lossless JSON parsing/encoding and an HTTP codec seam. `bignumber.js` and `lossless-json` are private engines.
Native operator overloading and universal exact transcendental arithmetic are **SKIP**; explicit precision
and rounding govern operations without finite decimal results. Existing Vue clients are not globally
migrated by this prototype. React remains parked.

| Code | Meaning |
|---|---|
| **DONE** | Already shipped (snapshot 2026-05-04) |
| **NOW** | Current phase — actively building (P3) |
| **NEXT** | Locked for next major phase (P6 refactor — i18n, virtualization, density, etc.) |
| **LATER** | Planned, no phase locked yet |
| **MAYBE** | Pending decision — flagged for triage |
| **SKIP** | Explicitly out of scope for `@wow-two-beta/ui` core (may land in companion package) |
| **LOCKED** | Decision sealed; do not re-litigate without strong reason |

**Companion-package candidates** (not in core):
- `@wow-two-beta/ui-charts` — charts
- `@wow-two-beta/ui-grid` — advanced data grid (if not wrapping TanStack Table)
- `@wow-two-beta/ui-editor` — rich text / code editor
- `@wow-two-beta/ui-calendar` — full event-scheduling calendar (separate from datepicker)

---

## 1. Locked architectural decisions

| # | Decision | Status |
|---|---|---|
| 1 | Hybrid school: headless engine + Tailwind/variants | LOCKED |
| 2 | React 19 + TypeScript strict | LOCKED |
| 3 | Tailwind v4 + CSS-first config (`@theme {}`) | LOCKED |
| 4 | Single package, subpath exports per domain | LOCKED |
| 5 | `pnpm` workspace; `tsup` ESM build; `tsc` DTS | LOCKED |
| 6 | Storybook 8 catalog | LOCKED |
| 7 | ESLint flat + `eslint-plugin-boundaries` (foundation/domain) | LOCKED |
| 8 | Foundation never imports domains | LOCKED |
| 9 | Domains may import any sibling domain (relaxed 2026-05-04) | LOCKED |
| 10 | One component per folder; spec-before-code | LOCKED |
| 11 | Beta-forever: no CHANGELOG, no PR gate, no required tests, push to main, fix-forward, CI auto-bumps `0.0.y` | LOCKED |
| 12 | **No SSR — pure CSR** | LOCKED |
| 13 | Theme vocabulary = shadcn-aligned (24 semantic tokens); raw scales preserved | LOCKED |
| 14 | Dark mode = `.dark` class on body/html; components never use `dark:` modifiers | LOCKED |
| 15 | Polymorphism: layout atoms use `as`; interactive atoms use `Slot`/`asChild` | LOCKED |
| 16 | Severity components ship in pairs: `*Simple` (L3) + slotted `*` (L4) | LOCKED |
| 17 | Inputs split by type, not one `Input` with `type` prop | LOCKED |
| 18 | Helper file naming: `*Extensions.ts` / `*Styles.ts` / `*Helpers.ts` | LOCKED |
| 19 | Layer model: L0 tokens · L1 utils/hooks/icons · L2 primitives · L3 atoms · L4 molecules · L5 organisms · L6 patterns · L7 domain | LOCKED |
| 20 | Atom rule: L3 never composes other atoms | LOCKED |

---

## 2. Cross-cutting vector verdicts

Mirrors `ideas.md` §4. One row per vector — concise verdict + path forward.

> **Live at-a-glance index → [`vector-registry.md`](../../vector-registry.md).** Modules shipped since several verdicts below were written: `foundation/http` · `auth` · `query` (+ optimistic mutation) · `feedback` bus · `forms-engine` · `router` · `foundation/storage`. Where a verdict here still reads NEXT/PARTIAL/SKIP for one of those (notably §2.16, §2.17, §3.6, §3.8), the shipped module supersedes it — the registry holds the current state.

### 2.1 Accessibility — NOW

| Sub-vector | Verdict |
|---|---|
| Roles / ARIA per APG | **NOW** — every component spec must cite the APG pattern; same-domain tests cite `aria-*` |
| Keyboard | **NOW** — APG-conformance per component (shipping) |
| Focus model (DOM vs activedescendant) | **NOW** — pick per component, document in spec |
| Focus management | **DONE** — `FocusScope` primitive shipped |
| Roving tabindex | **DONE** — `RovingFocusGroup` shipped; not yet used in `ToggleButtonGroup`/`CheckboxGroup`/`RadioGroup` (deferred to P6) |
| Screen reader | **NOW** — `VisuallyHidden` shipped; `Announce` primitive **NEXT** for Toaster batch 7 |
| RTL | **PARTIAL** — `DirectionProvider` shipped; per-component icon flip & logical CSS audit **NEXT** |
| Reduced motion | **NEXT** — library-wide `prefers-reduced-motion` enforcement (P6) |
| Reduced data | **MAYBE** — wait for clear use case |
| High contrast / forced-colors | **NEXT** — `@media (forced-colors: active)` audit (P6) |
| Color contrast | **NOW** — verify token combinations meet 4.5:1 / 3:1; doc in `theming.md` |
| Touch targets | **NOW** — 44×44 minimum on interactive atoms; component spec must cite |
| Skip links | **MAYBE** — primitive only; consumer wires up |
| Landmarks | **MAYBE** — consumer's app shell, not component-level |
| Announce primitive | **NEXT** — needed for Toaster batch 7 |
| Pointer types (coarse vs fine) | **NEXT** — hover-dependent UI gets click/long-press fallback (P6) |
| Drag a11y | **LATER** — couples with drag-drop verdict (§2.15) |
| Pause/stop/hide | **LATER** — applies to Carousel batch 7 |
| WCAG conformance | **LOCKED — 2.1 AA target**; 2.2 AA goal once focus-visible + drag-a11y land |
| `axe-core` CI | **NEXT** (P6) |

### 2.2 Internationalization — NEXT (major P6 work)

Currently **EVERY** component is en-US-locked. The largest single gap. Plan:

> **Foundation SHIPPED (2026-07-13)** — `foundation/i18n`: `LocaleProvider`/`useLocale` (messages dict or `(key,vars)=>string` callback + SDK-authored fallback per call), `useLocaleFormatters` (cached `Intl` number/currency/percent/date/time/`RelativeTimeFormat`/`ListFormat`/`PluralRules`), `FormattedRelative`. The **provider + formatter layer** below is now real; what remains is the per-component **string extraction** (~150–200 strings → `t(key, vars, fallback)` call sites + per-component `labels` overrides).

| Sub-vector | Verdict |
|---|---|
| **Translation provider** | **NEXT** — `<LocaleProvider locale messages={…}>` consumed via `useLocale()` hook; ships English defaults; consumer overrides via `messages` dictionary OR `(key, vars) => string` callback |
| **Per-component prop overrides** | **NEXT** — every component with embedded text gets a `labels` (or similar) prop for one-off override |
| **ICU MessageFormat** | **MAYBE** — provider accepts either dictionary OR formatter callback; consumer brings ICU lib if they want plurals (we don't ship our own) |
| **Pseudo-localization** | **LATER** — dev-mode toggle for catching unwrapped strings |
| **`Intl.NumberFormat` / `DateTimeFormat`** | **NEXT** — wrapped in `useLocaleFormatters()`; consumed by NumberField, CurrencyInput, DateField, Pagination ("Page X of Y") |
| **`Intl.RelativeTimeFormat`** | **NEXT** — wrap as `<FormattedRelative>` |
| **`Intl.ListFormat`** | **NEXT** — for "X, Y, and Z" displays |
| **`Intl.PluralRules`** | **NEXT** — pair with internal message templates (selection counts, etc.) |
| **`Intl.Collator`** | **NEXT** — default sort/filter comparators in Listbox/Combobox/Table use `Collator(locale, { sensitivity, numeric })` |
| **`Intl.Segmenter`** | **MAYBE** — for CJK truncation/character-count |
| **`Intl.DisplayNames`** | **MAYBE** — useful for country/currency pickers |
| **Calendar systems** | **NEXT** — DatePicker/Calendar accept `calendar` prop (Greg/Hijri/etc.) wired via `Intl.DateTimeFormat` |
| **Week start day** | **NEXT** — derive from `Intl.Locale.weekInfo` (with fallback table) |
| **Hour cycle (12h/24h)** | **NEXT** — derive from locale; manual override per TimePicker instance |
| **RTL flip** | **NEXT** — logical CSS props sweep + icon-flip convention (chevrons/arrows flip; checkmarks/brand don't) |
| **Mirrored animations** | **NEXT** — slide-in-from-start, not -from-left |
| **Font fallback (CJK/Arabic/etc.)** | **MAYBE** — token-level font-family stacks; consumer's responsibility for font hosting |
| **Tabular numerals** | **NEXT** — `font-variant-numeric: tabular-nums` for Tables, Stat, Pagination |

**Strategy**: see `ideas.md` §7 — ~150–200 strings need translation slots. Build the LocaleProvider in a single P6 sweep with a per-component prop override pattern.

### 2.3 Theming & tokens — DONE (extend NEXT)

| Sub-vector | Verdict |
|---|---|
| Token tiers (primitive → semantic) | **DONE** — 24 semantic + raw scales |
| Component-tier tokens (3rd layer) | **MAYBE** — only if shadcn vocabulary leaks; today not needed |
| Color: sRGB hex via Tailwind palette | **DONE** |
| OKLCH | **MAYBE** — Tailwind v4 supports; revisit when wide-gamut becomes a concern |
| Light/dark via `.dark` class | **DONE** |
| High-contrast mode | **NEXT** — see §2.1 |
| Multi-theme runtime (preview pane) | **MAYBE** — wait for need |
| Multi-brand build-time | **SKIP** — single brand for foreseeable |
| AI provider brand marks (Claude, Gemini, OpenAI…) | **DONE** (Vue, 2026-11-20) — `@wow-two-beta/fe/domain/aiBrands`: `AiBrandMark`, `resolveAiBrand` (model family, then provider), `aiModelLabel`; marks vendored from `@lobehub/icons-static-svg` (MIT) by `scripts/aiBrands/generate.mjs`; moves to `fe-ai` once that package publishes |
| Density modes (compact/comfortable/spacious) | **NEXT** — applies to Table, FormField, Card, Listbox, Menu (P6) |
| Per-component sizes (`xs`–`xl`) | **PARTIAL** — Button/Badge have sizes; standardize across L3/L4 (NEXT) |
| Z-index tokens | **NEXT** — replace `z-50` literals with `z-modal`/`z-popover`/`z-tooltip`/`z-toast` (P6 cleanup) |
| Token DevTools/introspection | **MAYBE** — Storybook addon? |
| Token contracts (TS types) | **DONE** — Tailwind classes typed by tailwind-merge |
| Standards (W3C DTCG / Style Dictionary) | **MAYBE** — only if we ever publish tokens for cross-platform |

### 2.4 Styling system — DONE

| Sub-vector | Verdict |
|---|---|
| Tailwind v4 + CSS-first | **LOCKED** |
| `tailwind-variants` for variants | **LOCKED** |
| `tailwind-merge` for conflict resolution | **LOCKED** |
| `clsx`-style joiner via `cn` util | **DONE** |
| Data-attribute hooks (`[data-state='open']`) | **DONE** — Radix-style |
| Slot styling pattern | **DONE** — slotted Alert/Banner/Toast |
| `sx` / `css` prop | **SKIP** — incompatible with Tailwind-first model |
| CSS Layers (`@layer`) | **DONE** — Tailwind v4 default |

### 2.5 Composition & API patterns — DONE

| Sub-vector | Verdict |
|---|---|
| Compound components | **LOCKED** — standard for stateful organisms |
| Render props | **MAYBE** — case-by-case |
| Hook-based APIs | **DONE** — `useDisclosure`, `useControlled`, `useClipboard`, etc. |
| Provider/context | **DONE** — `DirectionProvider`, `FormControlContext`, `ScrollLockProvider` |
| Slot pattern | **DONE** — Radix `@radix-ui/react-focus-scope` + own `Slot` primitive |
| Anatomy contracts in spec | **DONE** — every spec lists parts |

### 2.6 Polymorphism — DONE

| Sub-vector | Verdict |
|---|---|
| `as` for layout atoms | **LOCKED** |
| `asChild`/Slot for interactive | **LOCKED** |
| Type-safe forwarding | **DONE** — polymorphic types in `utils/` |

### 2.7 Forms — DONE (engine shipped 2026-07-11; extras deferred)

`/forms-engine` shipped: house contract + `house`/`tanstack` swappable adapters (one 94-case conformance suite), Standard Schema validation seam, full presentation-field wiring. Design: `docs/analysis/forms-engine.md`; maturation: `docs/analysis/forms-vector-next.md`.

| Sub-vector | Verdict |
|---|---|
| Field state primitives | **DONE** — `FormControlContext` wires id/disabled/required/invalid/describedBy + chrome registration |
| `Field` molecule | **DONE** — props-driven, adopts the glue provider inside `form.Field` (auto multi-error) |
| Controlled / uncontrolled | **DONE** — `useControlled` |
| **Form root** | **DONE** — `useAppForm` owns submit + field bag (`form.Field`/`Subscribe`/`array`); agnostic call, no `<Form>` wrapper |
| Validation engine | **DONE — agnostic via adapters** — swappable `house`/`tanstack`, app pins one in `src/form.ts`; RHF adapter design-checked, deferred |
| Schema lib adapter | **DONE** — Standard Schema v1 seam (types vendored); zod 4 default, valibot size-first swap — both pinned in conformance |
| Async validation | **DONE** — gated `isValidating`, submit awaits |
| Cross-field validation | **DONE** — schema `refine`/`forward` + `form.setValue` for derived writes |
| Field array | **DONE** — `form.array(path)` push/insert/remove/swap/move, row-scoped error reindex |
| Multi-step wizard | **DONE** — `Wizard` component + per-step schema-gate recipe |
| Dirty/touched tracking | **DONE** — baseline-compared (File-aware), touched = blur-or-submit |
| Submit verdict | **DONE** — `handleSubmit(): Promise<boolean>` + `isSubmitSuccessful` |
| Server-error application | **DONE** — `fieldErrors` (both .NET shapes) auto-applied; `submitError` + `clearSubmitError()` |
| File field in forms | **DONE** — FileUpload binds `File` into values; schema validates |
| Date/time value type | **DONE** — components speak `Temporal.PlainDate`/`PlainTime` via `temporal-polyfill` (swapped off the reference `@js-temporal/polyfill`) |
| Reset | **DONE** — `reset(next?)` re-seeds baseline |
| Conditional fields | **DONE** — schema `discriminatedUnion` (smart-qr content proven) |
| Auto-save | **DEFERRED** — recipe lands with W2-c storage v2 |
| Built-in validators | **SKIP** — schema owns it |
| Hidden input emit · FormData interop · ARIA wiring · `name` | **DONE** |

**Deferred architectural items** (analysis: `forms-deferred-items.md`): per-field union-internal errors · recursive deep-path value typing · configurable `fieldErrors` recognizer.

### 2.8 Motion — LATER

| Sub-vector | Verdict |
|---|---|
| Enter/exit transitions | **DONE** — `Presence` primitive |
| CSS keyframes/transitions | **DONE** — Tailwind animations |
| Layout animations (FLIP) | **NEXT** — concrete consumers: SortableList reflow · NotificationCenter / ToastStack item add+remove · TabIndicator slide · MasonryGrid auto-flow · DataGrid row reorder · KanbanBoard column shift. Approach: View Transitions API where supported + `useFlip` hook + `<AnimatedLayout>` primitive for older browsers. |
| Gestures | **LATER** — couples with drag-drop |
| Spring physics | **MAYBE** — only if Slider/Sheet need momentum |
| Stagger | **MAYBE** |
| Scroll-driven (`animation-timeline`) | **MAYBE** — modern only |
| **View Transitions API** | **MAYBE** — high-leverage for route transitions; revisit when needed |
| Page transitions | **SKIP** — consumer's router |
| `prefers-reduced-motion` | **NEXT** — library-wide enforcement (P6) |
| Motion tokens (durations, easings) | **NEXT** — adds to token system (P6) |
| Framer Motion / Motion lib dep | **SKIP** — CSS-only direction; revisit if real component needs |

### 2.9 Density / size — NEXT

| Sub-vector | Verdict |
|---|---|
| Per-component sizes (`xs`–`xl`) | **NEXT** — standardize across L3/L4 (P6) |
| Density modes (compact/comfortable/spacious) | **NEXT** — Table/Card/FormField first (P6) |
| Touch vs pointer auto-density | **MAYBE** |
| Nested density inheritance | **MAYBE** |

### 2.10 Performance — PARTIAL (NEXT for virtualization)

| Sub-vector | Verdict |
|---|---|
| Tree-shake (ESM `sideEffects: false`) | **DONE** |
| Subpath exports | **DONE** |
| Code splitting | **MAYBE** — consumer's choice |
| Lazy loading (`<img loading="lazy">`) | **DONE** |
| **Virtualization** | **NEXT** — Table batch 6, Listbox/Select large lists. Wrap `@tanstack/react-virtual` (recommended) or build minimal own. |
| Memoization | **NOW** — best-effort per component |
| Concurrent (`useTransition`/`useDeferredValue`) | **MAYBE** — case-by-case |
| RSC / streaming / hydration | **SKIP** — locked CSR |
| Bundle size CI gate (`size-limit`) | **NEXT** (P6) |
| Asset opt (SVG sprite, font subset) | **MAYBE** — icons via Lucide individually-imported |

### 2.11 Selection / search / sort — PARTIAL (canonize NEXT)

| Sub-vector | Verdict |
|---|---|
| Single / multi selection | **DONE** — Listbox/Select/MultiSelect/Combobox |
| Range select (Shift) | **MAYBE** — Listbox/Combobox don't have today |
| Cmd/Ctrl-toggle | **MAYBE** |
| Drag-select | **LATER** — Table |
| Select-all | **NEXT** — Table batch 6 |
| Search predicate (delegate) | **NEXT** — canonical `FilterPredicate` shape (§4) — Combobox/MultiSelect/Table consume |
| Search highlighting | **NEXT** — `Highlight` molecule consumed by Combobox |
| Search debounce | **LATER** — when async data lands |
| Sort key / direction | **NEXT** — Table batch 6 |
| Sort comparator (delegate) | **NEXT** — canonical `Comparator` shape; default uses `Intl.Collator` |
| Sort stability | **NEXT** — verify Tim sort guarantees |
| Filter operators (=, contains, starts-with, range) | **MAYBE** — depends on Table filter ambition |
| Filter combinators (AND/OR) | **MAYBE** |
| Server vs client | **MAYBE** — Table accepts `(query) => Promise<rows>` opt-in |

### 2.12 Delegate / extension API surface — NEXT (canonize in P6)

See §4 below for the canonized list — that's the verdict per delegate.

### 2.13 Browser API integration — see §3

### 2.14 Keyboard semantics — DONE

| Sub-vector | Verdict |
|---|---|
| APG-conformant per-component | **DONE** |
| Roving tabindex | **DONE** primitive · **NEXT** apply to ToggleButtonGroup/CheckboxGroup/RadioGroup (P6) |
| Active descendant | **DONE** — Listbox/Combobox |
| Type-ahead | **NEXT** — Listbox `useTypeahead` (P6) |
| Modifier handling (Cmd vs Ctrl) | **NEXT** — `KbdShortcut` does platform glyph swap; broader detection NEXT |
| Global shortcuts | **MAYBE** — CommandPalette in batch 7 needs |
| Layered shortcuts | **MAYBE** |
| `<kbd>` component | **DONE** — `KeyboardShortcut` molecule |
| User-customizable | **SKIP** |
| IME composition | **MAYBE** — verify text inputs guard `compositionstart`/`end` |
| Hold-key auto-repeat | **MAYBE** — for Slider PgUp/Dn? |

### 2.15 Drag & drop — LATER

| Sub-vector | Verdict |
|---|---|
| Within-list reorder | **LATER** — not yet in roadmap |
| Cross-list (Kanban) | **MAYBE** |
| External file drop | **NEXT** — FileUpload batch 7 |
| Touch / Pointer | **LATER** |
| Sensors (multi-input) | **LATER** |
| Accessible alternatives | **LATER** — required if drag ships |
| Live-region announce | **LATER** |
| Drag preview / drop indicators | **LATER** |
| Auto-scroll | **LATER** |
| **Library**: roll own vs wrap | **DECIDED 2026-07-10** — wrap `pragmatic-drag-and-drop` (dnd-kit stale; see `lib-adoption.md`) |

### 2.16 Async data states — PARTIAL (extend NEXT)

| Sub-vector | Verdict |
|---|---|
| EmptyState (L3 atom) | **DONE** |
| LoadingState | **NEXT** — molecule pair to EmptyState |
| SplashScreen | **DONE** (Vue, 2026-09-29) — first-load logo over a progress bar; page or overlay |
| ErrorState | **NEXT** — molecule with retry CTA |
| Skeleton | **DONE** |
| Optimistic update support | **MAYBE** — depends on data lib (TanStack Query, etc.) |
| Stale-while-revalidate UI | **MAYBE** |
| Offline banner | **MAYBE** — couples with Network Information API wrapper |
| Cancellation | **MAYBE** |

### 2.17 Notifications — NEXT (Toaster batch 7)

| Sub-vector | Verdict |
|---|---|
| Toast molecule (slotted) | **DONE** |
| **Toaster** (queue + position manager) | **NEXT** — batch 7 |
| Live-region announce | **NEXT** — `Announce` primitive (L2) needed for Toaster |
| Banner (page-wide) | **DONE** |
| Inline alert | **DONE** — Alert molecule |
| Action toast (Undo) | **NEXT** — Toaster includes |
| Promise toast (loading→success/error) | **NEXT** |
| Auto-dismiss + pause-on-hover | **NEXT** |
| 9-position support | **NEXT** |
| Sound / haptic | **MAYBE** |
| Push (service worker) | **SKIP** |
| Notifications API wrapper | **MAYBE** — could ship `useNotification` hook |

### 2.18 Z-index management — NEXT (P6 cleanup)

| Sub-vector | Verdict |
|---|---|
| Token scale (`z-modal`, `z-popover`, etc.) | **NEXT** — replace `z-50` literals (already flagged) |
| Stacking-context-aware portal manager | **MAYBE** — wait for nested-popover bug |

### 2.19 Portals / overlay system — DONE

| Sub-vector | Verdict |
|---|---|
| `Portal` primitive | **DONE** |
| `FocusScope` | **DONE** (Radix) |
| `DismissableLayer` | **DONE** |
| `AnchoredPositioner` (Floating UI) | **DONE** |
| `ScrollLockProvider` | **DONE** |
| Backdrop | **DONE** |
| Outside-click + Esc | **DONE** |
| Inert background | **MAYBE** — modern `inert` attribute audit |
| CSS Anchor Positioning (native) | **MAYBE** — replace Floating UI when stable across browsers |
| Floating UI `arrow()` middleware hookup | **NEXT** — current arrows are static (deferred to P6) |

### 2.20 Customization layers — DONE

| Sub-vector | Verdict |
|---|---|
| Token override (CSS vars) | **DONE** |
| Variant API (`tailwind-variants`) | **DONE** |
| className/style per-instance | **DONE** |
| Slot override | **DONE** — slotted Alert/Banner/Toast pattern |
| `as`/`asChild` | **DONE** |
| Provider scoping | **DONE** |
| CSS Layers | **DONE** |
| Recipe extension (consumer adds variants) | **MAYBE** — depends on `tailwind-variants` ergonomics |
| Component swap (DI registry) | **SKIP** — consumer wraps |

### 2.21 Telemetry / observability — LATER

| Sub-vector | Verdict |
|---|---|
| Standard interaction events (`onOpen`/`onClose`/`onSelect`) | **NEXT** — canonize naming so analytics ingestion is uniform |
| Render count dev tooling | **MAYBE** |
| `performance.mark` for open/close | **MAYBE** |
| dev-only `axe-core` integration | **NEXT** (P6) |
| Heatmap consent | **SKIP** — never auto-opt-in |

### 2.22 Error handling — LATER

| Sub-vector | Verdict |
|---|---|
| Error boundary primitive | **MAYBE** — ship `<ErrorBoundary>` w/ reset, or rely on consumer |
| Suspense pairing | **MAYBE** — when async lands |
| Form field error UI | **DONE** — FormField has `error` prop |

### 2.23 Print — SKIP

Single user request away from changing — for now, no print stylesheet ships.

### 2.24 Test surface — PARTIAL

| Sub-vector | Verdict |
|---|---|
| `data-testid` | **MAYBE** — Testing Library prefers roles; we expose `data-*` ARIA-derived |
| Refs forwarded | **DONE** |
| Imperative handles | **MAYBE** — case-by-case (e.g., `Toaster.show()`) |
| Storybook stories | **DONE** — minimum coverage; rich variant matrices deferred to P6 |
| Visual regression (Chromatic) | **MAYBE** — ROI vs cost |
| Interaction tests (Storybook play) | **LATER** |
| `axe-core` per story | **NEXT** (P6) |

### 2.25 SSR / hydration — SKIP (LOCKED)

CSR-only. Re-evaluate only if a real consumer demands.

---

## 3. Browser API wrapper plan

Mirrors `ideas.md` §8. Per-API verdict for inclusion as a hook/wrapper in `src/hooks/` or `src/primitives/`.

### 3.1 DOM observation — mostly DONE

| API | Verdict | Hook name |
|---|---|---|
| Intersection Observer | **NEXT** | `useInView` (lazy load, infinite scroll, sticky-on-pin) |
| Resize Observer | **DONE** | `useResizeObserver` |
| Mutation Observer | **MAYBE** | rare need |
| Performance Observer | **MAYBE** | telemetry vector — see §2.21 |
| Reporting Observer | **SKIP** | |

### 3.2 Visibility / Lifecycle

| API | Verdict | Hook |
|---|---|---|
| Page Visibility | **NEXT** | `usePageVisibility` (pause polling/animation) |
| Page Lifecycle | **MAYBE** | bfcache awareness |
| Visual Viewport | **NEXT** | `useVisualViewport` (mobile keyboard awareness) |

### 3.3 Pointer / Input

| API | Verdict | Hook |
|---|---|---|
| Pointer Events | **DONE** | direct usage in primitives |
| Touch Events | **SKIP** | Pointer Events superset |
| Mouse Events | **DONE** | direct usage |
| Keyboard Events | **DONE** | direct usage |
| Drag and Drop API | **LATER** | — see §2.15 |
| Pointer Lock | **SKIP** | |
| Gamepad | **SKIP** | |
| Keyboard Lock | **SKIP** | |
| Keyboard Map | **MAYBE** | |

### 3.4 Selection / Editing / Forms

| API | Verdict | Hook |
|---|---|---|
| Selection API | **MAYBE** | `useTextSelection` if Editable/Mention need |
| Range API | **MAYBE** | |
| EditContext | **SKIP** | RichTextEditor in companion package |
| Element Internals | **MAYBE** | only if we ship Web Components variants |
| Constraint Validation | **MAYBE** | depends on Form root verdict |

### 3.5 Clipboard

| API | Verdict | Hook |
|---|---|---|
| Clipboard API | **DONE** | `useClipboard` |

### 3.6 Storage

| API | Verdict | Hook |
|---|---|---|
| Web Storage | **DONE** | shipped in `foundation/storage` (`useLocalStorage`/`useSessionStorage`); v2 versioned-keys/migrations NEXT |
| IndexedDB | **SKIP** | data layer concern |
| Cache | **SKIP** | service worker |
| Cookie Store | **MAYBE** | |
| Storage / Buckets / Access | **SKIP** | |
| OPFS | **SKIP** | |

### 3.7 File / Filesystem

| API | Verdict | Hook |
|---|---|---|
| File API | **NEXT** | `useFile` for FileUpload batch 7 |
| FileReader | **NEXT** | `useFileReader` (image preview) |
| File System Access | **MAYBE** | save dialog for export — companion package? |
| File and Directory Entries | **NEXT** | folder drop in FileUpload |

### 3.8 Networking

| API | Verdict | Hook |
|---|---|---|
| Fetch | **SKIP** | data layer (consumer brings TanStack Query) |
| WebSocket / WebTransport / WebRTC | **SKIP** | |
| Server-Sent Events | **SKIP** | |
| Beacon | **MAYBE** | telemetry on unload |
| Push | **SKIP** | |
| Background Fetch | **SKIP** | |
| Network Information | **MAYBE** | `useOnlineStatus`; reduced-data UI |

> **Shipped:** `foundation/http` `createApiClient` — a **backend-contract** client (native-fetch transport, envelope unwrap, `ProblemDetails`→`ApiError`, bearer/cookie, 401 hook). The §9 generic-fetch-wrapper lock was revised in practice (2026-07-10) to permit exactly this; a general axios-style wrapper stays SKIP.

### 3.9 Communication / Channels

| API | Verdict | Hook |
|---|---|---|
| Notifications | **MAYBE** | `useNotification` |
| BroadcastChannel | **MAYBE** | cross-tab theme sync |
| MessageChannel | **SKIP** | |

### 3.10 Workers / Async / Scheduling

| API | Verdict | Hook |
|---|---|---|
| Web Workers | **SKIP** | |
| Service Worker | **SKIP** | |
| Worklets | **SKIP** | |
| Web Locks | **SKIP** | |
| `requestIdleCallback` | **MAYBE** | `useIdleCallback` for non-critical work |
| `postTask` (Scheduler) | **MAYBE** | |
| Background Sync (periodic) | **SKIP** | |

### 3.11 Media — Capture

| API | Verdict |
|---|---|
| getUserMedia | **SKIP** | media-app territory |
| MediaStream Recording | **SKIP** |
| Image Capture | **SKIP** |
| Screen Capture | **SKIP** |
| Audio Output Devices | **SKIP** |

### 3.12 Media — Playback

| API | Verdict |
|---|---|
| Media Source / Encrypted Media / Capabilities | **SKIP** |
| Media Session | **MAYBE** | if Audio/Video player components ship |
| Picture-in-Picture | **MAYBE** | Video player — companion |
| Document PiP | **MAYBE** | could enable floating toast |
| WebVTT | **MAYBE** | Video player captions |
| WebCodecs | **SKIP** |

### 3.13 Audio / Speech / MIDI

| API | Verdict |
|---|---|
| Web Audio | **SKIP** |
| Speech Synthesis | **MAYBE** | accessibility — read-aloud? |
| Speech Recognition | **MAYBE** | voice search input |
| Web MIDI | **SKIP** |

### 3.14 Graphics

| API | Verdict |
|---|---|
| Canvas 2D | **MAYBE** | SignaturePad needs |
| WebGL / WebGPU | **SKIP** | |
| WebXR | **SKIP** |
| ImageBitmap / OffscreenCanvas | **MAYBE** | image preview perf |

### 3.15 Animation / CSS

| API | Verdict |
|---|---|
| Web Animations API | **MAYBE** | layout animation primitives |
| **View Transitions** | **NEXT** | high-leverage; revisit when route-transition use case lands |
| CSS Animations / Transitions | **DONE** | Tailwind-driven |
| CSS Houdini Paint / Layout / Properties | **MAYBE** | typed CSS custom props is the most likely entry |
| **CSS Anchor Positioning** | **NEXT** | revisit Floating UI dep when this lands cross-browser |
| CSS Custom Highlight | **MAYBE** | search-highlight alternative |
| CSS Counter Styles | **MAYBE** | |
| CSSOM / CSS Typed OM | **MAYBE** | |
| Animation Worklet | **SKIP** |
| Local Font Access | **MAYBE** | font-family picker if ever needed |
| CSS Font Loading | **MAYBE** | `useFontLoaded` to avoid FOUC |

### 3.16 UI Surfaces

| API | Verdict |
|---|---|
| **Fullscreen** | **NEXT** | `useFullscreen` for Image gallery, Video |
| **Native Popover API (HTML)** | **NEXT** | revisit our Popover when browser support is universal — could simplify Portal+positioner stack |
| Window Controls Overlay | **SKIP** | PWA |
| Presentation API | **SKIP** |
| Web App Manifest | **SKIP** |

### 3.17 Sensors

All **SKIP** for core. (Specialty apps can wrap.)

### 3.18 Device State

| API | Verdict |
|---|---|
| Geolocation | **MAYBE** | address-autofill use case |
| Battery | **MAYBE** | reduce-motion / reduce-data heuristic? |
| Device Memory | **MAYBE** | reduced-rendering heuristic |
| Device Posture | **SKIP** |
| Screen Orientation | **MAYBE** | mobile rotation lock |
| **Wake Lock** | **MAYBE** | `useWakeLock` — Tour/Walkthrough or video |
| **Idle Detection** | **MAYBE** | auto-pause |
| **Vibration** | **MAYBE** | haptic on toast severity |
| Compute Pressure | **MAYBE** | quality scaling |
| User-Agent Client Hints | **MAYBE** | density auto-detect |

### 3.19 Hardware peripherals

All **SKIP** — specialty.

| API | Verdict |
|---|---|
| Barcode Detection | **MAYBE** | BarcodeScanner if requested |

### 3.20 Identity / Auth

| API | Verdict |
|---|---|
| Credential Management | **MAYBE** | autofill helper for password fields |
| WebAuthn | **MAYBE** | passkey button — companion? |
| FedCM | **SKIP** | |
| Digital Credentials | **SKIP** |
| Contact Picker | **MAYBE** | |

### 3.21 Crypto / Security

| API | Verdict |
|---|---|
| Web Crypto | **SKIP** |
| **HTML Sanitizer** | **NEXT** | use when rendering user-supplied HTML (Toast actions, Tooltip content, RichTextEditor consumer side) |
| **Permissions** | **NEXT** | `usePermission` — gate camera/mic/notification UI |
| Permissions Policy | **SKIP** |
| Trusted Types | **MAYBE** | XSS hardening |

### 3.22 Routing / URL

| API | Verdict |
|---|---|
| URL / URLSearchParams | **DONE** | direct usage |
| URL Pattern | **MAYBE** | command palette routing? |
| History | **SKIP** | via `/router` (SDK wraps react-router-dom as optional peer since 0.0.9x) |
| Navigation API | **SKIP** | |
| Location | **DONE** | direct usage |

### 3.23 Performance / Telemetry

All **MAYBE** — see §2.21 telemetry verdict.

### 3.24 Notifications / Sharing

| API | Verdict |
|---|---|
| Notifications | **MAYBE** | `useNotification` (see §2.17) |
| **Web Share** | **NEXT** | `<ShareButton>` molecule |
| Web Share Target | **SKIP** | PWA |
| Badging | **MAYBE** | |
| Content Index | **SKIP** | |
| Launch Handler | **SKIP** | |

### 3.25 Streams / Encoding

| API | Verdict |
|---|---|
| Streams | **MAYBE** | |
| Compression Streams | **MAYBE** | |
| Encoding (TextEncoder/Decoder) | **MAYBE** | |

### 3.26 Web Components

| API | Verdict |
|---|---|
| Custom Elements | **SKIP** | React-first |
| Shadow DOM | **MAYBE** | iframe-style isolation use cases |
| HTML Templates | **SKIP** | |
| Element Internals | **SKIP** | |

### 3.27 Devtools / Standards

| API | Verdict |
|---|---|
| Console | **DONE** | |
| WebDriver | **SKIP** | |
| **Eyedropper** | **NEXT** | ColorPicker enhancement (Chrome-only — graceful fallback) |
| Payment Request / Handler | **SKIP** | |

---

## 4. Delegate / extension API canonization — NEXT

Mirrors `ideas.md` §6. Verdict per delegate. Goal: every data-driven component (Listbox, Select, MultiSelect, Combobox, Table, Tree, Calendar, Carousel) consumes the canonical names below — consistent naming, no per-component reinvention.

### 4.1 Must — canonize in P6

| Delegate | Used by | Why must |
|---|---|---|
| `KeySelector` | Listbox, Select, MultiSelect, Combobox, Table, Tree, Carousel, Tabs | Stable React keys; selection by ID |
| `LabelSelector` | Select, MultiSelect, Combobox, Listbox, RadioGroup | Display label |
| `ValueSelector` | Select, MultiSelect | When value differs from key |
| `FilterPredicate` | Combobox, MultiSelect, Table | Search/filter (locale-aware default) |
| `Comparator` | Table, Listbox, Tree | Sort (default `Intl.Collator`) |
| `EqualityComparer` | Selection of object values | Selection match |
| `DisabledPredicate` | Listbox, Select, MultiSelect, Tree, Calendar | Disabled state per item |
| `ItemRenderer` | Listbox.Item, Combobox option, Table row, Carousel slide | Custom item display |
| `EmptyRenderer` | Listbox, Combobox, Table | Empty state w/ optional query echo |
| `ValueFormatter` | Stat, Table cell, NumberField display | Locale-aware display |
| `ValueParser` | NumberField, CurrencyInput, MaskedInput, DateField | Parse user input |

### 4.2 Should — when component lands

| Delegate | Used by | Status |
|---|---|---|
| `GroupSelector` / `GroupHeaderRenderer` | Listbox, Select, Combobox, Table grouping | NEXT batch 6 |
| `MultiComparator` | Table multi-column sort | NEXT batch 6 |
| `CellRenderer` / `HeaderRenderer` | Table | NEXT batch 6 |
| `LoadingRenderer` / `ErrorRenderer` | Combobox async, Table async | LATER |
| `DisabledDate` / `HighlightedDate` / `DateAvailability` | DatePicker/Calendar | NEXT P6 (booking patterns) |
| `Validator` (sync + async) | Form root | DECIDE-LATER (form root) |
| `CrossFieldValidator` | Form root | DECIDE-LATER |
| `Tokenizer` | TagsInput, Mention | NEXT batch 7 |
| `QueryNormalizer` | Search, Combobox | NEXT P6 |
| `HighlightFn` | Combobox highlight, Search results | NEXT P6 |
| `PageRequest` / `InfiniteRequest` | Table server, List virtual | LATER |
| `OnAction` | Toast undo | NEXT batch 7 (Toaster) |
| `AnnouncementFn` | Toaster, Table sort, drag-drop | NEXT P6 |

### 4.3 Maybe / Later

`HashFn`, `SectionRenderer`, `SelectablePredicate`, `VisiblePredicate`, `ContentMatcher`, `ColorParser`/`ColorFormatter`, `ScrollAnchor`, `DragSource`/`DropTarget`, `OverflowFallback` — case by case.

**Naming rule (LOCKED)**: nouns ending in `Selector` / `Predicate` / `Comparator` / `Renderer` / `Formatter` / `Parser` / `Validator` / `Fn`. No abbreviations. No per-component variants.

---

## 5. i18n strategy verdict — NEXT (P6)

Locked direction:

1. **`<LocaleProvider locale messages={…} formatters={…}>`** at root.
2. **`useLocale()`** hook returns `{ locale, t(key, vars), formatters: { number, date, relative, list, plural } }`.
3. **English defaults** ship in library; consumer overrides any subset.
4. **Per-component `labels` prop** for one-off override without touching provider.
5. **`Intl.*` consumed directly** — we never ship our own date/number formatters.
6. **`Intl.Collator`** is the default `Comparator` for object sorting (overridable).
7. **`Intl.NumberFormat`** is the default `ValueFormatter` for numeric values (overridable).
8. **Calendar systems** — DatePicker accepts `calendar` prop (Greg/Hijri/Buddhist/etc.) wired through `Intl.DateTimeFormat`.
9. **Week start** — derive from `Intl.Locale.weekInfo` with fallback table for older browsers.
10. **RTL** — logical CSS props sweep + icon-flip convention. Chevrons/arrows flip via CSS; brand marks/checkmarks don't.
11. **Plural / select / ordinal** — provider accepts ICU MessageFormat ONLY if consumer wires their own message formatter callback. We don't ship ICU lib.
12. **Pseudo-localization** — dev-mode toggle (`<LocaleProvider pseudo>`) for QA.

**Out of scope:**
- ICU MessageFormat parsing (consumer's choice — react-i18next, FormatJS, Lingui)
- Translation file format (TMX, XLIFF, PO) — consumer
- Translation Management System integration (Crowdin, Lokalise) — consumer
- RTL-specific font hosting — consumer

---

## 6. Theming roadmap

| Lock | Detail |
|---|---|
| Source of truth | `src/index.css` `@theme {}` block |
| Tier model | 2-tier: primitive (Tailwind palette + raw scales) → semantic (24 shadcn-aligned tokens) |
| Mode switch | `.dark` class on body/html |
| Density | **NEXT P6** — add density modes via `[data-density="compact|comfortable|spacious"]` attribute on root |
| High contrast | **NEXT P6** — `@media (forced-colors)` audit; outline fallbacks |
| Z-index tokens | **NEXT P6** — replace `z-50` with `z-popover`/`z-modal`/`z-toast`/`z-tooltip` |
| Motion tokens | **NEXT P6** — `--ease-standard`, `--ease-emphasized`, `--duration-fast`/`-normal`/`-slow` |
| OKLCH | **MAYBE** — wait for wide-gamut consumer demand |
| Multi-theme | **SKIP** for now |
| W3C DTCG export | **SKIP** for now |

---

## 7. Phase mapping (cross-ref to roadmap)

| Phase | Status | Vector cluster |
|---|---|---|
| **P1** Layering analysis | DONE | Architectural foundation |
| **P2** Shell setup | DONE | Build/lint/Storybook/CI |
| **P3** Base layer build-out | **NOW** | All atoms (49 ✓) + molecules (61 ✓) + organisms (18 ✓ → batches 5–7 next: disclosure/nav · data · specialized) |
| **P4** Haven audit | DEFERRED | Real-consumer gap analysis (after P3 complete) |
| **P5** External library audit | DONE | See [`library-references.md`](../../../../../../../docs/audits/library-references.md) |
| **P6** Refactor pass | **NEXT** | Density · i18n provider + Intl wrappers · z-index tokens · motion tokens · `prefers-reduced-motion` · roving focus apply · type-ahead · forced-colors · floating arrow positioning · Drawer drag-dismiss · 12h/AM-PM TimePicker · multi-month Calendar · year/month dropdown jumper · segmented DateField · ColorField RGB/HSL · format toggle · recent colors · eyedropper · stories rich variants · specs full anatomy · `axe-core` CI · bundle size CI |
| **P7** Haven migration | LATER | Real-app shake-out |

---

## 8. Companion package roadmap (out of core)

> *2026-07-10:* a third vehicle now exists besides core-and-companion: **subpath with optional peer** (`/router` wraps react-router-dom, `/query` wraps TanStack Query via `peerDependenciesMeta`) — the default for app-infra modules; companions below stay for heavy component packages. Module wave plan: `docs/analysis/frontend-modules.md`.

| Package | Scope | Trigger to start |
|---|---|---|
| `@wow-two-beta/ui-charts` | Recharts/Visx-based charts | When haven needs a dashboard |
| `@wow-two-beta/ui-grid` | Advanced data grid (TanStack Table wrap or own) | When haven needs spreadsheet-grade editing |
| `@wow-two-beta/ui-editor` | Rich text (TipTap?) + Code editor (CodeMirror?) | When a content app lands |
| `@wow-two-beta/ui-calendar` | Event scheduling calendar (full month/week/day views, drag events) | When a scheduling app lands |
| `@wow-two-beta/ui-maps` | Mapbox/MapLibre wrap | Probably never in core |

---

## 9. Out-of-scope explicit list

To avoid re-litigation:

- **SSR / RSC** — CSR-only. LOCKED.
- **CHANGELOG, semver, PR review** — beta-forever rules. LOCKED.
- **React Native** — web-only. LOCKED.
- **Tests required** — fix-forward. LOCKED.
- **Form root with built-in validation engine** — agnostic; consumer brings RHF/TanStack Form/Zod.
- **Print stylesheet** — until a consumer asks.
- **PWA APIs** — Service Worker, Push, Background Sync, Periodic Sync, Web App Manifest, Launch Handler, Window Controls Overlay.
- **Hardware peripherals** — Web Bluetooth, WebUSB, WebHID, Web NFC, Web Serial, Web MIDI.
- **Networking** — generic fetch wrappers, WebSocket, WebTransport, WebRTC stay out. *Revised 2026-07-10:* a **backend-contract client** (`foundation/http` `createApiClient` — wow-two envelope/ProblemDetails, swappable strategy) is IN — it's the client half of the backend SDK contract, not a generic wrapper.
- **Workers** — Web Workers, Shared Workers, Worklets, Web Locks.
- **Heavy media** — Web Audio, MediaSource Extensions, Encrypted Media, WebCodecs, MediaStream Recording.
- **Web Crypto** (consumer's crypto lib).
- **Sensors** (specialty).
- **Charts, advanced grid, rich text, scheduling calendar, maps** — all to companion packages.
- **Compute Pressure, Long Tasks API direct integration** — consumer's perf telemetry stack.

---

## 10. Decisions still pending — resolve before P6

Top items needing the user's call before P6 starts:

1. **Form root verdict** — ship `<Form>` lightweight (no validation engine) or stay fully agnostic? *Recommendation: agnostic for v1.*
2. **Drag & drop** — own primitive or wrap? *Updated 2026-07-10: wrap `pragmatic-drag-and-drop`* — dnd-kit core stale (last publish 2024-12, successor 0.5.x), pragmatic 2.x active/Apache-2.0. See `docs/analysis/lib-adoption.md`.
3. **Virtualization** — wrap `@tanstack/react-virtual` or own primitive? *Recommendation: wrap, as an INTERNAL dep (core components consume it), not an optional peer.*
4. **Animation lib dep** — stay CSS-only or adopt Framer Motion / Motion? *Recommendation: CSS-only; revisit if a real component genuinely needs spring.*
5. **i18n provider scope** — ship dictionary-only, or also a pluralization helper? *Recommendation: dictionary-only; consumer brings ICU.*
6. **`axe-core` CI** — ship the gate or stay manual? *Recommendation: ship the gate (low cost, high signal).*
7. **CSS Anchor Positioning migration** — track and switch off Floating UI when stable? *Recommendation: yes, track but don't migrate yet.*
8. **`Toaster` queue model** — *ANSWERED 2026-07-10 (pinned by interaction tests):* strict FIFO `slice(0,max)` window, queued toasts don't age, per-toast duration override, `Infinity` sticky; no replace-by-id API (add when a consumer needs it).
9. **Telemetry event naming** — canonize a uniform shape (`onOpen`/`onClose`/`onSelect`) so analytics ingestion is plug-and-play? *Recommendation: yes.*
10. **WCAG target** — 2.1 AA (current) vs 2.2 AA (focus + drag) commitment? *Recommendation: 2.2 AA goal once focus-visible audit + drag-a11y land.*

---

*End. When scope expansion is considered, walk this file first. If the desired vector is missing, raise it for triage and update this doc with a verdict.*
