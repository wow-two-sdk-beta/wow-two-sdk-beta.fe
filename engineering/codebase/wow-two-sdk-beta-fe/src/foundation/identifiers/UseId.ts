import { useId as useVueId } from 'vue';

/**
 * Wraps Vue 3.5's built-in `useId`. Optionally accepts a stable prefix so generated
 * IDs are easier to spot in DevTools (e.g. `useId('checkbox')` → `v-0-checkbox`).
 *
 * Must be called during `setup()` — the id is drawn from the app instance's counter,
 * which is what keeps it stable across a server render and its client hydration.
 */
export function useId(prefix?: string): string {
  const id = useVueId();
  return prefix ? `${id}-${prefix}` : id;
}
