import { cloneVNode, defineComponent, shallowRef, watch, type VNode } from 'vue';
import { renderableChildren } from '../slot/Slot';
import { resolveElement } from '../../dom/ResolveElement';

export interface PresenceProps {
  /** The presence flag — toggle false to trigger exit. */
  readonly isPresent: boolean;
}

function parseTimes(value: string): ReadonlyArray<number> {
  return value.split(',').map((part) => {
    const trimmed = part.trim();
    const ms = trimmed.endsWith('ms') ? parseFloat(trimmed) : parseFloat(trimmed) * 1000;
    return Number.isFinite(ms) ? ms : 0;
  });
}

/** Longest computed transition/animation (duration + delay) in ms. */
function getTotalDurationMs(node: HTMLElement): number {
  const cs = getComputedStyle(node);
  const maxOf = (durations: ReadonlyArray<number>, delays: ReadonlyArray<number>) =>
    durations.reduce((max, duration, i) => Math.max(max, duration + (delays[i % delays.length] ?? 0)), 0);
  return Math.max(
    maxOf(parseTimes(cs.transitionDuration), parseTimes(cs.transitionDelay)),
    maxOf(parseTimes(cs.animationDuration), parseTimes(cs.animationDelay)),
  );
}

/** A function ref may receive a component's public instance; the DOM node is what the timing logic needs. */
function toElement(value: unknown): HTMLElement | null {
  return resolveElement(value);
}

/**
 * The timeout that stands in for two frames where `requestAnimationFrame` never fires.
 *
 * ~2 frames at 60Hz. Long enough that rAF wins whenever the document is actually being
 * painted, short enough that the enter flip is not perceptibly late when it does not.
 */
const TwoFramesMs = 32;

/**
 * Runs `cb` after two animation frames, or after {@link TwoFramesMs}, whichever lands first.
 *
 * `requestAnimationFrame` does not fire at all while `document.hidden` — a background tab, a
 * prerendered page, an embedded webview. Gating on rAF alone left an overlay mounted stuck at
 * `data-state="closed"` on enter and, worse, never unmounted on exit: a full-viewport
 * `pointer-events: auto` layer over a page that looked idle. The timer is the floor under that.
 *
 * Returns a cancel function; whichever path fires first cancels the other, so `cb` runs once.
 */
function afterTwoFrames(cb: () => void): () => void {
  let settled = false;
  let raf1 = 0;
  let raf2 = 0;

  const clear = (): void => {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    }
    clearTimeout(timer);
  };

  const run = (): void => {
    if (settled) return;
    settled = true;
    clear();
    cb();
  };

  if (typeof requestAnimationFrame !== 'undefined') {
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(run);
    });
  }
  /* Declared after `clear` closes over it: both callers are async, so the binding is
     always initialised by the time either one reads it. */
  const timer = setTimeout(run, TwoFramesMs);

  return (): void => {
    settled = true;
    clear();
  };
}

/**
 * Defer unmount until the child's exit animation/transition finishes.
 * Pass `is-present="false"` to start the exit; the child stays mounted with
 * `data-state="closed"` until its own `animationend`/`transitionend` fires
 * (or a computed-duration timeout as a fallback). If no exit animation
 * actually starts, the child unmounts immediately. On enter, the child
 * mounts with `data-state="closed"` and flips to `"open"` on the next
 * frame so enter transitions play.
 *
 * Deliberately not Vue's `<Transition>`: this primitive drives unmount off the
 * child's *own* computed timing rather than off CSS class hooks, which is what
 * lets a consumer style the exit entirely in their own stylesheet.
 *
 * Both effects use `flush: 'post'`, the analogue of React's `useEffect` here —
 * the DOM node must exist before the timing window opens.
 *
 * Neither effect depends on `requestAnimationFrame` firing. Both go through
 * {@link afterTwoFrames}, and the exit additionally arms its unmount timer up front, so a
 * document that is never painted still enters and — the part that matters — still unmounts.
 */
export const Presence = defineComponent({
  name: 'Presence',
  props: {
    isPresent: { type: Boolean, required: true },
  },
  setup(props, { slots }) {
    const rendered = shallowRef(props.isPresent);
    const dataState = shallowRef<'open' | 'closed'>('closed');
    const node = shallowRef<HTMLElement | null>(null);

    const setNode = (value: unknown): void => {
      node.value = toElement(value);
    };

    // Enter — mount closed, then flip to open on the next frame (double rAF
    // so the closed styles are committed and painted first) to run transitions.
    watch(
      [() => props.isPresent, rendered, dataState],
      ([isPresent], _previous, onCleanup) => {
        if (!isPresent) return;
        if (!rendered.value) {
          rendered.value = true;
          return;
        }
        if (dataState.value === 'open') return;
        /* `immediate: true` makes this watcher run during SSR too (Vue skips only the
           non-immediate post-flush ones), and there is neither `requestAnimationFrame` nor a
           useful `setTimeout` on the server. Bail rather than throw: the server emits
           `data-state="closed"`, which is exactly what the client's first render produces, so
           hydration still matches and this same watcher runs the enter on the client. */
        if (typeof window === 'undefined') {
          return;
        }
        onCleanup(
          afterTwoFrames(() => {
            dataState.value = 'open';
          }),
        );
      },
      { immediate: true, flush: 'post' },
    );

    // Exit — flip to closed, then unmount when the child's own exit
    // animation/transition ends; immediately if none starts within a frame
    // window; or after the computed total duration as a safety net.
    watch(
      () => props.isPresent,
      (isPresent, _previous, onCleanup) => {
        if (isPresent) return;
        const el = node.value;
        if (!el) {
          rendered.value = false;
          return;
        }
        let started = false;
        const startedAt = performance.now();
        let duration = 0;
        const onStart = (event: Event) => {
          if (event.target === el) started = true;
        };
        const onEnd = (event: Event) => {
          if (event.target !== el) return;
          // One element may animate several properties; the first completed property does not end presence.
          if (el.getAnimations) {
            if (el.getAnimations().some((animation) => animation.playState === 'running' || animation.pending)) return;
          } else if (performance.now() - startedAt < duration) return;
          rendered.value = false;
        };
        el.addEventListener('animationstart', onStart);
        el.addEventListener('transitionrun', onStart);
        el.addEventListener('animationend', onEnd);
        el.addEventListener('transitionend', onEnd);
        // Flip the DOM synchronously so the start-detection window below is
        // deterministic; the next render settles on the same value.
        el.setAttribute('data-state', 'closed');
        dataState.value = 'closed';
        duration = getTotalDurationMs(el);

        /* Armed here, NOT inside the frame callback.
           This is the unmount guarantee: `animationend` does not fire for an animation that
           never started, and neither the frame callback nor the event listeners run at all in
           a document that is never painted. Previously this timer lived inside the inner rAF,
           so all three failure paths converged on "stays mounted forever" — a full-viewport
           `pointer-events: auto` scrim the user cannot click past. `getComputedStyle` recalcs
           synchronously, so reading the duration right after the flip already reflects the
           closed state's timing. */
        const safety = setTimeout(() => {
          rendered.value = false;
        }, duration + 100);

        /* The fast path — nothing is animating, so drop it now rather than wait out the
           safety timer. */
        const cancelFrames = afterTwoFrames(() => {
          const animating = started || (el.getAnimations?.().length ?? 0) > 0;
          if (!animating) rendered.value = false;
        });

        onCleanup(() => {
          el.removeEventListener('animationstart', onStart);
          el.removeEventListener('transitionrun', onStart);
          el.removeEventListener('animationend', onEnd);
          el.removeEventListener('transitionend', onEnd);
          cancelFrames();
          clearTimeout(safety);
        });
      },
      { immediate: true, flush: 'post' },
    );

    return (): VNode | null => {
      if (!rendered.value) return null;
      const child = renderableChildren(slots.default?.())[0];
      if (!child) return null;
      // `mergeRef` composes our tracking ref with any ref the consumer already
      // put on the child, the job React's `useComposedRefs` did here.
      return cloneVNode(child, { 'data-state': dataState.value, ref: setNode }, true);
    };
  },
});
