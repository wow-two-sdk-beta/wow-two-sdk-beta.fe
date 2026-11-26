import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { useEventListener } from './UseEventListener';

/** The bar's height (px) assumed until it has been measured while it shows. */
const FallbackBarHeight = 56;
/** The default `threshold`, in px. */
const DefaultThreshold = 64;
/** The default `tolerance`, in px. */
const DefaultTolerance = 8;
/** The default `settleMs`. */
const DefaultSettleMs = 250;

type Target = HTMLElement | null | undefined;

/** Tunes when {@link useHideOnScroll} hides the bar and brings it back. */
export interface HideOnScrollOptions {
  /** Whether the bar may hide. Default `true`; while `false` the bar shows and scrolling is ignored. */
  readonly isEnabled?: MaybeRefOrGetter<boolean>;
  /**
   * The offset from the top (px) within which the bar always shows, and the slack beyond the bar's height a page must
   * have before the bar may hide at all. Default `64`.
   */
  readonly threshold?: number;
  /** The travel (px) in one direction that hides or reveals the bar; smaller jitters are ignored. Default `8`. */
  readonly tolerance?: number;
  /** How long (ms) scroll events are ignored after the bar hides or shows, while the layout settles. Default `250`. */
  readonly settleMs?: number;
}

/** What {@link useHideOnScroll} returns. */
export interface HideOnScrollHandle {
  /** Whether the bar is hidden now. Bind the class that hides it to this. */
  readonly isHidden: Readonly<ShallowRef<boolean>>;
  /** Shows the bar and forgets the travel so far — on navigation, say. */
  readonly reveal: () => void;
}

/**
 * Hides a top bar while the reader scrolls a region down and brings it back on the way up — the phone pattern that
 * hands a tall page the bar's space. The hook only decides; the caller hides the bar, typically with a negative top
 * margin that collapses its row so the region grows into the space.
 *
 * Direction is read by accumulated travel: the movement in the current direction is summed, and the sum restarts when
 * the direction flips. `tolerance` px down while more than `threshold` from the top hides the bar; `tolerance` px up,
 * or a return to within `threshold` of the top, reveals it.
 *
 * The bar hides only on a page taller than its view by more than the bar's height plus `threshold`, measured as if the
 * bar shows: hiding grows the region by the bar's height, so a barely-tall page would otherwise hide, clamp and
 * flicker. After every change, scroll events are ignored for `settleMs` and the offset is then read afresh — the
 * region resizes while the bar animates and the browser may clamp its offset, which is layout, not the reader.
 *
 * Focus moving into the hidden bar reveals it, for a keyboard user tabbing into it.
 *
 * @param region - The scrolling element. The listener re-binds when it changes.
 * @param bar - The bar. Its `offsetHeight` is measured while it shows and kept; 56px until then.
 * @param options - The gate, the threshold, the tolerance and the settle window.
 * @returns Whether the bar is hidden, and `reveal`.
 */
export function useHideOnScroll(
  region: MaybeRefOrGetter<Target>,
  bar: MaybeRefOrGetter<Target>,
  options: HideOnScrollOptions = {},
): HideOnScrollHandle {
  const threshold = options.threshold ?? DefaultThreshold;
  const tolerance = options.tolerance ?? DefaultTolerance;
  const settleMs = options.settleMs ?? DefaultSettleMs;
  const isEnabled = () => toValue(options.isEnabled ?? true);
  const isHidden = shallowRef(false);
  let measuredHeight: number | undefined;
  let lastTop: number | undefined;
  /** The travel in the current direction: positive down, negative up. */
  let travel = 0;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  /** The bar's height, read only while it shows: a hidden bar's own height is not what the page gains. */
  function barHeight(): number {
    if (!isHidden.value) {
      const height = toValue(bar)?.offsetHeight;
      if (height) measuredHeight = height;
    }
    return measuredHeight ?? FallbackBarHeight;
  }

  /** Takes the region's current offset as the point travel is measured from. */
  function baseline(): void {
    lastTop = toValue(region)?.scrollTop;
    travel = 0;
  }

  function setHidden(next: boolean): void {
    if (isHidden.value === next) return;
    isHidden.value = next;
    travel = 0;
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = undefined;
      baseline();
    }, settleMs);
  }

  function reveal(): void {
    travel = 0;
    setHidden(false);
  }

  function onScroll(): void {
    const element = toValue(region);
    if (!element || !isEnabled() || settleTimer !== undefined) return;
    const height = barHeight();
    const top = element.scrollTop;
    const delta = top - (lastTop ?? top);
    lastTop = top;
    const overflow = element.scrollHeight - element.clientHeight + (isHidden.value ? height : 0);
    if (overflow <= height + threshold || top <= threshold) {
      reveal();
      return;
    }
    if (delta === 0) return;
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    if (travel >= tolerance) setHidden(true);
    else if (travel <= -tolerance) reveal();
  }

  useEventListener('scroll', onScroll, region, { passive: true });
  useEventListener('focusin', () => reveal(), bar);
  watch(() => toValue(region), baseline, { immediate: true });
  watch(isEnabled, (enabled) => {
    if (enabled) baseline();
    else reveal();
  });
  onScopeDispose(() => {
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    settleTimer = undefined;
  });

  return { isHidden, reveal };
}
