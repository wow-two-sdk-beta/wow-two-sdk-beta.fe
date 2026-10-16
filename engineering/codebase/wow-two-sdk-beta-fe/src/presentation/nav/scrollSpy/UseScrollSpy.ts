import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

/**
 * The `useScrollSpy` tuning knobs.
 *
 * Every field is a `MaybeRefOrGetter` — pass a getter (`() => props.rootMargin`)
 * so a change re-creates the observer, the job React's effect dependency array did.
 * `ScrollSpy`'s own props are the plain-value mirror of this shape.
 */
export interface UseScrollSpyOptions {
  rootMargin?: MaybeRefOrGetter<string | undefined>;
  threshold?: MaybeRefOrGetter<number | ReadonlyArray<number> | undefined>;
  /** Element to observe within. Defaults to viewport. */
  root?: MaybeRefOrGetter<Element | Document | null | undefined>;
}

/**
 * Track which of `ids` is currently the topmost in-view section.
 * Uses `IntersectionObserver` — the returned ref holds `null` until the first
 * intersection.
 */
export function useScrollSpy(
  ids: MaybeRefOrGetter<ReadonlyArray<string>>,
  options: UseScrollSpyOptions = {},
): Readonly<ShallowRef<string | null>> {
  const activeId = shallowRef<string | null>(null);
  const mounted = shallowRef(false);
  onMounted(() => {
    mounted.value = true;
  });

  watch(
    [
      () => [...toValue(ids)],
      () => toValue(options.rootMargin) ?? '0px 0px -60% 0px',
      () => toValue(options.threshold) ?? 0,
      () => toValue(options.root) ?? null,
      mounted,
    ],
    ([idList, rootMargin, threshold, root, isMounted], _previous, onCleanup) => {
      activeId.value = null;
      if (!isMounted) return;
      /* `immediate: true` makes this watcher run during SSR too (Vue skips only the
         non-immediate post-flush ones), where neither `document` nor
         `IntersectionObserver` exists. */
      if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined' || idList.length === 0) {
        return;
      }

      let active = true;
      const seen = new Map<string, number>(); // id → top offset
      const elements = idList.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el != null);

      const observer = new IntersectionObserver(
        (entries) => {
          if (!active) return;
          for (const e of entries) {
            if (e.isIntersecting) {
              seen.set(e.target.id, e.boundingClientRect.top);
            } else {
              seen.delete(e.target.id);
            }
          }
          if (seen.size === 0) {
            activeId.value = null;
            return;
          }
          // Pick the section whose top is closest to (but above) the rootMargin band.
          let bestId: string | null = null;
          let bestTop = Number.POSITIVE_INFINITY;
          for (const [id, top] of seen) {
            if (top < bestTop) {
              bestTop = top;
              bestId = id;
            }
          }
          activeId.value = bestId;
        },
        /* `IntersectionObserverInit.threshold` is spelled `number[]`; the option keeps the readonly form for
           callers, and the observer only reads the list. */
        { rootMargin, threshold: threshold as number | Array<number>, root },
      );

      for (const el of elements) observer.observe(el);
      onCleanup(() => {
        active = false;
        observer.disconnect();
      });
    },
    { immediate: true, flush: 'post' },
  );

  return activeId;
}
