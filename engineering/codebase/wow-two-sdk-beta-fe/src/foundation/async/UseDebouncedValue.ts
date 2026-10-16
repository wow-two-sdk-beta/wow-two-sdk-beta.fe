import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

/**
 * Mirrors `source` once it has stopped changing for `ms` — typing a search runs one request per pause, not per
 * keystroke. The first value is mirrored at once; a pending update is dropped with the owning scope.
 * `ms` may be a ref or getter and is read per change.
 */
export function useDebouncedValue<T>(source: MaybeRefOrGetter<T>, ms: MaybeRefOrGetter<number>): Readonly<Ref<T>> {
  const settled = shallowRef(toValue(source));
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => toValue(source),
    (value) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        settled.value = value;
      }, toValue(ms));
    },
  );
  onScopeDispose(() => clearTimeout(timer));
  return settled;
}
