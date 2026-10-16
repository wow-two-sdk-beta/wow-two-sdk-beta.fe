# wow-two-sdk-beta.fe — Backlog

*Last updated: 2026-10-16*

Every unbuilt item, grouped; top of each group = next. Shipped work lives in [`version-track/`](version-track/).

## Features

| Feature | State | Spec |
|---|---|---|
| Vue 3 package | shipped v0.1 | — |
| HTTP client | shipped v0.1 | — |
| Pagination contracts | shipped v0.1 | [pagination-model.md](../architecture/analysis/pagination-model.md) |
| Data queries and optimistic mutations | shipped v0.1 | — |
| Auth sessions | shipped v0.1 | — |
| Google identity (Vue) | shipped v0.1 | — |
| Routing | shipped v0.1 | — |
| Forms engine | shipped v0.1 | [forms-engine.md](../architecture/analysis/forms-engine.md) |
| Validators and validation messages | shipped v0.1 | — |
| Typed config | shipped v0.1 | — |
| Feedback bus | shipped v0.1 | — |
| Incident reporting (Vue) | shipped v0.1 | — |
| Analytics | shipped v0.1 | — |
| Feature flags | shipped v0.1 | — |
| Theming | shipped v0.1 | [theming.md](../architecture/theming.md) |
| Shell presets (Vue) | shipped v0.1 | — |
| Localization | shipped v0.1 | — |
| Formatters | shipped v0.1 | — |
| Exact numbers and lossless JSON (Vue) | shipped v0.1 | — |
| Results (Vue) | shipped v0.1 | — |
| Errors | shipped v0.1 | — |
| Logger | shipped v0.1 | — |
| Resilience | shipped v0.1 | — |
| Async primitives | shipped v0.1 | — |
| Storage and autosave | shipped v0.1 | — |
| IndexedDB | shipped v0.1 | — |
| Cross-tab sync | shipped v0.1 | — |
| Streaming network | shipped v0.1 | — |
| Workers | shipped v0.1 | — |
| Files | shipped v0.1 | — |
| Upload queue | shipped v0.1 | — |
| Clipboard | shipped v0.1 | — |
| Share | shipped v0.1 | — |
| Keyboard shortcuts | shipped v0.1 | — |
| Commands | shipped v0.1 | — |
| Undo history | shipped v0.1 | — |
| Collections | shipped v0.1 | — |
| Date and time | shipped v0.1 | — |
| Identifiers | shipped v0.1 | [guid-type.md](../architecture/analysis/guid-type.md) |
| Crypto | shipped v0.1 | — |
| Selection, sort and filter | shipped v0.1 | — |
| Virtualization | shipped v0.1 | — |
| Observers | shipped v0.1 | — |
| Gestures | shipped v0.1 | — |
| Animation and FLIP | shipped v0.1 | — |
| Device capabilities | shipped v0.1 | — |
| Screen control | shipped v0.1 | — |
| OS notifications | shipped v0.1 | — |
| Media capture | shipped v0.1 | — |
| Speech | shipped v0.1 | — |
| Geolocation | shipped v0.1 | — |
| Icons | shipped v0.1 | — |
| Headless primitives | shipped v0.1 | — |
| Hooks and utilities | shipped v0.1 | — |
| Color and emoji domain | shipped v0.1 | — |
| Action components | shipped v0.1 | — |
| Display components | shipped v0.1 | — |
| Feedback components | shipped v0.1 | — |
| Form components | shipped v0.1 | — |
| Image editing intent (Vue) | implemented; release verification pending | [Vector map](../architecture/analysis/image-editing-vector.md) |
| Layout components | shipped v0.1 | — |
| Navigation components | shipped v0.1 | — |
| Overlay components | shipped v0.1 | — |
| Global state module | planned | — |
| In-app devtools panel | planned | — |

## Vue

| Item | Type | Notes |
|---|---|---|
| Add focused tests to parts covered only by the render smoke | engineering | 223 SFCs lacked one at the 2026-09-28 scan; re-measure first |
| Sweep the remaining small convention breaches | engineering | `Avatar`'s 68 raw palette classes, 4 inline `defineProps<{…}>`; re-measure the rest |
| Ability to make the node editor read-only as a whole | feature | whole-control read-only API and Field adoption |
| Ability to set the calendar week start per locale | feature | — |
| Ability to edit exact numbers in data grid cells | feature | `ExactNumberInput` is the only lossless editing surface today |
| Ability to page or virtualize very large diffs | feature | the diff viewer is quadratic in time with eager DOM rendering |
| Accept `smart-qr` and custom-theme visuals during the ForeverPin migration | product | the SDK's visual acceptance happens in the product |
| Optimize the playground, sandboxes and theme apps | engineering | after the ForeverPin migration |

## Product-reported gaps

| Item | Type | Notes |
|---|---|---|
| Fix `useDrag` and `usePinch` capturing on press | fix | ListingShelf: taps on controls inside never click |
| Fix `@vue-ignore` props breaking `strictTemplates` | fix | ListingShelf, Haven (strict-template-friendly components) |
| Fix `SelectPicker` dropping `class` | fix | ListingShelf; `0.0.13` added `isFullWidth` and `width` |
| Fix `SliderInput` lacking `step` and emitting strings | fix | PbnStudio |
| Fix `Tooltip`'s ref owner under interaction | fix | TNIS on `0.0.7`; re-check at HEAD |
| Verify `Button` types `onClick` and fires `@press` | fix | Arcade, Hijinx on `0.0.7`; `onClick` typing landed in `0.0.8` |
| Split the package build per module | engineering | ForeverPin, Haven: shared chunks (385 kB) outweigh product code |
| Replace `lucide-vue-next` | engineering | Haven; the package depends on it too |
| Ability to follow the system colour scheme | feature | ListingShelf, Hijinx (theme-mode helper) |
| Ability to set page titles and map routes to typed props | feature | ListingShelf |
| Ability to update the query cache by key prefix | feature | ListingShelf |
| Ability to show a word-level diff | feature | ListingShelf |
| Ability to fit, select and size nodes in the node editor | feature | ListingShelf: zoom anchors at the corner; `CanvasArea` may take over |
| Ability to anchor a positioner to a point, not only an element | feature | TNIS: map-point anchors |
| Ability to render backend `AppError` codes and field errors | feature | backend SDK: parse `code` and `errors[]`, map per field, error boundary, label map |
| Ability to compose date and time inputs and constrained inputs | feature | ForeverPin: colour input over a pattern |
| Ability to display enum values with shared helpers | feature | ForeverPin |
| Ability to split the emoji catalog and virtualize its grid | feature | ForeverPin |
| Ability to pin-enter digits quickly | feature | Haven |
| Ability to connect a realtime hub client | feature | Haven |
| Ability to show maps through a Leaflet wrapper | feature | Haven: the map vector |
| Ability to translate UI text with an i18n core | feature | Hijinx |
| Ability to render share cards | feature | Hijinx |
| Ability to run countdowns with a progress ring | feature | Hijinx |
| Ability to manage pass-the-phone turns | feature | Hijinx |
| Ability to draw from seeded random, no-repeat decks and weighted picks | feature | Hijinx, Arcade (daily keys) |
| Ability to spin a wheel and roll dice or coins | feature | Hijinx |
| Ability to persist a ref over a fault-tolerant storage port | feature | Hijinx |
| Ability to host a Telegram Mini App | feature | Arcade; extract after a second Mini App |
| Ability to reach the `RelativeTime` tooltip by keyboard | feature | Wheelhouse; the absolute time shows on hover only |
| Fix `PageHeaderActions` hydration under server rendering | fix | Renders in place on the server, teleports on the client |
| Deprecate `useAppQuery`'s `loading` beside `isFirstLoad` | engineering | Wheelhouse; decide across every query hook |
| Ability to size `SectionHeading` at `text-base` | feature | Wheelhouse panel titles override `[&_h2]` |
| Ability to size `DescriptionGroup` labels | feature | Wheelhouse overrides `[&_dt]:text-xs` |
| Ability to lazy-load and contain `Avatar` images | feature | Wheelhouse product icons all load at page open |
| Prove `useFormDialogSession` against a template parent | engineering | Its test parent is a render function that writes boolean props last, so the props-settle bug may pass unseen |
| Ability to set `retry` per `useAppQuery` | feature | Wheelhouse: a failing vitals snapshot makes 3 requests |
| Ability to show `MeterBar` as unavailable for a null value | feature | Wheelhouse resource meters |
| Fix `StatCard` optional props rejecting `undefined` | fix | Breaks under `exactOptionalPropertyTypes` |
| Fix `SelectPickerValue` showing the raw key without `get-option-label` | fix | Wheelhouse filters showed "all" and "day" |
| Fix `PageHeader` actions not wrapping on narrow screens | fix | `shrink-0` and no `flex-wrap` |

## Vectors

| Item | Type | Notes |
|---|---|---|
| Adopt the commands registry in both command palettes | engineering | each palette keeps its own item registry today |
| Audit every module against swappable-modules, then retrofit | engineering | `conventions/development/swappable-modules.md`; per-module verdict first; covers the `QueryKey` alias, typed native escape hatch and router contract |
| Decide Temporal or `Date` before date components adopt `foundation/datetime` | engineering | date components and inbound HTTP data are Temporal-based |
| Agree exact decimal and int64 wire forms per endpoint with the backend SDK | engineering | no global SDK coercion policy |
| Ability to show per-leaf errors on union form fields | feature | when a second product wants inline union errors; a `forms.md` userland pattern first |
| Ability to validate a form field asynchronously with debounce | feature | when a second product needs a debounced uniqueness check |
| Ability to show advisory form warnings that never block submit | feature | when a product needs advisory validation |
| Ability to inspect form state in devtools | feature | on recurring form-debugging pain or a consumer request |
| Recognize duck-typed field errors by default | engineering | only when `foundation/http/FieldErrors.ts` opens for another reason |
| Ability to open one in-app devtools panel | feature | when a consumer wants one; query, router, flags, locale and theme in one shell |

## Docs

| Item | Type | Notes |
|---|---|---|
| Sync the root `THEMES.md` with the Vue `field` token | engineering | The Vue contract has 40 tokens; the React doc says 39 |
| Delete the stale `enum-alignment` decision record | engineering | first confirm its 16-enum registry lives in the wow-two-ws `enums.md` convention |

## React package

React implementation and release are parked; pull from here only when React resumes.

| Item | Type | Notes |
|---|---|---|
| Apply the frontend conventions sweep to the React package | engineering | `forwardRef` retirement, spec coverage, `Result` carrier and the Vue sweep's other rows |
| Extract hardcoded component strings onto the locale provider | feature | ~150–200 strings to `t(key, vars, fallback)` and per-component labels |
| Tune the soft-variant contrast tail, then fail stories on axe violations | engineering | ~60 combos wait on a design session; a dark-mode axe pass precedes the `'error'` flip |
| Ability to switch density modes | feature | Vue ships `data-density` |
| Ability to select rows, select all and virtualize the data table | feature | the table batch-6 set; sorting ships |
| Move the data table's sorting onto `foundation/selection` | engineering | nullish order, sort shape, accessor fallback and `Listbox` equality diverge today |
| Add the draft-autosave form recipe on storage v2 | feature | storage v2 shipped; the recipe story is still deferred |
| Fix `requireAuth` returnTo doubling the router basename | fix | basename apps only |
| Fix the command palette closing on its opening click | fix | MuseumsGallery guards it in the app |
| Fix the `element.ref` React 19 warning inside `Modal` | fix | MuseumsGallery |
| Ability to give `ToggleButtonGroup` items their own values | feature | MuseumsGallery |
