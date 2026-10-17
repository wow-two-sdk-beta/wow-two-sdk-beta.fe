# Ocharo Studio UI adoption

Ocharo Studio uses Vue 3 and consumes the local `@wow-two-beta/ui-vue` package. Its earlier React implementation
provided the behavioral baseline for these reusable units; the product no longer imports the React SDK.

| Unit | SDK status | Product use |
| --- | --- | --- |
| `PointControl` | Added to `presentation/forms` and the direct `presentation/forms/point-control` entry | Keyboard, pointer, and touch selection of a normalized textile anchor without loading the forms barrel |
| `TourPopover` | Extended with real-target tasks, accessible spotlights, viewport clamping and a direct component/style export | Interactive studio guide across desktop and mobile panels |
| `Slider` | Existing | Suitable as the input inside the product-specific icon, label, and value row |
| `usePersistentState` | Existing | Reads the legacy local theme during migration to server-backed settings |
| `createAppRouter` / `useNavigationBlocker` | Existing Vue router adapter | Separates the lightweight landing page from the lazy editor and finishes pending state writes before navigating home |
| `useVisitInvitation` | Added to `foundation/hooks` | Controlled visit-count scheduling with configurable retry, completion, and maximum-invitation policy |
| `downloadText` / `downloadBlob` | Existing in `foundation/files` | Exports portable design JSON and PNG previews with centralized filename sanitizing and object-URL cleanup |
| `LatestRevisionQueue` | Added to `foundation/sync` | Serializes revisioned writes, collapses queued snapshots to the latest value, and classifies conflicts through an injected predicate |
| `StorageBroker` result contract | Extended existing API | `write` and `remove` now report blocked, quota, and serialization failures while remaining safe for callers that ignore the result |
| `Modal` / `BottomSheet` | Existing, with component-only modal styles | The studio uses the SDK modal shell for settings, exports, onboarding, and confirmations while retaining product content and responsive composition |
| `useConfirmation` | Added to `foundation/hooks` | Provides generic promise-based confirmation state; Ocharo supplies deletion and discard wording through its modal host |
| `ToastHost` / `useToastHost` | Extended with a countdown bar and a component-only entry | Top-right studio notifications with a pausing progress bar, one deduplicated slot and a warning tone for failures |

The studio header, garment library, inspector composition, save/sync wording, onboarding content, and camera controls remain in the product. Their behavior depends on garment, renderer, or persistence contracts and does not form a stable generic SDK API yet. `IconButton` and `RangeControl` are small product wrappers around native controls because their icon/value composition and gesture-boundary callbacks are studio-specific; the underlying accessible point input and visit scheduling are shared. Studio history remains in its pure reducer because look identity, import fingerprints, and placement-gesture coalescing are domain transitions; the SDK's mutable snapshot history has a different contract.

The landing page follows the same boundary: its garment catalogue, imagery, editorial sections, and brand link are
product composition. Shared route metadata, navigation blocking, scroll/focus behavior, lazy-route retry and error
capture use the Vue SDK router. The product supplies the initial empty-route message and error-slot appearance.
Its browser suite covers history, focused edits, delayed saves, loading-time edits, direct links and failed lazy imports.
Vue composables expose live getters over immutable state snapshots; Three.js objects stay outside reactive proxies.

PointControl exposes a public `presentation/forms/point-control/styles.css` entry that scans only its compiled
component chunk. The consumer provides Tailwind and semantic theme tokens, restricts its own scan to application
source, and avoids including unrelated SDK utilities. The packed-consumer check verifies required PointControl
classes and rejects an unrelated control class. The studio loads the tour stylesheet only with its editor chunk. Tour styles use concrete, scoped selectors so
consumers do not depend on Tailwind scanning a second CSS module.

The original Vue additions passed 23 focused tests. The tour extension passes 13 focused tour/announcement DOM tests and 47 overlay SSR tests.
The confirmation addition passes 2 focused hook tests and 24 overlay DOM tests; its SDK build and packed-consumer validation cover 79 exports. Type checking and 409 SDK SFC checks also passed. The broader SDK run completed 2,090 assertions but failed on a Firefox session
timeout; it is not recorded as a passing full-suite run. Product browser verification uses installed Chromium.

The retained React SDK additions remain independently reusable. Its optional `loadingElement` and 16 router tests
describe that React adapter only. Neither package was published.

## Compatibility and release

Both React and Vue SDK local/memory/namespaced storage brokers report write/removal outcomes. Existing callers that
ignore results remain compatible. The earlier workspace audit found no external React broker implementation;
Vue implementers must also account for the new result type when adopting this unpublished package.

External implementations returning `void` must return `boolean` when adopting this changed interface; this is a TypeScript breaking change for implementers. The packed Ocharo dependency is local and unpublished. A public SDK release must follow the repository's breaking-change version policy and include this migration note.

## Interactive tour contract

A step may require `completeOn: "target-click"`; Next remains disabled until the real target is activated.
The spotlight leaves the target interactive while preventing unrelated pointer actions. Escape and Skip dismiss
the tour; focus returns to its prior control. Late targets are resolved after responsive panels become visible,
and ResizeObserver keeps the popover inside the viewport after text reflows. The product supplies step content,
which panel to reveal, and invitation timing. Informational steps do not mutate the design automatically.

This additive tour API is adopted through `wow-two-beta-ui-vue-0.0.7-ocharo-guided-tour-final2.tgz`, a tested local package
containing unpublished Ocharo capabilities. An independent lane advanced upstream release metadata to 0.0.7;
the local package is not interchangeable with a published registry package of that version.

`Announce` owns its screen-reader-only positioning, so it remains visually hidden even when a consumer imports
only a component stylesheet. The tour defers browser-only timers during server rendering.

## Confirmation and modal contract

`useConfirmation` serializes one active request into an accessible modal host and resolves explicit confirm,
cancel, and dismissal paths without native browser dialogs. The modal stylesheet has a direct
`presentation/overlays/modal/styles.css` export, so consumers load its positioning and backdrop blur without
scanning unrelated SDK components. Alert actions compose the close primitive through `as-child`; footer buttons
therefore keep normal flow layout instead of inheriting the absolute close-glyph geometry.

Ocharo adopts this contract through `wow-two-beta-ui-vue-0.0.7-ocharo-modal.tgz`, SHA-256
`79abd50c3bbaa30cd10aba3719cc185b73ddefad9ea8371c345575b5da260052`. The package remains local and unpublished.

## Toast contract

`ToastHost` takes `show-progress` to draw a countdown bar per toast; the bar pauses with the toast on hover or focus
and takes the toast's severity colour. `presentation/feedback/toast-host` loads the host, the store and
`useToastHost` without the feedback barrel, and its `styles.css` scans only the compiled host chunk. The card atom's
surface classes live in a shared chunk, so the stylesheet lists them inline; a DOM test renders every severity and
fails if a rendered class is missing from that list. The packed-consumer check covers the entry and its stylesheet.

Ocharo maps `info`, `success`, `warning`, `destructive`, `popover` and `muted` to its own tokens, keys every message to
one slot and clears the matching store notice on dismissal. It adopts this contract, the modal and the tour through
`wow-two-beta-ui-vue-0.0.7-ocharo-7a5ed4d.tgz` (SDK commit `7a5ed4d`), SHA-256
`88001091e680650f6547eee32b77710db2d3243dc14e7d1d08bf6df7f29cc35a`. Local tarballs are named by SDK commit, because npm
reuses a cached tarball whose file name and version are unchanged. The package remains local and unpublished.

## Theme

The Vue SDK registers the Ocharo palette as the authored candidate theme `ocharo`
(`src/foundation/themes/constants/Authored.ts`, radius `lg`). It carries the owner-approved Ink and Raspberry (light) and
Neutral graphite (dark) tokens and the approved raspberry-and-blue `ambient` backdrop; the Studio-derived pomegranate
candidate it replaces was never approved. Accent, muted and status tones are derived to match. Every declared contrast
pair passes in both modes. The theme stays `candidate` until an app (Desk first) adopts `.theme-ocharo` and validates
it. The island layout, header, library and inspector composition remain product-owned; the theme contract carries
colours, radius and the backdrop only.
