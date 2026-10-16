// Composable paginated-response contracts. Each `IHas*` fragment names one concern of a page;
// concrete `Page<T>` (offset) and `TokenPage<T>` (cursor) compose the subset they carry, and a
// screen intersects opt-in fragments (`Page<T> & IHasQueryTiming`) rather than the SDK shipping a
// combinatorial zoo. Fully additive, type-only — see engineering/architecture/analysis/pagination-model.md.

/** Defines a page's rows — the universal fragment every page carries. */
export interface IHasItems<T> {
  items: ReadonlyArray<T>;
}

/** Defines the effective page size a read was served at. */
export interface IHasPageSize {
  pageSize: number;
}

/** Defines the 1-based page index echo (offset paradigm; matches the `Pagination` component's `page`). */
export interface IHasPageNumber {
  pageNumber: number;
}

/** Defines the raw skip/limit echo — the alternate offset encoding for skip/take backends. */
export interface IHasOffset {
  offset: number;
}

/** Defines the total number of matching rows across all pages (offset paradigm). */
export interface IHasTotalCount {
  totalCount: number;
}

/**
 * Defines the opaque forward continuation cursor (cursor/token paradigm). Generic over the token type
 * (`string` by default, but a `number`, id, or any opaque cursor). An **absent** token marks the last page.
 */
export interface IHasPageToken<TToken = string> {
  nextPageToken?: TToken;
}

/** Defines the "another page exists" flag — carry only when a backend sends one; otherwise has-more is derived. */
export interface IHasMore {
  hasMore: boolean;
}

/** Defines the server-side query elapsed time (diagnostics) — carry only where a screen renders it. */
export interface IHasQueryTiming {
  queryElapsedMs?: number;
}

/** Defines an echo of applied filter/sort/paging (`TQuery` = the product's `{Noun}QueryDto`) — stretch, opt-in. */
export interface IHasAppliedQuery<TQuery> {
  appliedQuery?: TQuery;
}

/** Defines an offset/page-indexed slice of a list read — the shape `useAppPaginatedQuery` binds `TPage` to. */
export interface Page<T> extends IHasItems<T>, IHasPageNumber, IHasPageSize, IHasTotalCount {}

/** Defines a cursor/token slice of a list read — the shape `useAppInfiniteQuery` binds `TPage` to. */
export interface TokenPage<T, TToken = string> extends IHasItems<T>, IHasPageToken<TToken>, IHasPageSize {}

/** Documented alias for {@link TokenPage} — "cursor" and "token" are the same keyset-forward paradigm. */
export type CursorPage<T, TToken = string> = TokenPage<T, TToken>;
