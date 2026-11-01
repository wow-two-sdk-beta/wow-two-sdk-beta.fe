// A content swap that never jumps: the old content fades out, the box animates its height to the new content's
// height, and the new content fades in. Between swaps the box follows its content's own height changes.
//
// AUTHORED AS `defineComponent` IN PLAIN TS, like `Presence`: the whole job is a render function around Vue's
// `<Transition>` and imperative motion on two wrapper elements.
//
// NON-OBVIOUS DECISIONS:
//
//  - VUE'S `<Transition mode="out-in">` OWNS THE SWAP. It keeps the leaving child mounted until its leave hook
//    calls `done`, waits for it before rendering the newest child, and cancels an entering child that a newer swap
//    replaces. This component only supplies JS hooks (`css: false`); it never retains a vnode of its own.
//
//  - THE WRAPPERS ANIMATE, NEVER THE CONTENT. The fades run on the inner wrapper and the height on the outer box,
//    so a child's own inline styles and root shape are untouched. The inner wrapper is `display: flow-root`, so a
//    child's margins stay inside the measured height in every phase.
//
//  - COMMIT THE END, ANIMATE FROM THE START. Each phase writes its final value inline and runs a `fill: 'none'`
//    WAAPI animation from the current value (`foundation/animation` `animate`), so a cancelled or finished phase
//    always leaves the committed value behind. A swap that interrupts another reads the height and opacity on
//    screen first, so it continues from where the previous motion stood.
//
//  - A TIMER FLOOR UNDER EVERY PHASE. A hidden document runs no animation frames, so a WAAPI `finish` may never
//    arrive while a tab is in the background; out-in would then never render the new content. Each phase settles
//    on its animation or on a timer past its duration, whichever lands first.

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  Transition,
  type SlotsType,
  type StyleValue,
  type VNode,
} from 'vue';

import { animate, AnimationDefaults, type AnimationHandle } from '../../animation';
import { useReducedMotion } from '../../device';
import { FocusTargetAttribute, focusTarget } from '../../dom';

/** Present on the box while a swap runs — from the old content's fade-out to the new content's fade-in. */
export const SwapTransitionAttribute = 'data-swapping';

/** The default length of each fade, in milliseconds. */
const FadeDurationMs = 120;

/** How long past its duration a phase waits for its animation before settling on a timer instead. */
const SettleSlackMs = 250;

/** Keeps a child's margins inside the measured content box in every phase. */
const ContentStyle: StyleValue = { display: 'flow-root' };

/** Props for `SwapTransition`. */
export interface SwapTransitionProps {
  /** Whether swaps and height changes animate. Defaults to `true`; `false` swaps instantly. */
  readonly isEnabled?: boolean;
  /** The height phase in milliseconds. Defaults to `200`. */
  readonly duration?: number;
  /** Each fade phase in milliseconds. Defaults to `120`. */
  readonly fadeDuration?: number;
  /** The easing curve of every phase. Defaults to the house ease-out curve. */
  readonly easing?: string;
}

/** Settles when `handle` finishes, or `ms` plus a slack later when no animation frame runs (a hidden document). */
function settle(handle: AnimationHandle, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      handle.finish();
      resolve();
    }, ms + SettleSlackMs);
    void handle.finished.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Swaps its content with a fade and a height animation: on a change of the single child's key or type, the old
 * content fades out, the box animates to the new content's height, and the new content fades in. While shown, the box
 * follows its content's own height changes the same way. The first render, `:is-enabled="false"` and
 * `prefers-reduced-motion` swap and resize instantly.
 *
 * Renders a `div` box (caller `class`, `style` and attributes fall through to it) around a `flow-root` content
 * wrapper. The leaving content is `inert`; focus inside it moves to the box as a programmatic focus target, so it
 * never falls back to the document body.
 */
export const SwapTransition = defineComponent({
  name: 'SwapTransition',

  props: {
    /** Whether swaps and height changes animate. Defaults to `true`. */
    isEnabled: { type: Boolean, default: undefined },
    /** The height phase in milliseconds. Defaults to `200`. */
    duration: { type: Number, default: undefined },
    /** Each fade phase in milliseconds. Defaults to `120`. */
    fadeDuration: { type: Number, default: undefined },
    /** The easing curve of every phase. Defaults to the house ease-out curve. */
    easing: { type: String, default: undefined },
  },

  slots: Object as SlotsType<{ default?: () => VNode[] }>,

  setup(props, { slots }) {
    const box = shallowRef<HTMLElement | null>(null);
    const content = shallowRef<HTMLElement | null>(null);
    const prefersReducedMotion = useReducedMotion();

    let phase = 0;
    let handle: AnimationHandle | null = null;
    let isSwapping = false;
    let isEntering = false;
    let isFollowing = false;
    let isDisposed = false;
    let lastHeight: number | null = null;
    let observer: ResizeObserver | null = null;

    const heightDuration = (): number => props.duration ?? AnimationDefaults.duration;
    const fadeDuration = (): number => props.fadeDuration ?? FadeDurationMs;
    const isAnimated = (): boolean =>
      (props.isEnabled ?? true) && !prefersReducedMotion.value && document.visibilityState !== 'hidden';

    /** Cancels the running phase; its continuation sees a newer `phase` and stops. */
    function stop(): void {
      phase += 1;
      handle?.cancel();
      handle = null;
    }

    /** Runs one phase; resolves `true` when it ran to its end, `false` when a newer phase or unmount replaced it. */
    async function play(element: HTMLElement, keyframes: Keyframe[], duration: number): Promise<boolean> {
      stop();
      const token = phase;
      const current = animate(element, keyframes, { duration, easing: props.easing });
      handle = current;
      await settle(current, duration);
      if (token !== phase || isDisposed) return false;
      handle = null;
      return true;
    }

    /** Animates the box from the height on screen to `to`, committing `to` first. */
    async function resizeTo(boxElement: HTMLElement, to: number): Promise<boolean> {
      const from = boxElement.getBoundingClientRect().height;
      boxElement.style.height = `${to}px`;
      if (from === to) return true;
      return play(boxElement, [{ height: `${from}px` }, { height: `${to}px` }], heightDuration());
    }

    /** Holds the box at the height on screen, stopping whatever motion ran, for the swap that starts now. */
    function pin(boxElement: HTMLElement): void {
      const height = boxElement.getBoundingClientRect().height;
      stop();
      isFollowing = false;
      isSwapping = true;
      boxElement.setAttribute(SwapTransitionAttribute, '');
      boxElement.style.height = `${height}px`;
      boxElement.style.overflow = 'hidden';
    }

    /** Hands the box back to its content: auto height, visible overflow, full opacity. */
    function release(): void {
      isSwapping = false;
      isFollowing = false;
      const boxElement = box.value;
      if (boxElement) {
        boxElement.style.height = '';
        boxElement.style.overflow = '';
        boxElement.removeAttribute(SwapTransitionAttribute);
      }
      const inner = content.value;
      if (inner) {
        inner.style.opacity = '';
        inner.inert = false;
        lastHeight = inner.getBoundingClientRect().height;
      }
    }

    /** Moves focus held inside the leaving content to the box, removing the box's focus target marks on blur. */
    function parkFocus(boxElement: HTMLElement, inner: HTMLElement): void {
      const active = boxElement.ownerDocument.activeElement;
      if (!active || !inner.contains(active)) return;
      const hadTabIndex = boxElement.hasAttribute('tabindex');
      const hadMarker = boxElement.hasAttribute(FocusTargetAttribute);
      if (!focusTarget(boxElement)) return;
      boxElement.addEventListener(
        'blur',
        () => {
          if (!hadTabIndex) boxElement.removeAttribute('tabindex');
          if (!hadMarker) boxElement.removeAttribute(FocusTargetAttribute);
        },
        { once: true },
      );
    }

    function onBeforeLeave(): void {
      const boxElement = box.value;
      const inner = content.value;
      if (!boxElement || !inner) return;
      parkFocus(boxElement, inner);
      if (!isAnimated()) return;
      // A swap that cancels an entering one fades out from the opacity on screen.
      const opacity = getComputedStyle(inner).opacity;
      pin(boxElement);
      inner.style.opacity = opacity;
      inner.inert = true;
    }

    function onLeave(_element: Element, done: () => void): void {
      const inner = content.value;
      if (!inner || !isSwapping) {
        // Out-in renders the next child from `done`; called inside this patch, it would patch over a placeholder
        // that is not mounted yet. A microtask later the patch is over and nothing has painted.
        queueMicrotask(done);
        return;
      }
      const from = inner.style.opacity || '1';
      inner.style.opacity = '0';
      // Content still transparent (a swap that cancels one mid-height) has nothing to fade.
      if (Number(from) === 0) {
        queueMicrotask(done);
        return;
      }
      // Always finish the leave: out-in renders nothing new until `done` runs.
      void play(inner, [{ opacity: from }, { opacity: '0' }], fadeDuration()).then(() => {
        if (!isDisposed) done();
      });
    }

    function onAfterLeave(): void {
      const boxElement = box.value;
      const inner = content.value;
      if (inner) inner.inert = false;
      // Out-in mounts the next child before this hook runs; none (a `v-if` turned false) settles on empty content.
      if (!boxElement || !inner || !isSwapping || isEntering) return;
      void resizeTo(boxElement, inner.getBoundingClientRect().height).then((isComplete) => {
        if (isComplete) release();
      });
    }

    function onBeforeEnter(): void {
      isEntering = true;
      const boxElement = box.value;
      const inner = content.value;
      if (!boxElement || !inner) return;
      inner.inert = false;
      if (!isAnimated()) {
        if (isSwapping) {
          stop();
          release();
        }
        return;
      }
      pin(boxElement);
      inner.style.opacity = '0';
    }

    function onEnter(_element: Element, done: () => void): void {
      const boxElement = box.value;
      const inner = content.value;
      if (!boxElement || !inner || !isSwapping) {
        done();
        return;
      }
      void (async () => {
        if (!(await resizeTo(boxElement, inner.getBoundingClientRect().height))) return;
        inner.style.opacity = '';
        if (!(await play(inner, [{ opacity: '0' }, { opacity: '1' }], fadeDuration()))) return;
        done();
      })();
    }

    function onAfterEnter(): void {
      isEntering = false;
      release();
    }

    function onEnterCancelled(): void {
      // The leave hooks that follow read the height and opacity on screen before stopping this motion.
      isEntering = false;
    }

    /** Between swaps, animates the box from the content's previous height to its new one. */
    function onResize(): void {
      const boxElement = box.value;
      const inner = content.value;
      if (!boxElement || !inner) return;
      const height = inner.getBoundingClientRect().height;
      const previous = lastHeight;
      lastHeight = height;
      if (isSwapping || previous === null || previous === height || !isAnimated()) return;
      // Idle, the auto-height box already shows the new height; a running follow shows its own frame.
      const from = isFollowing ? boxElement.getBoundingClientRect().height : previous;
      stop();
      isFollowing = true;
      boxElement.style.height = `${height}px`;
      boxElement.style.overflow = 'hidden';
      void play(boxElement, [{ height: `${from}px` }, { height: `${height}px` }], heightDuration()).then(
        (isComplete) => {
          if (isComplete && !isSwapping) release();
        },
      );
    }

    // `onMounted` never runs on the server: the observer and every measurement stay client-side.
    onMounted(() => {
      const inner = content.value;
      if (!inner || typeof ResizeObserver === 'undefined') return;
      lastHeight = inner.getBoundingClientRect().height;
      observer = new ResizeObserver(onResize);
      observer.observe(inner);
    });

    onBeforeUnmount(() => {
      isDisposed = true;
      stop();
      observer?.disconnect();
      observer = null;
    });

    return () =>
      h('div', { ref: box }, [
        h('div', { ref: content, style: ContentStyle }, [
          h(
            Transition,
            {
              mode: 'out-in',
              css: false,
              onBeforeLeave,
              onLeave,
              onAfterLeave,
              onBeforeEnter,
              onEnter,
              onAfterEnter,
              onEnterCancelled,
            },
            () => slots.default?.(),
          ),
        ]),
      ]);
  },
});
