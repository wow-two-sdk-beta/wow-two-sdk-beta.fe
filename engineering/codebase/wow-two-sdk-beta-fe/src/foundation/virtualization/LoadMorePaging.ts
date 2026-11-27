/* Builds the paging strategies `useLoadMore` reads through — cursor (keyset) and offset (skip/take). */

import type { ApiFailure } from '../http';
import type { Result } from '../results';
import type { LoadMorePage, LoadMoreRequest, LoadMoreSource, PageSizeBounds } from './LoadMoreModels';

/** Keyset/cursor endpoints: the server returns the next cursor. Head inserts never move it. */
export function cursorPaging<TItem, TCursor = string, TMeta = undefined, TFailure = ApiFailure>(
  read: (request: LoadMoreRequest<TCursor>) => Promise<Result<LoadMorePage<TItem, TCursor, TMeta>, TFailure>>,
): LoadMoreSource<TItem, TCursor, TMeta, TFailure> {
  return { read, shift: (cursor) => cursor };
}

/**
 * Skip/take endpoints: the cursor is the number of server rows consumed. The end is an empty page, `next >= total`
 * when the server counts, else a page shorter than asked. Rows deleted server-side before the cursor are still
 * skipped — prefer `cursorPaging` where the endpoint offers a keyset.
 */
export function offsetPaging<TItem, TMeta = undefined, TFailure = ApiFailure>(
  read: (request: {
    offset: number;
    limit: number;
    signal: AbortSignal;
  }) => Promise<Result<{ items: ReadonlyArray<TItem>; total?: number; meta?: TMeta }, TFailure>>,
): LoadMoreSource<TItem, number, TMeta, TFailure> {
  return {
    async read({ cursor, limit, signal }) {
      const offset = cursor ?? 0;
      const result = await read({ offset, limit, signal });
      if (!result.ok) return result;
      const { items, total, meta } = result.value;
      const next = offset + items.length;
      const ended = items.length === 0 || (total === undefined ? items.length < limit : next >= total);
      return {
        ok: true,
        value: {
          items,
          next: ended ? null : next,
          ...(total === undefined ? {} : { total }),
          ...(meta === undefined ? {} : { meta }),
        },
      };
    },
    shift: (cursor, delta) => (cursor === null ? null : Math.max(0, cursor + delta)),
  };
}

/** Floors both bounds to integers, lifts the minimum to 1 and lets the maximum win when it is below the minimum. */
export function clampPageSizes(bounds: PageSizeBounds): PageSizeBounds {
  const maximum = Math.max(1, Math.floor(bounds.maximum));
  const minimum = Math.min(maximum, Math.max(1, Math.floor(bounds.minimum)));
  return { minimum, maximum };
}
