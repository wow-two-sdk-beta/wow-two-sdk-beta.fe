/* Maps the `foundation/http` wire pages onto load-more pages. */

import type { IHasTotalCount, Page, TokenPage } from '../http';
import type { LoadMorePage } from './LoadMoreModels';

/** Contains the mappers from wire pages to load-more pages. */
export const LoadMorePageExtensions = {
  /** `TokenPage<T>` → page: `next` is `nextPageToken`, absent → `null`. An intersected `totalCount` → `total`. */
  fromTokenPage<T, TToken = string>(page: TokenPage<T, TToken> & Partial<IHasTotalCount>): LoadMorePage<T, TToken> {
    return {
      items: page.items,
      next: page.nextPageToken ?? null,
      ...(page.totalCount === undefined ? {} : { total: page.totalCount }),
    };
  },

  /** `Page<T>` → the offset slice `offsetPaging` reads, with `total` = `totalCount`. */
  fromOffsetPage<T>(page: Page<T>): { items: ReadonlyArray<T>; total: number } {
    return { items: page.items, total: page.totalCount };
  },
} as const;
