// observers — foundation seam. The browser's element-watching APIs as headless composables plus Vue-free cores:
// `IntersectionObserver` (is it on screen, and how much) and `MutationObserver` (did the DOM under it change).
//
// Resize subscriptions share this capability through useResizeObserver.
//
// HOUSE RULES, which consumers should follow too:
//
//  - EVERY COMPOSABLE IS A LIFECYCLE WRAPPER OVER A VUE-FREE CORE. `observeIntersection` and `observeMutation`
//    take an element and a callback and return a disposer; the composables add "which element, for how long, and
//    when to re-subscribe". Non-Vue code (a router guard, an analytics probe, a plain script) uses the cores
//    directly and gets identical semantics — the observer's behaviour is proven once, not once per composable.
//
//  - A TEMPLATE REF IS REACTIVE, which is what deletes the React original's whole ref-diffing machine. There, a
//    `RefObject` mutating does not re-render, so every hook had to re-read `ref.current` after EVERY render and
//    diff it against what was actually observed — otherwise it kept observing a node detached three renders ago
//    and reported a stale answer forever. Here a post-flush effect re-runs exactly when the element or the
//    options change, so the subscription is rebuilt when it should be and never otherwise.
//
//  - NOTHING THROWS AND NOTHING LEAKS. A missing API (server-side render, pre-2019 browser) yields a no-op
//    disposer, and `useInView` then fails OPEN — `inView: true` — because reveal-on-scroll content stranded
//    invisible is worse than content shown early. That fallback is applied from an effect, never from initial
//    state, so the server and the first client render agree. Every composable disconnects on scope disposal.
//
//  - ONE OBSERVER FOR MANY TARGETS. `useIntersectionObserver` shares a single observer across a list;
//    `useInView` per row is the classic long-list performance mistake and the multi-element form exists to make
//    the right thing the easy thing.
//
// WHAT A CONSUMER STILL OWNS:
//  - The root's scrollability. An `IntersectionObserver` `root` must be an ancestor of its targets and is
//    normally the scroll container; pointing it at a sibling reports nothing, silently.
//  - Update cost. `useVisibility` fires once per crossed step by design — that is the feature — but a
//    `steps: 100` ladder on fifty elements is five thousand potential updates per scroll. Sample as coarsely
//    as the UI actually reads.
//  - Motion. Nothing here animates, so nothing here consults `useReducedMotion`. A consumer that TWEENS a
//    reveal or scrubs on `ratio` owns that call at its own layer (`foundation/device`).
//
// NOT HERE, on purpose:
//  - `PerformanceObserver` / `ReportingObserver`. They observe the DOCUMENT's behaviour, not an element's, and
//    belong with instrumentation rather than in a UI element-watching slice.
//  - Scroll position. `IntersectionObserver` answers "is it visible", not "where is the scrollbar" —
//    `foundation/virtualization` owns windowing and offsets.

// Intersection core — Vue-free, the whole of the observation semantics
export {
  observeIntersection,
  supportsIntersectionObserver,
  type IntersectionOptions,
  type Disposer,
} from './ObserveIntersection';

// Mutation core — Vue-free, with the empty-init `TypeError` designed out
export { observeMutation, supportsMutationObserver, type MutationOptions } from './ObserveMutation';

// Pure arithmetic — the threshold ladder `useVisibility` samples with, independently testable
export { visibilityThresholds } from './VisibilitySteps';

// Is it on screen — the lazy-load / reveal-on-scroll primitive, with permanent `once`
export { useInView, type UseInViewOptions, type InViewState } from './hooks/UseInView';

// How much of it is on screen — `useInView` over a generated threshold ladder
export { useVisibility, type UseVisibilityOptions, type VisibilityState } from './hooks/UseVisibility';

// Many targets, ONE observer — the long-list form
export { useIntersectionObserver, type UseIntersectionObserverOptions } from './hooks/UseIntersectionObserver';

// Did the DOM under it change — for what Vue does not own
export { useMutationObserver, type UseMutationObserverOptions } from './hooks/UseMutationObserver';

export * from './hooks/UseResizeObserver';
