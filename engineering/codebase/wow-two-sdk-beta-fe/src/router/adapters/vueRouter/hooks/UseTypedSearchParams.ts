import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

/** Defines the typed search-params accessor — the current values plus a partial, merge-preserving setter. */
export interface TypedSearchParams<T extends Record<string, string>> {
  /** The current values — each key resolved from the URL, falling back to its default. */
  readonly values: ComputedRef<T>;

  /** Sets a partial subset of keys, preserving every untouched param already in the URL. */
  readonly setValues: (patch: Partial<T>) => void;
}

/**
 * Manages typed URL search params — a read merged over `defaults` plus a merge-preserving partial setter.
 * The read resolves each default key from the URL (falling back to its default); the setter patches only
 * the given keys and leaves every other param (typed or not) untouched. For dashboard filters / pagination.
 *
 * `values` is a `ComputedRef` (React returned a bare object) so it tracks `route.query`; `defaults` may
 * be a ref or getter when they themselves change.
 */
export function useTypedSearchParams<T extends Record<string, string>>(
  defaults: MaybeRefOrGetter<T>,
): TypedSearchParams<T> {
  const route = useRoute();
  const router = useRouter();

  const values = computed<T>(() => {
    const resolved = toValue(defaults);
    const merged: Record<string, string> = { ...resolved };
    for (const key of Object.keys(resolved)) {
      const raw = route.query[key];
      // vue-router hands back `string | null | (string | null)[]` — a repeated param takes its first
      // value, and a valueless `?flag` (null) falls back to the default.
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (typeof value === 'string') merged[key] = value;
    }
    return merged as T;
  });

  const setValues = (patch: Partial<T>): void => {
    const next: LocationQueryRaw = { ...route.query };
    for (const [key, value] of Object.entries(patch) as [string, string | undefined][]) {
      if (value === undefined) continue;
      next[key] = value;
    }
    void router.replace({ query: next });
  };

  return { values, setValues };
}
