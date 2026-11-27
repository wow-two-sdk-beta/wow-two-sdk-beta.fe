/* Declares the contracts of the load-more mechanism — requests, pages, sources, states, rows and snapshots. */

import type { Result } from '../results';

/** What a source is asked for: the page after `cursor` (`null` for the first), about `limit` items. */
export interface LoadMoreRequest<TCursor> {
  readonly cursor: TCursor | null;
  readonly limit: number;
  readonly signal: AbortSignal;
}

/** One page as the source returns it. `next: null` ends the collection. */
export interface LoadMorePage<TItem, TCursor, TMeta = undefined> {
  readonly items: ReadonlyArray<TItem>;
  readonly next: TCursor | null;
  /** Items across every page of the current query, when the server counts them. */
  readonly total?: number;
  /** Page-level data the view reads — facets, counts, page sizes. Kept from the first page and head reads. */
  readonly meta?: TMeta;
}

/** A paging strategy over one endpoint. Built by `cursorPaging` or `offsetPaging`. */
export interface LoadMoreSource<TItem, TCursor, TMeta, TFailure> {
  read(request: LoadMoreRequest<TCursor>): Promise<Result<LoadMorePage<TItem, TCursor, TMeta>, TFailure>>;
  /** Moves a cursor after `delta` items the server also holds were added (+) or removed (−) at the start. */
  shift(cursor: TCursor | null, delta: number): TCursor | null;
}

/** The smallest and largest page a request may ask for. */
export interface PageSizeBounds {
  readonly minimum: number;
  readonly maximum: number;
}

/** Lists the states of a loaded collection. */
export const LoadMoreState = {
  /** No items yet, first page in flight. */
  FirstLoad: 'firstLoad',
  /** The first page failed; nothing to show. */
  Unavailable: 'unavailable',
  /** The first page is shown, more exist, `Show more` is visible. */
  Gated: 'gated',
  /** `Show more` was pressed; pages load by scroll. */
  Automatic: 'automatic',
  /** No page follows (items may be 0 → empty). */
  End: 'end',
} as const;
export type LoadMoreState = (typeof LoadMoreState)[keyof typeof LoadMoreState];

/** Names the read a failure belongs to. */
export type LoadMorePhase = 'first' | 'next' | 'head';

/** What to render at one position: an item, or `undefined` for a skeleton stand-in. */
export interface LoadMoreRow<TItem> {
  readonly item: TItem | undefined;
  readonly index: number;
  readonly key: string | number;
}

/** Everything needed to bring a view back after the reader left it. */
export interface LoadMoreSnapshot<TItem, TCursor, TMeta> {
  readonly queryKey: string;
  readonly items: ReadonlyArray<TItem>;
  readonly cursor: TCursor | null;
  readonly hasMore: boolean;
  readonly total?: number;
  readonly meta?: TMeta;
  readonly state: LoadMoreState;
  /** Pixels of the list scrolled past. */
  readonly scrollOffset: number;
}

/** Mirrors `DataRegion`'s props, so `<DataRegion v-bind="loader.region">` binds the collection's first load. */
export interface DataRegionBinding {
  readonly isFirstLoad: boolean;
  readonly isRefreshing: boolean;
  readonly error: string | { readonly message: string } | null;
  readonly hasData: boolean;
  readonly isEmpty: boolean;
}

/** The window of loaded items the list renders, with the padding that stands in for the rest. */
export interface LoadMoreWindow {
  readonly start: number;
  readonly end: number;
  readonly paddingStart: number;
  readonly paddingEnd: number;
}
