// The Vue binding for FLIP: snapshot geometry across an update, animate the difference.
//
// WHY `flush: 'post'` AND NOT A DEFAULT WATCHER — this is the whole reason the composable exists:
//
//   A pre-flush watcher runs BEFORE Vue patches the DOM, so a rect measured there is the OLD box and the FLIP
//   has nothing to invert. A `flush: 'post'` watcher runs after the patch but still inside the same tick, so
//   the invert lands in the same frame as the layout change and the first thing the user sees is the
//   animation's first frame. This is the exact counterpart of the original's `useLayoutEffect`: post-commit,
//   pre-paint. There is no correct pre-flush version of this composable.
//
// HOW THE SNAPSHOT SURVIVES THE UPDATE: there is no "before the change" callback. Instead the composable
// measures at the END of every run and keeps that rect in a closure variable. On the next `deps` change the
// variable still holds the PREVIOUS commit's geometry — that is "First" — and a fresh measurement is "Last".
// So the snapshot is always one commit old by construction, which is exactly what FLIP wants.
//
// `onMounted` SEEDS THE FIRST SNAPSHOT and animates nothing: a mount is an enter transition, which is
// `foundation/primitives`' `Presence`, not this slice. It is also why nothing here runs in an immediate
// watcher — `measureRect` reads the element's box, and there is no element on the server.
//
// Reduced motion is read here (`useReducedMotion`) rather than inside `playFlip`, keeping the pure layer
// Vue-free. An explicit `reducedMotion` option still wins, so a consumer can force either behaviour.

import { onMounted, onScopeDispose, toValue, watch, type MaybeRefOrGetter, type WatchSource } from 'vue';

import { useReducedMotion } from '../device';

import type { AnimationHandle } from './Animate';
import { measureRect, playFlip, type FlipOptions, type RectLike } from './Flip';

/** Tunes a `useFlip` binding. Same knobs as `playFlip`, plus an on/off switch for the whole binding. */
export interface UseFlipOptions extends FlipOptions {
  /** Whether the binding animates at all. `false` still keeps the snapshot current. Defaults to `true`. */
  readonly enabled?: boolean;
}

/**
 * FLIP-animates a single element across a layout-affecting change.
 *
 * Pass the sources that cause the change (the sort key, the collapsed flag, the filter). On every change the
 * composable animates the element from where it was in the previous commit to where it is now, before the
 * browser paints.
 *
 * Takes the element as a ref or getter rather than handing one back, so a `useTemplateRef` drops straight in.
 * SSR-safe: nothing is measured until `onMounted`.
 *
 * @param target The element whose layout changes.
 * @param deps The watch source(s) whose change signals "the layout just moved".
 * @param options Duration, easing, the reduced-motion override, and `enabled`. Read at play time.
 */
export function useFlip<T extends Element = HTMLElement>(
  target: MaybeRefOrGetter<T | null | undefined>,
  deps: WatchSource | ReadonlyArray<WatchSource>,
  options: MaybeRefOrGetter<UseFlipOptions> = {},
): void {
  const prefersReducedMotion = useReducedMotion();

  let previousRect: RectLike | null = null;
  let handle: AnimationHandle | null = null;

  function cancel(): void {
    handle?.cancel();
    handle = null;
  }

  function snapshotAndPlay(): void {
    const element = toValue(target);
    if (!element) return;

    cancel();

    // Measure BEFORE playing: `playFlip` re-reads the same (still-clean) layout, and doing it in this order
    // means the stored snapshot is the element's real post-change box, never a transformed one.
    const last = measureRect(element);
    const first = previousRect;
    previousRect = last;

    const { enabled = true, reducedMotion, ...flip } = toValue(options);
    if (!enabled || !first) return;

    handle = playFlip(element, first, {
      ...flip,
      reducedMotion: reducedMotion ?? prefersReducedMotion.value,
    });
  }

  // Seeds the first snapshot without animating — and keeps every DOM read off the server.
  onMounted(snapshotAndPlay);
  // `deps` is the consumer's own list: it names the state whose change moves the element. `target` and the
  // options are read through `toValue` precisely so they cannot (and must not) widen it.
  watch(deps as WatchSource | WatchSource[], snapshotAndPlay, { flush: 'post' });
  onScopeDispose(cancel);
}
