import { computed, type ComputedRef } from 'vue';
import { useRoute } from 'vue-router';

import type { CrumbNode } from '../RouteConfig';
import { resolveMatchedPath, toHandle } from '../RouteHandles';

/** Represents one breadcrumb derived from a matched route's `handle.crumb`. */
export interface Breadcrumb {
  /** The breadcrumb label to render. */
  readonly crumb: CrumbNode;

  /** The matched route's resolved pathname — the crumb's link target. */
  readonly pathname: string;

  /** The matched route's stable identity — its `id` (vue-router `name`), else its path pattern. */
  readonly id: string;
}

/**
 * Manages the ordered breadcrumb trail derived from the active route matches whose `handle.crumb` is set.
 *
 * Returns a `ComputedRef`, not a bare array — the trail has to track the active route.
 */
export function useBreadcrumbs(): ComputedRef<ReadonlyArray<Breadcrumb>> {
  const route = useRoute();

  return computed(() =>
    route.matched.flatMap((record) => {
      const crumb = toHandle(record.meta)?.crumb;
      if (crumb == null) return [];
      return [
        {
          crumb,
          // React read a resolved `match.pathname`; a vue-router matched record carries its full
          // path PATTERN, so the active params are substituted back in here.
          pathname: resolveMatchedPath(record.path, route.params),
          id: String(record.name ?? record.path),
        },
      ];
    }),
  );
}
