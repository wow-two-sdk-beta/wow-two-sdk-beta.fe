# RouteAnnouncer

## Contract

`RouteAnnouncer` renders one polite, atomic, visually hidden live region. A path change moves focus to
`#app-shell-main`, the first `main`, or the first `h1`, then announces the deepest resolved route title.
Search-only and hash-only changes do not move focus or announce again.

The focused element becomes a programmatic focus target (`focusTarget` from `foundation/dom`): it gets
`tabindex="-1"` when it has no tabindex and `data-focus-target`, which the base styles render without a focus ring.
It stays reachable by screen readers and is never a Tab stop.

`canAnnounceInitial` defaults to `false`. Set it when the first client render must focus and announce (`skipInitial` is its inverted, deprecated alias).
An app that mounts before its first navigation resolves (no `await router.isReady()`) mounts on `START_LOCATION`;
that first navigation counts as the initial page, so by default it neither moves focus nor announces.
The component performs no document work during server rendering.

## Navigation timing

Path changes announce after Vue patches the routed DOM, focusing the new main element. Rapid superseding routes
and disposal invalidate pending announcements. Query-only changes remain silent; repeated titles are cleared
for one update before being announced again. Async route content that renders after its own later loading state
remains application-controlled.
