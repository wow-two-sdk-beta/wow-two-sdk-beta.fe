import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

/** @internal The placeholder rows a first load draws when no count is given. */
const DefaultSkeletonItems = 3;

/**
 * The loaded items, or `count` empty stand-ins while nothing has loaded yet — so a `DataRegion` first load renders
 * the real layout and every component in it draws its own skeleton.
 *
 * A stand-in is `undefined`: read fields with `item?.name` and key rows with `item?.id ?? index`. A loaded empty list
 * stays empty, so the region's empty state still shows.
 */
export function useSkeletonItems<T>(
  source: MaybeRefOrGetter<ReadonlyArray<T> | null | undefined>,
  count: MaybeRefOrGetter<number> = DefaultSkeletonItems,
): ComputedRef<ReadonlyArray<T | undefined>> {
  return computed(() => {
    const items = toValue(source);
    if (items) return items;
    return Array.from({ length: Math.max(0, Math.floor(toValue(count)) || 0) }, () => undefined);
  });
}
