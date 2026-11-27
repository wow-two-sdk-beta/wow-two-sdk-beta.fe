# Load more — vector completeness

*Last updated: 2026-11-27*

Trigger: SCFD's Posts, Processed and Activity tabs (harvest console). Scope: the whole load-more vector in the fe
SDK, not only SCFD's slice. Shipped in `0.0.72`: `useLoadMore`, `cursorPaging` / `offsetPaging`, the page mappers,
`LoadMoreButton`, `NewItemsButton`, and the reshaped `useAdaptiveWindow`.

| Capability | Verdict | Trigger / reason |
|---|---|---|
| cursor paging | ship now | SCFD three tabs |
| offset paging | ship now | proactive; first consumer `RunAuditPanel` attempts |
| gate → automatic, page sizing, lookahead | ship now | the design |
| list, grid (measured rows), table windowing | ship now | Posts, Processed, Activity |
| `DataRegion` binding, stand-ins, tail skeletons | ship now | loading states |
| failure episodes, cancellation, offline hold | ship now | error adaptation |
| reset, refresh, head refresh, focus heal | ship now | live data |
| live insert / upsert / remove, pending pill, anchoring | ship now | live data |
| snapshot / restore | ship now | SCFD post page → back |
| keyboard, screen reader, reduced motion | ship now | accessibility |
| filter change after `Show more` stays automatic | ship now | developer decision 2026-11-27 (Q1) |
| TanStack adapter (`useAppInfiniteQuery` → `LoadMoreSource`, `limit` ignored) | defer | Wheelhouse deployments and audit migration; closes fe backlog "infinite queries first-load and refreshing states for `DataRegion`" |
| `EventsFeed.vue` (fe-events) on `useLoadMore` | defer | `useAdaptiveList` is deprecated, not removed; removed after this migration (it also lacks the `Show more` gate) |
| `RunAuditPanel` → offset load more | defer | SCFD backlog "Run page" |
| browsing state in the URL | defer | SCFD backlog "Browsing state in the URL" |
| result snapshots for consistent search paging | defer | w2 backlog "Result snapshots for consistent paging" |
| sticky headers in windowed tables | defer | first table with a sticky head |
| reverse / two-way loading (chat, older at top) | skip | no consumer; a different design |
| `VirtualScrollArea` `end-reached` | keep | a fixed-height area is the scroller `useLoadMore` already finds |

Not yet recorded: the `Vectors` row in `engineering/planning/backlog.md` (that file held another chat's change when
this shipped).
