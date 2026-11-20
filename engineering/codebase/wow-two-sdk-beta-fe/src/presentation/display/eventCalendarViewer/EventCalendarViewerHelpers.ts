import { onMounted, onScopeDispose, ref, type Ref } from 'vue';

/**
 * Whether the viewport is narrower than `minWidth` (Tailwind's `sm`, 640px, by default).
 *
 * Reads `window.innerWidth` directly rather than subscribing to a media query
 * (`foundation/device`'s `useBreakpointBelow`): below this folder's breakpoint several views render a
 * structurally different DOM (dots instead of chips, a day list instead of a time grid), so the very first
 * render must already carry the right answer. A media-query subscription only resolves the real value from
 * `onMounted`, one reactive tick after the initial render — correct for SSR, but it would flash the desktop
 * layout for exactly one frame on every mount, failing a synchronous test assertion taken right after `mount()`.
 *
 * SSR-safe: `true` (mobile-first) when there is no `window`.
 */
export function useIsPhone(minWidth = 640): Ref<boolean> {
  const isPhone = ref(typeof window === 'undefined' || window.innerWidth < minWidth);
  if (typeof window === 'undefined') return isPhone;
  function update(): void {
    isPhone.value = window.innerWidth < minWidth;
  }
  onMounted(() => window.addEventListener('resize', update));
  onScopeDispose(() => window.removeEventListener('resize', update));
  return isPhone;
}
