# Full Vue SDK sweep implementation

*Last updated: 2026-09-26*

## Outcome and scope

The full Vue SDK received a capability-wide source review, targeted rewrites and regression coverage.
The pass extends beyond ForeverPin. Reusable controls belong to the SDK; QR rendering remains product-owned.
React remains parked. The corrected Vue candidate precedes ForeverPin migration; broad playground,
sandbox and theme-app optimization follows migration. Existing gallery fixtures were updated only to
exercise new capabilities or compile changed contracts.

Baseline: `f4fe5c6477bc83a344e8c10cc4d6467dabf176b8` plus the earlier staged readiness work.
The local manifest remains `0.0.6`; this candidate has not been published. CI owns its release version bump.

## Changes

| Area | Delivered behavior |
|---|---|
| Auth, HTTP, query, router | Explicit shared RequestScope, origin-aware unauthorized handling, disposed-owner cleanup, stale mutation/persistence isolation, abortable token waits, detailed success metadata, route focus after DOM updates. |
| Google identity | One ancestor owns initialization and credentials; multiple buttons share it without replacing callbacks. |
| Exact values | ExactNumberInput, exact validator bounds, lossless diagnostic operands, cached exact currency/percent formatting, strict lossless config/hash/download boundaries. |
| Forms | Current-snapshot validation, canonical nested row identities, typed union views, read-only and native form ownership, bounded time options, independent color axes, draft ownership in editable grids. |
| Controls and overlays | Capture-phase inactive action guards, canceled drag safety, document/lease-owned focus and theme state, RTL/live menu navigation, keyboard context menus, editable-code escape, bounded pagination rendering. |
| Display | Display-zone calendar projection, exclusive end boundaries, continued/overlapping events, exact table ordering and custom comparators, linear-memory line diff, stable steppers and pane sizing. |
| Media and feedback | Actual playback state, safe source replacement, caption ownership, focus-visible video controls, independent hover/focus pause timers, observable promise settlement. |
| Browser foundations | Attempt-owned uploads, callback isolation, stale observer/worker suppression, reactive disposal, stable-key measurements, permission/wake-lock lifecycle cleanup. |
| Native types | Packed Vue templates retain native input attributes/events, precise field slots, union-array branches, custom exact-input failure events and generic table rows. |
| Localization/style | Reactive component defaults, complete localized count messages, source message catalogue, one class-merge owner, native icon class precedence, ancestor dark-theme selectors. |
| Delivery | Positive/negative packed Vue templates, JS consumer bundle budgets, Firefox/WebKit CI matrix, release-helper regression verification. |

Public changes and migration recipes are in [MIGRATION.md](../../../codebase/wow-two-sdk-beta-fe/MIGRATION.md).
The [message catalogue](component-messages.md) records statically discoverable defaults.
The [original audit](deeper-audit.md) remains historical evidence; its defect descriptions are not current status.

## Coverage and proof boundaries

The inventory contains 47 foundation capability directories, seven presentation families, 408 SFCs and
58 checked capability graph nodes. Breadth came from source inventory/pattern review, all-family
DOM/SSR/contract suites and public export checks. Depth came from targeted reproductions and behavioral
regressions in stateful owners. This does not claim every possible interaction or generated data row
received an independent manual audit.

| Lane | Detailed source review and focused evidence |
|---|---|
| Pure foundations, validators, exact values, config/flags, domain, analytics | [Foundation report](full-sweep-foundations.md) |
| Auth/HTTP/query/router/OAuth, 22 browser capabilities, DOM/primitives | [Runtime report](full-sweep-runtime.md) |
| Forms/engines, navigation, overlays, native typing | [Controls report](full-sweep-controls.md) |
| Remaining action/display/layout/feedback families | [Presentation report](full-sweep-presentation.md) |
| Parent integration | Calendar/table/diff/waveform, Primitive/Slot, scroll lock, Presence, icons/themes/styles, localization and package gates |

New important regressions include randomized exact line-diff reconstruction, a 20,000-line near-equal
case, midnight/display-zone/DST calendar cases, disabled slotted native activation, form reset/ownership,
stale schema results and one real SDK composition spanning auth → HTTP → query → form → guarded route.
Native browser APIs using devices, permissions and OAuth were verified with controlled mocks; no live
credential exchange or device-permission proof is claimed.

## Combined verification

Final gate results below ran after all source lanes settled. Commands operate from
`engineering/codebase/wow-two-sdk-beta-fe` unless otherwise stated.

| Gate | Result |
|---|---|
| Typecheck, source graph, SFC compilation | Passed: 58 capabilities, no cycles/unresolved references/casing mismatches; 408 SFCs |
| ESLint and formatting | Passed; no ESLint warnings |
| Unit / DOM / SSR | 156 files / 2,025 tests passed |
| Chromium / forced colors / WebKit | 12 browser files / 57 tests passed |
| Firefox on this Mac | Browser runtime launch blocked; see below |
| Library build and theme generation | Build passes; all 183 themes pass declared contrast pairs |
| Playground build/smoke | Passed; all seven gallery groups, no warnings or unexpected errors |
| Packed exports/types/templates/CSS/budgets | Passed: 72 exports, 64 core / 68 total JS entries; linked and fresh npm tarball consumers |
| Release version helper | Three tests passed |

Executed commands: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
`pnpm exec vitest run --project unit --project dom --project ssr`,
`pnpm exec vitest run --project chromium --project chromium-forced-colors --project webkit`,
`pnpm build`, `pnpm --filter playground build`, `node apps/playground/tests/gallery-smoke.mjs`,
`pnpm check:package --install --output /private/tmp/ui-vue-full-sweep-20260925.tgz`, and the
repository-root `node --test .github/scripts/vue-release-version.test.mjs`.

The clean tarball consumer ran without workspace dependency links. Its positive and negative Vue
fixtures verify actual packed declarations, native listeners, typed fields/union arrays, ExactNumber
models, exact-input custom events and table slots. Expected negative compiler diagnostics were required.
Verified archive: `/private/tmp/ui-vue-full-sweep-20260925.tgz` (unreleased source with local version `0.0.6`).
Integrity: `sha512-g5hl+DKhogDSs3JRYYEMAXapwXVr+NOT2VbImt0GutD+a3wbH4WRQu+mbhsfHNGy/Drrrcze8R6G6NtJbjeuWw==`.
The gallery updated its expected selector contract for ancestor dark themes; its intentional broken-image
fixture is the only expected resource failure. Its existing large-chunk build warning belongs to the
later demo-app optimization pass, not a failed SDK build.

The Firefox failure occurs before SDK tests: Playwright launch logs
`sandbox_extension_issue_file_to_process ... Operation not permitted`, followed by a compositor failure
and launch timeout. It reproduced under native escalation. Firefox is installed; browser sandbox and OS
permissions were not weakened. Linux CI installs/runs Firefox alongside Chromium and WebKit; its next
hosted result remains required. WebKit on macOS uses Option-Tab in the test helper to respect platform
keyboard-navigation behavior; the host preference was not modified.
Reference: [Playwright issue 41808](https://github.com/microsoft/playwright/issues/41808).

## Measured consumer size

The baseline and current experiment bundle one public import with Vite/esbuild, Vue external, all other
runtime dependencies included, JavaScript only. CSS and host app code are excluded.

- Baseline: [consumer-bundle-measurements.json](consumer-bundle-measurements.json).
- Current: [consumer-bundle-after.json](consumer-bundle-after.json).
- Reproduction: `node engineering/architecture/analysis/vue-sdk-optimization/consumer-bundle-probe.mjs` from SDK root.
- Packed release checks enforce gzip ceilings: Button 24,000; Text 18,000; Card 19,500; HTTP 4,500;
  ExactNumber 12,500 bytes. These guard accidental regressions, not product data limits.


| Consumer | Before gzip bytes | After gzip bytes | Change |
|---|---:|---:|---:|
| button | 27,340 | 19,920 | -27.1% |
| text | 22,746 | 15,089 | -33.7% |
| card | 23,622 | 15,975 | -32.4% |
| http | 2,907 | 3,589 | +23.5% |
| numbers | 10,992 | 10,992 | +0.0% |

HTTP growth includes cancellation/session ownership and detailed metadata; it remains within its declared budget.

## Remaining boundaries and release handoff

- The calendar retains a 24-hour wall-clock grid. Repeated-hour folds use elapsed block duration when
  the displayed end clock reverses; labels/values preserve actual instants. It is not an elapsed-time axis.
- DiffViewer uses linear working memory but worst-case quadratic time and eager DOM rendering. Very
  large documents still require paging or a dedicated virtual diff view.
- NumberInput and native numeric grid cells remain explicitly JavaScript-number controls. ExactNumberInput
  is the dedicated lossless editing surface. A future exact grid editor is an additional capability.
- Custom theme surfaces and ForeverPin `smart-qr` still need product visual acceptance during migration.
- Source and release-check batches are committed locally. Publishing remains developer-owned;
  no package or Git ref was pushed.

Unrelated React changes, including AlertModal and Ocharo adoption work, appeared in the shared checkout.
They remain outside this Vue sweep and its staging selection.

The verified sweep covers 445 SDK paths, including the earlier readiness/analysis batch; whitespace checks pass.
Commit batches separate foundations, form controls, presentation, release checks and analysis/migration docs.
The workspace session-context update remains separate from the SDK index.
