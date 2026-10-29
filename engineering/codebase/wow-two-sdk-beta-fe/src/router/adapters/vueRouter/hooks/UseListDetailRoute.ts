import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

/** Defines a list-detail page's selection, held in URL query keys so the browser's back button closes the detail. */
export interface ListDetailRoute {
  /** True while any of the detail keys is in the URL — bind it to `ListDetailLayout`'s `isDetailOpen`. */
  readonly isDetailOpen: ComputedRef<boolean>;

  /** Reads one query key's value — a repeated key's first — or `null` when the URL has none. */
  readonly read: (key: string) => string | null;

  /**
   * Writes query keys, keeping every other parameter; `null` removes a key. Opening a detail adds a history entry,
   * so Back returns to the list; switching between details replaces it, so Back never walks through them.
   */
  readonly select: (values: Readonly<Record<string, string | null>>) => Promise<unknown>;

  /**
   * Returns to the list — bind it to `ListDetailLayout`'s `back`. It steps back when the list is the previous history
   * entry, so a later Forward reopens the detail; otherwise, after a deep link, it navigates to the list.
   */
  readonly back: () => void;
}

/**
 * Drives a `ListDetailLayout` from the route's query: `keys` are the parameters that name the open detail, such as
 * `['vault', 'namespace']`. The layout's back control, the browser's Back and a deep link then all agree.
 * ```ts
 * const selection = useListDetailRoute(['namespace']);
 * // <ListDetailLayout :is-detail-open="selection.isDetailOpen.value" @back="selection.back">
 * selection.select({ namespace: slug });
 * ```
 */
export function useListDetailRoute(keys: MaybeRefOrGetter<ReadonlyArray<string>>): ListDetailRoute {
  const route = useRoute();
  const router = useRouter();

  function read(key: string): string | null {
    const raw = route.query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value : null;
  }

  const isDetailOpen = computed(() => toValue(keys).some((key) => read(key) !== null));

  /** The current query with `values` applied, keeping every unrelated parameter. */
  function queryWith(values: Readonly<Record<string, string | null>>): LocationQueryRaw {
    const query: LocationQueryRaw = { ...route.query };
    for (const [key, value] of Object.entries(values)) {
      if (value === null) delete query[key];
      else query[key] = value;
    }
    return query;
  }

  function select(values: Readonly<Record<string, string | null>>): Promise<unknown> {
    const location = { path: route.path, query: queryWith(values), hash: route.hash };
    return isDetailOpen.value ? router.replace(location) : router.push(location);
  }

  function back(): void {
    const list = {
      path: route.path,
      query: queryWith(Object.fromEntries(toValue(keys).map((key) => [key, null]))),
      hash: route.hash,
    };
    const previous = router.options.history.state['back'];
    if (typeof previous === 'string' && previous === router.resolve(list).fullPath) router.back();
    else void router.push(list);
  }

  return { isDetailOpen, read, select, back };
}
