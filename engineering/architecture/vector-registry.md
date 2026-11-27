# Vector Registry

*Last updated: 2026-07-13*

> Master list of every **vector** — a cross-cutting capability the SDK builds, distinct from a single component. Shipped, in-flight, or possible-unbuilt, at a glance. Full verdicts + evidence live in [`analysis/ui-philosophy/targets.md`](./analysis/ui-philosophy/targets.md) (§2 cross-cutting · §3 browser-API), [`analysis/frontend-modules.md`](./analysis/frontend-modules.md) (module waves), and the `analysis/*.md` deep docs. This registry **indexes** them — it never duplicates their prose. Component-level inventory is a separate axis → [`component-catalog.md`](./component-catalog.md).

## 1. Shipped modules (public subpaths)

Concrete deliverables — each an `@wow-two-beta/ui/*` subpath export.

| Vector | Subpath | State | Detail |
|---|---|---|---|
| HTTP api-client | `foundation/http` | **shipped** (Wave 1) | `createApiClient` — envelope unwrap · `ProblemDetails`→`ApiError` · bearer/cookie · 401 hook · `fieldErrors` · Temporal opt-in |
| Data / query | `query` · `query/testing` | **shipped** | `createQueryClient` · `defineEndpoint`; [`query-review.md`](./analysis/query-review.md) = migration-ready |
| Optimistic mutation | `query` (`useOptimisticMutation`) | **shipped** (Wave 1) | multi-target apply + exact-snapshot rollback |
| Auth session | `auth` | **shipped** (Wave 1) | `AuthProvider`/`useAuth` · cookie/bearer/redirect · guest + Google · `createAuthBridge` |
| Feedback bus | `feedback` (+ presentation `FeedbackToasts`) | **shipped** (Wave 1) | `createFeedbackBus`/`notify` · `feedbackQueryErrors()` → `Toaster` seam |
| Forms engine | `forms-engine` · `/house` · `/tanstack` | **shipped** (Wave 2) | house + tanstack adapters · one 114-case conformance · Standard Schema; [`forms-engine.md`](./analysis/forms-engine.md) |
| Routing | `router` | **shipped** | `react-router-dom` wrap; [`router-review.md`](./analysis/router-review.md) = migration-ready |
| Theming | `foundation/themes` (+ `themes.css`/`themes.json`) | **shipped** | OKLCH engine · 183 themes · Theme Studio; `theming.md` / `THEMES.md` |
| Storage | `foundation/storage` (+ `/zustand`) | **shipped v2** | v1 `StorageBroker` (local/memory) + v2 `namespacedBroker` (key isolation) + `createVersionedStore` (`{v,data}` envelope · on-read migration chain · degrade-to-`initial`); autosave = `useAutosave` hook (`foundation/hooks`); `foundation/storage/zustand` = `brokerPersistStorage` → zustand `PersistStorage` bridge (structural mirror, **zero zustand dep**) |
| Config (typed env) | `foundation/config` | **shipped** (Wave 2) | `defineConfig(schema)` over ordered sources (runtime `window.__APP_CONFIG__` ahead of build-time `import.meta.env`) · 8 field builders · optional/default/prefix · fail-fast aggregated `ConfigError` · secret redaction |
| Keyboard shortcuts | `foundation/shortcuts` | **shipped** (Wave 3) | pure `Chord` model (`parseChord`/`matchesChord`/`formatChord`, platform-adaptive `mod`, `Modifier`+`Key` constants) + `useHotkeys`/`useHotkeyMap` (window/element scope · typing-context aware). Command-registry/palette layer = W3-c (queued) |
| Format (humanizers) | `foundation/format` | **shipped** (Wave 3) | locale-free `formatBytes` · `formatDuration` · text (`truncate`/`capitalize`/`titleCase`/`slugify`/`initials`/`maskString`) · English `pluralize`/`ordinal`. Distinct from i18n `Intl` (locale number/date/currency) |
| Files | `foundation/files` | **shipped** (Wave 3) | `accept` matching (authoritative + advisory pre-drop) · name parsing / `safeFileName` · promise `FileReader` reads · object-URL downloads that always revoke. `FileUpload`/`FilePicker` are consumers; adoption pending |
| Commands | `foundation/commands` | **shipped** (Wave 3) | headless registry (`createCommandRegistry`: dispose · dup-id replaces · `available()` · total `run` outcomes · `subscribe`+`version`) · ranked `searchCommands` · `useCommandShortcuts` over `useHotkeyMap` · `CommandsProvider`/`useRegisterCommands`. `CommandPalette` adoption pending |
| Errors (generic) | `foundation/errors` | **shipped** (Wave 3) | `toError` · `getErrorMessage` · cause-chain walk (cycle + depth capped) · `isAbortError`/`isTimeoutError` · `serializeError`. **Never throws** — every helper runs inside a `catch`. API errors stay in `foundation/http` |
| Analytics | `analytics` | **shipped** (Wave 3) | headless bus: `track`/`identify`/`page` · provider fan-out (+console/memory) · consent gate · super-properties · isolated provider failures · pre-register queue · `flush()` |
| Collections | `foundation/collections` | **shipped** (Wave 7) | immutable array/set/record/tree helpers · `deepEqual` (circular-safe) · `buildTree` w/ cycle promotion. No sort — ordering stays `foundation/selection` |
| Date / time | `foundation/datetime` | **shipped** (Wave 7) | arithmetic + comparison + intervals + ISO parse/serialize (local-day correct, DST-asserted). Formatting stays `foundation/i18n`. **Temporal-vs-Date decision open before adoption** |
| Validation | `foundation/validation` | **shipped** (Wave 7) | dependency-free validators with a verified `~standard` bridge, usable outside forms. `forms-engine` could later import the spec type from here |
| Validation messages | `foundation/validation` (`Messages.ts`) | **shipped** | shared rule-code vocabulary + catalogue so a client-caught and a server-caught failure of one rule read identically. `FLUENT_VALIDATION_CODES` normalizes the server's codes on read (`foundation/http` `fieldIssues`); `AppFormOptions.messages` / `.labels` wire it; unknown code → the source's own message. Backend half (params + resx field messages) is queued in the BE SDK |
| Net (streaming) | `foundation/net` | **shipped** (Wave 7) | SSE · WebSocket (send queue, heartbeat) · visibility/offline-aware polling · `waitForOnline`. Backoff from `resilience`; request/response stays `foundation/http` |
| Async primitives | `foundation/async` | **shipped** (Wave 6) | `withTimeout` (the gap `resilience` left) · `abortable` · `pLimit`/`mapLimit` · `retryAsync` over `resilience` · `debounceAsync`/`throttleAsync` · `deferred`. Zero deps |
| Undo / redo | `foundation/undo` | **shipped** (Wave 6) | command + snapshot flavors over one core: redo-branch truncation · depth limit · coalescing · transactions · `useUndoShortcuts` |
| Clipboard | `foundation/clipboard` | **shipped** (Wave 6) | discriminated write/read results · multi-format copy · `execCommand` fallback · paste-event extraction · `useClipboardCopy`. Supersedes `useClipboard`'s failure-swallowing; that hook stays until a migration pass |
| Speech | `foundation/speech` | **shipped** (Wave 6) | synthesis (`speak`, voice list awaiting `voiceschanged`) + recognition (prefixed, error-code mapped). `supported` is prominent — Firefox lacks recognition |
| IndexedDB | `foundation/idb` | **shipped** (Wave 5) | zero-dep promise wrappers · `openDatabase` w/ blocked-timeout · `withTransaction` · cursor `iterate` · `createKeyValueStore`. Async/structured-clone sibling of the sync `foundation/storage` |
| Workers | `foundation/workers` | **shipped** (Wave 5) | zero-dep typed RPC (id-correlated, out-of-order safe) · `exposeWorkerApi` · transferables · `useWorker` · `runInWorker` |
| Screen | `foundation/screen` | **shipped** (Wave 5) | fullscreen (+WebKit prefixes) · wake lock w/ visibility re-acquire · orientation lock. Acts on the screen; `foundation/device` observes it |
| Geolocation | `foundation/geolocation` | **shipped** (Wave 5) | plain position snapshot · error-code mapping · leak-free `watchPosition` · haversine `distanceBetween` · permission via `notifications` |
| Virtualization | `foundation/virtualization` | **shipped** (Wave 5) | §2.10 closed. Headless windowing, zero deps: prefix-sum measurements · binary-search variable path · `useVirtualList` w/ dynamic measure + scroll anchoring. Composes with `ScrollViewport` |
| Observers | `foundation/observers` | **shipped** (Wave 5) | Intersection + Mutation (`useInView`/`once`, shared-instance `useIntersectionObserver`, `useVisibility`, `useMutationObserver`). Resize stays in `foundation/hooks` |
| Crypto | `foundation/crypto` | **shipped** (Wave 5) | digests (FIPS-vector verified) · bias-free random · hex/base64/base64url codecs · `timingSafeEqual` · `hashObject`. IDs stay in `foundation/identifiers` |
| Cross-tab sync | `foundation/sync` | **shipped** (Wave 5) | typed `BroadcastChannel` + `storage` fallback + inert · leader election w/ crash reclaim · `memorySyncHub` double · React bindings |
| Gestures | `foundation/gestures` | **shipped** (Wave 4) | Pointer-Events `useDrag`/`useSwipe`/`useLongPress`/`usePinch` + pure math core. Unblocks the Toaster swipe-to-dismiss tail |
| Selection / sort / filter | `foundation/selection` | **shipped** (Wave 4) | §2.11 canonized: immutable selection (range + tri-state) · multi-field sort (nullish-last, existing collator) · 7-operator filters · controlled/uncontrolled hooks. `DataTable` migration pending |
| Media capture | `foundation/media` | **shipped** (Wave 4) | `getUserMedia` camera/mic → discriminated result over real `DOMException` names · device enumeration · track-stopping lifecycle · `useMediaStream` |
| Animation / FLIP | `foundation/animation` | **shipped** (Wave 4) | WAAPI wrapper + FLIP (`measureRect`/`computeFlipTransform`/`playFlip`/`useFlip`/`AnimatedLayout`), reduced-motion honored. Geometry layer beside `Presence` (lifecycle) |
| Logger | `foundation/logger` | **shipped** (Wave 4) | leveled + multi-sink + `child(context)` + runtime `setLevel` + secret redaction (nested, circular-safe). Errors serialized via `foundation/errors`. Never throws |
| Device / capability | `foundation/device` | **shipped** (Wave 4) | `usePointerType`/`useHoverCapability` · `useOnlineStatus` · `useDisplayMode`/`useIsInstalled` · `getPlatform` · `useBreakpoint` (caller-owned scale). Built on `useMediaQuery`/`useEventListener`/`isApplePlatform` — no second implementation |
| Notifications (OS) | `foundation/notifications` | **shipped** (Wave 4) | Web Notification + Permissions API. Discriminated `notify` result · `autoCloseMs` · legacy-callback `requestPermission` · `queryPermission`. **Not** the in-app toast — that stays `feedback` + `presentation/feedback` |
| Uploads | `foundation/uploads` | **shipped** (Wave 4) | queue w/ bounded concurrency · transport seam (+`xhrUploadTransport` for real progress) · retry via `foundation/resilience` · abort-aware cancel · `useUploadQueue`. Composes `files`/`resilience`/`errors` |
| Share | `foundation/share` | **shipped** (Wave 3) | Web Share + clipboard fallback: `canShare` · `share` → `shared`/`dismissed`/`unsupported`/`failed` · `shareOrCopy` (falls back on unsupported only, never on user-cancel) · `useShare`. Never throws; reuses `errors.isAbortError` |
| Feature flags | `flags` | **shipped** (Wave 3) | OpenFeature-*shaped*, zero dependency: typed total evaluation w/ `reason`/`variant`, default on mismatch/error · `staticFlagProvider` targeting + variants · evaluation context · `FlagsProvider`/`useFlag` |
| Resilience | `foundation/resilience` | **shipped** | retry / backoff patterns |
| Load more | `foundation/virtualization` (`useLoadMore`, `cursorPaging`/`offsetPaging`) + `presentation/actions` (`LoadMoreButton`, `NewItemsButton`) | **shipped** (0.0.72) | First page → `Show more` gate → pages by scroll speed (lookahead + page size from speed and learned latency, bounded `{ minimum, maximum }`); list / measured-grid windowing; stand-ins; failure episodes, cancellation, offline hold; head refresh, live insert / upsert / remove with anchoring and the `N new` pill; snapshot / restore. `useAdaptiveWindow` reshaped (`isWindowed`, `{ range, … }`); `useAdaptiveList` deprecated. [`load-more-completeness.md`](./analysis/load-more-completeness.md) |
| Pagination contracts | `foundation/http` (`Page`/`TokenPage`) | **shipped** (iter 5) | 9 `IHas*` composables → `Page<T>` / `TokenPage<T,TToken>` / `CursorPage`; type-only, additive; [`pagination-model.md`](./analysis/pagination-model.md) |
| Identifiers | `foundation/identifiers` | **shipped** (iter 5) | branded `Guid` — `createV7`/`createV4`/`parse`/`compare`… (own ~25-LOC v7, .NET `System.Guid`-parallel); [`guid-type.md`](./analysis/guid-type.md) |
| i18n (locale foundation) | `foundation/i18n` | **shipped** (foundation) | `LocaleProvider`/`useLocale` (messages dict/callback + SDK fallback) · `useLocaleFormatters` (cached `Intl` number/currency/date/relative/list/plural) · `FormattedRelative`. Per-component string extraction (~150–200 strings) = the remaining §2.2 P6 tail |
| Icons | `foundation/icons` | **shipped** | `<Icon>` registry (lucide) |
| Primitives (L2 headless) | `foundation/primitives` | **shipped** (17) | Slot · Portal · FocusScope · AnchoredPositioner · … → [`component-catalog.md`](./component-catalog.md) |
| Utils / hooks | `foundation/utils` · `foundation/hooks` | **shipped** | `cn` · polymorphic types · `useControlled` · observers · `useAutosave` (debounced save + status + unmount-flush) |
| Domain values | `domain/color` · `domain/emoji` | **shipped** | `Gradient` ops · emoji data |
| Components | `presentation/{actions,display,feedback,forms,layout,nav,overlays}` | **shipped** (231) | → [`component-catalog.md`](./component-catalog.md) |

## 2. Cross-cutting vectors (`targets.md` §2)

25 vectors — headline verdict only; full sub-vector tables in `targets.md` §2.x.

| § | Vector | Verdict | Headline |
|---|---|---|---|
| 2.1 | Accessibility | NOW | APG-per-component; axe report-only wired; `Announce` + burn-down NEXT |
| 2.2 | Internationalization | NEXT | en-US-locked today — the largest single gap; `LocaleProvider` P6 sweep (own track) |
| 2.3 | Theming & tokens | DONE (extend) | density · z-index · high-contrast tokens NEXT |
| 2.4 | Styling system | DONE | Tailwind v4 + `tailwind-variants` + `tailwind-merge` (LOCKED) |
| 2.5 | Composition & API | DONE | compound · hooks · providers · anatomy specs |
| 2.6 | Polymorphism | DONE | `as` / `asChild` (LOCKED) |
| 2.7 | Forms | DONE | forms-engine shipped; autosave + 3 arch items deferred |
| 2.8 | Motion | LATER | `Presence` shipped; FLIP / layout-anim NEXT; motion tokens P6 |
| 2.9 | Density / size | NEXT | `xs`–`xl` standardize + density modes (P6) |
| 2.10 | Performance | PARTIAL | tree-shake / subpath DONE; **virtualization** NEXT |
| 2.11 | Selection / search / sort | PARTIAL | canonize NEXT |
| 2.12 | Delegate / extension API | NEXT | canonize in P6 |
| 2.13 | Browser API integration | → §3 | see browser-API groups (§4 below) |
| 2.14 | Keyboard semantics | DONE | APG per component |
| 2.15 | Drag & drop | LATER | wrap `pragmatic-drag-and-drop` when a consumer needs it |
| 2.16 | Async data states | PARTIAL | `query` + optimistic-mutation shipped; extend NEXT |
| 2.17 | Notifications | NEXT | feedback bus shipped; Toaster batch-7 remaining |
| 2.18 | Z-index management | NEXT | tokens replace `z-*` literals (P6) |
| 2.19 | Portals / overlay system | DONE | Portal · AnchoredPositioner · DismissableLayer |
| 2.20 | Customization layers | DONE | slot styling · data-attributes · token overrides |
| 2.21 | Telemetry / observability | LATER | `analytics` module = Wave 3 |
| 2.22 | Error handling | LATER | `errors` extraction deferred (promote when touched) |
| 2.23 | Print | SKIP | — |
| 2.24 | Test surface | PARTIAL | E2E-first suite live (1813 tests); see [`testing.md`](./testing.md) |
| 2.25 | SSR / hydration | SKIP (LOCKED) | CSR-only |

## 3. Infra module pipeline (`frontend-modules.md` waves)

Product-evidence-ranked — a module N products already hand-roll = proven demand, migration = deletion.

- **Wave 1 — DONE**: `foundation/http` api-client · `auth` · `query` optimistic-mutation · `feedback` bus.
- **Wave 2 — DONE** (2026-07-13): `forms-engine` · `foundation/config` typed env · `foundation/storage` v2 (`namespacedBroker` + `createVersionedStore` + `useAutosave` + `foundation/storage/zustand` persist adapter).
- **Wave 3 — DONE** (2026-07-13): `foundation/shortcuts` · `foundation/format` · `foundation/files` · `foundation/commands` · `foundation/errors` · `foundation/share` · `analytics` · `flags`.
- **Adoption sweep — DONE** (2026-07-13): `CommandPalette` → `useHotkeys` · `FileUpload` → `files` · `http`/`query` → `errors`. Deliberately not adopted: `ChatComposer` (a native-listener adoption would fire before React's synthetic `onKeyDown` and break the `defaultPrevented` opt-out) · `FilePicker` (passes `accept` straight to the native input; no logic to dedupe). Still open: `CommandPalette` → `foundation/commands` registry (the palette keeps its own item registry).
- **Deferred (trigger-gated)**: `errors` extraction · `AppDevtools` · `uploadQueue` · i18n (→ own P6 track).
- **Open triage (raised 2026-07-13)** — **global-state abstraction**: a swappable house contract + `zustand` (default) / `redux` adapter as optional peers, forms-engine-style. ⚠️ *Bundling* a state manager is verdicted **SKIP** ([`frontend-modules-ecosystem.md`](./analysis/frontend-modules-ecosystem.md) E#26 — React 19 + RQ cache + `usePersistentState` cover app state; consumer brings zustand). The **swappable-adapter** framing is the un-decided question — owner call before it becomes an iteration.

## 4. Browser-API wrapper plan (`targets.md` §3 — 27 groups)

Vector 2.13's detail. Highlights (full table: `targets.md` §3):

- **DONE / shipped**: DOM observation (§3.1) · Storage (§3.6) · Networking (§3.8, `foundation/http`) · Identity/Auth (§3.20, `auth`) · Routing/URL (§3.22, `router`).
- **NEXT / PARTIAL**: Pointer/Input (§3.3) · Clipboard (§3.5) · File/FS (§3.7) · Media capture/playback (§3.11–3.12) · Animation/CSS (§3.15) · Notifications/Sharing (§3.24).
- **SKIP**: Web Components (§3.26) · most hardware/sensor groups until a consumer needs them.

## Maintenance

- **New vector considered** → add a row here, then walk `targets.md` (verdict) + `ideas.md` (inventory) — the paired source-of-truth (see repo `CLAUDE.md`). Don't inline deep analysis; link it.
- **Module shipped** → flip its row to **shipped** + note the subpath, and sync the matching `targets.md` §.
- This registry is the index; `targets.md`/`ideas.md`/`analysis/*` hold the reasoning.
