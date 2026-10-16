# Vue SDK deeper audit

*Last updated: 2026-09-29*

> Historical characterization baseline. Implementation and final verification are tracked in
> [full-sweep-implementation.md](full-sweep-implementation.md); defect descriptions below preserve the original evidence.

## Verdict

Prioritize lifecycle and interaction correctness before reviewing component appearance. The current package
builds, but targeted compositions expose failures that existing isolated tests do not cover. The earlier
readiness inventory establishes component availability, specifications and fixtures; it does not establish
behavioral completeness.

Open improvements live in the [backlog](../../../planning/backlog.md).
This report supplies evidence and acceptance criteria, not a new approval queue.
The SDK owns reusable controls; ForeverPin owns QR rendering. React and the later playground/sandbox/theme-app
sweep remain outside this pass. Automated consumer fixtures described below belong to SDK verification.

## Baseline and evidence boundaries

- Source baseline: `f4fe5c6477bc83a344e8c10cc4d6467dabf176b8` plus the existing 31 staged readiness files.
- Local Vue manifest: `0.0.6`. Registry and CI were not rechecked during this analysis.
- Fresh `pnpm build` passed: 1,594 modules, declarations and 183 theme contrast checks.
- Eight state/integration characterization probes reproduced the reported outcomes using installed Vue,
  Vue Router and TanStack packages with controlled asynchronous delegates.
- Nineteen presentation characterization probes reproduced the reported outcomes: 18 happy-dom probes,
  plus one VM-timeout probe of the actual time-option loop. Some portal panels were stubbed open.
- Transport/numeric probes bundled current TypeScript through installed esbuild and executed on Node 20.10.0.
- Characterization probes assert the current faulty outcomes. Their passing status is evidence of the defects,
  not acceptance of the implementation. Convert them to expected-correct regression tests during each fix.
- The complete suite, packed install and live OAuth were not rerun. DOM results are not real-browser layout,
  assistive-technology, cross-browser or product visual certification.
- Audit source work was read-only. This turn changes analysis/planning artifacts only.

## A. Session and asynchronous ownership

### A01 — Old-session HTTP failures can clear a newer login

**Confirmed defect; fix before migration.**

Start a request while Alice is authenticated, replace the authenticated user with Bob, then return Alice's
`401`. With the supported `onUnauthorized: bridge.onUnauthorized` composition, Bob becomes anonymous.
The HTTP callback carries no originating session revision, and the provider invalidates whichever session
is currently active.

Sources: [CreateApiClient.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/http/CreateApiClient.ts)
line 239; [AuthProvider.vue](../../../codebase/wow-two-sdk-beta-fe/src/auth/providers/AuthProvider.vue)
lines 151–157.

Introduce explicit session identity/revision captured at request start. Compare it before handling unauthorized
results. Keep HTTP independent through a request-context seam or session-bound client, rather than importing
auth into foundation. Verify old-session failures cannot clear the new user/token; current-session failures
still clear them; concurrent failures do not duplicate logout side effects.

### A02 — Session disposal needs to own query reconciliation and bridge detachment

**Reproduced capability gap; not a broken promise of TanStack `clear()`.**

Clear the query client and unmount its provider while a mutation waits. Its later `onConfirmed` callback
still writes Alice's private result back into the cleared cache. Separately, unmounting AuthProvider leaves
its bridge's last authenticated snapshot readable.

Sources: [UseAppMutation.ts](../../../codebase/wow-two-sdk-beta-fe/src/query/adapters/tanstack/hooks/UseAppMutation.ts)
lines 63–66; [AuthProvider.vue](../../../codebase/wow-two-sdk-beta-fe/src/auth/providers/AuthProvider.vue)
lines 142–145.

Define one explicit session lifetime across HTTP, auth, query and persistence. A new QueryClient per identity
is a valid isolation strategy; epoch-aware reconciliation is another. Encode the selected composition in
the SDK and its consumer recipe. Ordinary component unmount need not cancel valid background reconciliation;
session disposal must suppress obsolete writes, optimistic rollback, invalidation and persistence.
Bridge detach must use ownership tokens so an old provider cannot detach its replacement.

### A03 — Google Identity requires one page-level owner

**Confirmed integration defect against the documented provider model.**

Mount sign-in instances A and B, then unmount B. Google's active callback still belongs to B, whose disposed
guard drops the token; surviving A never receives it. While both mount, the last initialization owns credentials.

Source: [GoogleIdentity.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/oauth/GoogleIdentity.ts)
lines 232–239, 257–260. Google's [JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
documents replacement of page-wide configuration by repeated initialization. The probe models that behavior;
it does not perform live Google authentication.

Use one app-level identity owner and credential sink. Buttons and One Tap attach rendering to that owner.
Test concurrent buttons, either button disposing, owner replacement, obsolete callbacks and conflicting client IDs.

### A04 — TanStack whole-form validation can approve stale input

**Confirmed contract defect; house adapter already rejects this race.**

Start async `form.validate()` with valid values, edit them to invalid values, then release the original
successful validator. TanStack returns `true` while the live form is invalid. Scoped validation compares
snapshots, but whole-form validation does not.

Source: [UseAppForm.ts](../../../codebase/wow-two-sdk-beta-fe/src/formsEngine/adapters/tanstack/UseAppForm.ts)
lines 526–533; [AppForm.spec.md](../../../codebase/wow-two-sdk-beta-fe/src/formsEngine/AppForm.spec.md)
line 13 promises false after edits.

Unify stale-validation handling across both adapters. Test edits, reset, disposal, session invalidation,
unchanged valid values and prevention of obsolete error overwrites.

### A05 — Field-array identity is local to each binding

**Reproduced composition limit; current source documents local ownership.**

Two `useFieldArray(form, 'rules')` bindings start with identical keys. Swapping through the first reorders
shared values and only its keys. The second view attaches existing child state to different logical rows.
Same-length external replacement/reset similarly needs an explicit identity policy.

Source: [UseFieldArray.ts](../../../codebase/wow-two-sdk-beta-fe/src/formsEngine/UseFieldArray.ts)
lines 185–210.

Centralize structural row identity per form/path, or expose one canonical binding with derived views.
Support a stable product row-ID accessor where appropriate. Test two views, all structural operations and
same-length reset/replacement. The new `variant(guard).matches(index)` reads live values correctly;
this audit did not demonstrate an additional discriminator-guard defect.

## B. HTTP, validators and exact values

| ID | Classification and evidence | Recommended correction and acceptance |
|---|---|---|
| A06 | Confirmed: inherited keys corrupt object validation and message lookup. Missing optional `toString` rejects; inherited required fields pass; `constructor` can resolve to a function/object despite string contracts. | Own-property lookup for schema data, aliases, catalogues and labels; safe dictionaries and output validation. Test `constructor`, `toString`, `__proto__`, inherited required fields and missing optional fields. |
| A07 | Confirmed: `array(string()).default([])` reuses the same array across independent parses. Mutating one result changes another. | Explicit factory defaults for mutable values; preserve scalar defaults. Test independent nested defaults and inferred types. Avoid blind structured cloning of exact values. |
| A08 | Confirmed: lossless HTTP problem parameters become ExactNumber; numeric message operands accept only number/string, causing raw-server-text fallback. | Accept exact operands through lossless formatting. Test HTTP problem → fieldIssues → localized message for integer, Int64 and decimal parameters. |
| A09 | Confirmed: lossless client receives HTML `503` and returns protocol failure after one request; native client retries and recovers on the second request. Diagnostic decoding overrides primary HTTP classification. | Preserve HTTP status/retry semantics when unsuccessful-response diagnostics cannot decode. Test HTML gateways, empty/malformed error bodies and unauthorized handling. Malformed successful JSON remains a protocol failure. |
| A10 | Confirmed: abort during an unresolved `getAuthToken()` leaves the request pending until the token promise settles. | Race authentication with cancellation; dispose listeners; never fetch after cancellation. Test timeout/abort before and during token resolution and completion races. |
| A20 | API gap: JSON/text/blob/arrayBuffer success discards headers/status. Download filenames, ETags and Location cannot reach callers. | Add a detailed response/metadata seam at the integration edge; keep ordinary value consumption ergonomic. Test all response modes and headers isolation. |
| A24 | API gap: exact decimal formatting exists, but currency/percent formatting still requires native `number`. | Complete exact money/ratio display with explicit rounding, locale sign/symbol placement and numbering systems. Do not silently convert through binary64. |

Sources:

- A06: [Composites.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/validators/Composites.ts)
  lines 130, 137; [FieldErrors.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/http/FieldErrors.ts)
  lines 29, 38; [Messages.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/validators/Messages.ts)
  lines 296–315.
- A07: [Validator.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/validators/Validator.ts)
  lines 124–135.
- A08: [Messages.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/validators/Messages.ts)
  lines 150–155.
- A09/A10/A20: [CreateApiClient.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/http/CreateApiClient.ts)
  lines 118, 145–150, 164, 183, 203, 228–230.
- A24: [ExactNumberFormatter.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/i18n/ExactNumberFormatter.ts)
  lines 4–10; [LocaleFormatters.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/i18n/LocaleFormatters.ts)
  lines 16–18.

No additional precision corruption was demonstrated in numeric arithmetic/JSON during this pass.
Preserve lossless representation and explicit arithmetic; narrower native-number ranges remain the last option.

## C. Controls and accessibility

| ID | Reproduced issue | Correction and acceptance |
|---|---|---|
| A11 | Disabled/loading `Button asChild` executes anchor child actions; loading guard runs after the child's handler. Disabled `ToggleInput as="div"` responds to Enter. | Block inactive activation before any child/wrapper handler, while preserving consumer-first cancellation for enabled controls. Browser-test button/anchor/router-link/div, pointer/Enter/Space, focus and ARIA semantics. |
| A12 | External ColorPicker alpha change from `#ff000080` to `#ff000020` leaves old alpha internally. A subsequent hue change emits `#00ff0080`. | Synchronize every channel on external updates, presets, hex edits and form reset. Preserve hue only where color geometry requires it. |
| A13 | Custom DateTimeInput accepts typed years outside declared min/max and midnight outside same-day 10:00–12:00 bounds. Native mode does forward the bounds. | One complete datetime policy across typed input and calendar/time merges; disable unavailable choices and preserve invalid drafts. Add canonical readonly/context handling: readonly currently reaches the text input but not picker actions, an API gap rather than a declared readonly-prop regression. |
| A14 | Public `minuteStep=0` or negative values cause an infinite minute-generation loop. Exact source loop timed out under VM deadline. | Validate finite positive integral configuration before generating a bounded minute list; define deterministic invalid-config handling. Test zero, negatives, fractions, NaN, infinities and tiny values. This is finite time-option configuration, not restricting exact domain numbers. |
| A15 | Sortable dragend commits hovered order even without an accepted drop, including cancellation/outside drop. | Separate commit from cancellation cleanup; only accepted owned drops commit. Test success exactly once, cancellation zero times, nested groups and removed rows. |
| A16 | Disabled SelectPicker/DateTimeInput hidden values still submit. External-form SelectPicker associates only its reset anchor, omitting selected value from FormData. | Centralize named custom-control integration: disabled/form/name on successful controls, deliberate required/readonly handling. Test FormData, requestSubmit, fieldset-disabled, external forms, null and reset. Inspect the same pattern in ColorPicker/TimePicker. |
| A17 | Open SelectPicker still changes value after becoming disabled. Object-key options remain registered after unmount because raw/proxy identity differs. Item/content caller attrs are swallowed. | Guard at selection ownership boundary, keep identity-stable registration tokens, distinguish live options from label cache, forward attrs to deliberate roots through class merging. Test dynamic disabled/loading, removal, reopening, object keys, event cancellation and styles. Attr forwarding is a composability gap; the first two are behavior defects. |
| A18 | RouteAnnouncer focuses an old per-page main before RouterView replaces it. New main receives no focus. | Wait for target-route DOM commit; guard latest navigation/disposal and title timing. Test permanent and replaced main/h1, rapid navigation and query/hash-only transitions. |
| A19 | Default time panel exposes 36 separate tab stops with no arrow navigation. ColorArea advertises slider without aria-valuenow. | Give time columns roving/listbox keyboard behavior; give two-axis color input meaningful range semantics. Verify actual browser keyboard flow and axe; DOM evidence alone does not prove screen-reader usability. |

Sources:

- A11: [Button.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/actions/button/Button.vue)
  lines 418, 462–464; [Slot.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/primitives/slot/Slot.ts)
  line 49; [ToggleInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/toggleInput/ToggleInput.vue)
  line 160.
- A12: [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue)
  lines 138–146.
- A13: [DateTimeInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dateTimeInput/DateTimeInput.vue)
  lines 21, 138, 178–195, 250, 296.
- A14/A19: [TimeColumns.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/TimeColumns.vue)
  lines 47, 122, 143; [ColorArea.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorArea/ColorArea.vue)
  line 207.
- A15: [SortableGroupItem.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/sortableGroup/SortableGroupItem.vue)
  line 59; [SortableGroup.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/sortableGroup/SortableGroup.vue)
  line 69.
- A16: [SelectPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPicker.vue)
  line 375; [DateTimeInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/dateTimeInput/DateTimeInput.vue)
  line 301; [ColorPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/colorPicker/ColorPicker.vue)
  line 302; [TimePicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/timePicker/TimePicker.vue)
  line 169.
- A17: [SelectPicker.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPicker.vue)
  lines 131, 161, 188, 253; [SelectPickerItem.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPickerItem.vue)
  lines 37, 75; [SelectPickerContent.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPickerContent.vue)
  lines 61, 137, 163.
- A18: [RouteAnnouncer.vue](../../../codebase/wow-two-sdk-beta-fe/src/router/adapters/vueRouter/routeAnnouncer/RouteAnnouncer.vue)
  lines 51–61.

## D. Measured optimizations

### A21 — Remove the duplicate Tailwind merge engine

[Cn.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/styles/Cn.ts) imports standalone
`tailwind-merge`; [Tv.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/styles/Tv.ts)
re-exports full `tailwind-variants`, whose installed 3.3.1 build contains another merge implementation.

A production Vite consumer build, with Vue external and all other dependencies included, measured:

| Consumer | Current minified bytes | Current gzip bytes | Lite experiment gzip bytes | Gzip reduction |
|---|---:|---:|---:|---:|
| Button | 89,297 | 27,340 | 18,272 | 9,068 (33%) |
| Text | 73,056 | 22,746 | 13,759 | 8,987 (40%) |
| Card | 78,741 | 23,622 | 14,662 | 8,960 (38%) |
| HTTP client | 7,186 | 2,907 | 2,907 | 0 |
| ExactNumber | 26,240 | 10,992 | 10,992 | 0 |

The experiment aliases full variants to `tailwind-variants/lite`; no SDK change was applied.
It demonstrates removable duplicate cost, not a behavior-preserving drop-in fix. Audit direct variant/slot
consumers and preserve conflict resolution, responsive variants and caller-wins classes before selecting
one merge owner. Savings are shared per application, not additive per rendered component.
CSS and Vue runtime are excluded; these are bounded consumer measurements, not ForeverPin load-time claims.
Large intermediate library chunks are not consumer bundle sizes.

Reproduce after the package build:
`node engineering/architecture/analysis/vue-sdk-optimization/consumer-bundle-probe.mjs`.
The [probe](consumer-bundle-probe.mjs) creates only temporary entrypoints; [snapshot](consumer-bundle-measurements.json)
records this run. Add regression budgets around minimal consumer entrypoints after the implementation settles.

### A22 — Reuse bounded Intl caches for exact formatting

[ExactNumberFormatter.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/i18n/ExactNumberFormatter.ts)
lines 42–50, 91–111 constructs three Intl formatters per positive call, four for signed values, and reconstructs
localized digits. Two equal positive calls created six instances in the probe.

Use the existing [IntlCache.ts](../../../codebase/wow-two-sdk-beta-fe/src/foundation/i18n/IntlCache.ts)
pattern for formatter and locale-digit metadata. Verify equivalent options reuse entries, locale/options
changes do not collide, and eviction remains bounded. A one-run 1,000-value sample took about 71 ms locally;
that timing is context only, not a portable benchmark or CI threshold.

## E. Complete integration contracts

### A23 — Route component defaults through LocaleProvider

Presentation and router sources contain no calls to `useLocale`, `useLocaleFormatters` or `provideLocale`.
The foundation provider exists, but defaults such as LoadingState's title, NumberInput increment/decrement
labels, SelectPicker's empty result and AppErrorBoundary text stay English.

Sources: [LoadingState.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/feedback/loadingState/LoadingState.vue)
line 31; [NumberInput.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/numberInput/NumberInput.vue)
lines 70–71; [SelectPickerContent.vue](../../../codebase/wow-two-sdk-beta-fe/src/presentation/forms/selectPicker/SelectPickerContent.vue)
line 72; [AppErrorBoundary.vue](../../../codebase/wow-two-sdk-beta-fe/src/router/adapters/vueRouter/appErrorBoundary/AppErrorBoundary.vue)
lines 106–109.

Connect SDK-authored messages and default formatting to the provider, retaining explicit per-component
overrides. Include reactive locale changes, deterministic SSR/hydration and RTL browser behavior.
This is the already-recorded per-component extraction gap in [targets.md](../ui-philosophy/targets.md),
not a proposal to add a new translation framework.

### A25 — Verify real consumer compositions and browser contracts

The packed gate [check-package.mjs](../../../codebase/wow-two-sdk-beta-fe/scripts/check-package.mjs)
lines 113–136 imports declarations into `consumer.mts` and runs strict TypeScript. It does not compile a real
consumer Vue template against the tarball. Current tests contain no `.vue` template inference fixture,
despite the track already recording template-specific generic widening.

Add positive/negative packed SFC fixtures for typed fields, union arrays, ExactNumber models, emits and slots.
Exercise an SDK-only integration fixture combining auth → HTTP → query → form → route behavior.
Use deterministic deferred promises for races rather than timing sleeps.

The current [vitest.config.ts](../../../codebase/wow-two-sdk-beta-fe/vitest.config.ts) browser matrix
contains Chromium and Chromium forced-colors. Add WebKit and Firefox coverage for native/custom controls,
focus, portals, datetime and forms; declare supported baselines. This is a coverage gap, not proof those
browsers currently fail. Include real keyboard/accessibility assertions and selected visual states.

## Implementation order

| Batch | Findings | Completion criterion |
|---|---|---|
| Session ownership | A01, A02 | Old requests/mutations cannot alter a new session; teardown owns private persistence and bridge state. |
| Form/validator integrity | A04–A08 | Both adapters agree under races; array identities/defaults remain isolated; diagnostic values preserve precision. |
| Google identity | A03 | One page owner supports multiple controls without callback replacement. |
| HTTP contracts | A09, A10, A20 | Gateway retries survive diagnostic failures; cancellation settles; detailed success metadata is usable. |
| Interaction safety | A11–A17 | Disabled, cancelled, bounded and controlled states behave consistently; native form behavior is verified. |
| Navigation/accessibility | A18, A19 | New route DOM receives focus; time/color controls expose usable keyboard semantics. |
| Measured efficiency | A21, A22 | One merge engine; cached exact formatting; behavior retained and consumer budgets recorded. |
| Locale/exact display | A23, A24 | Provider-owned labels and exact currency/percent work without native-number coercion. |
| Release verification | A25 plus every fix's regression tests | Full local gates, packed SFC consumer, browser matrix, documented migration; human publishes. |

Mechanical corrections can proceed without individual component approvals. Session and row-identity changes
need a written contract during implementation, but no product-policy decision currently blocks this queue.
Preserve existing entrypoint isolation and beta versioning. Avoid compatibility shims solely for the parked
React track. Publish one verified Vue candidate before upgrading ForeverPin; product visual acceptance
still controls `smart-qr` promotion. Demo-app optimization remains after that upgrade.

## Local characterization evidence

These scratch artifacts are diagnostic captures, not part of the package or its release gates:

- `/private/tmp/vue-state-audit-20260925/integration.test.ts` and `vitest.config.mjs` — 8 state probes.
- `/private/tmp/vue-sdk-ui-audit/audit.test.ts` and `vitest.config.mjs` — 19 presentation/liveness probes.
- `/private/tmp/vue-exact-audit-bundle.mjs` — transport/validator/exact-format probes.
- `/private/tmp/fe-sdk-astra-build.log` — successful current package build.
- Run either temporary Vitest config from the Vue package with `pnpm exec vitest run --config <path>`.
- Scratch files can disappear; the triggers, observed results, source references and acceptance criteria above
  are the durable evidence. New regression tests must assert the corrected contract.
