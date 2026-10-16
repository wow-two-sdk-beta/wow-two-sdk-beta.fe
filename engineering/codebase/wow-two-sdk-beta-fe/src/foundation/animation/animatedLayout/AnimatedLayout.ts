// The multi-child FLIP: a container that animates its children to their new positions whenever their order or
// count changes. List reordering, filtering, sorting, drag-drop settle.
//
// AUTHORED AS `defineComponent` IN PLAIN TS, not as an SFC, because its whole job is vnode manipulation — it
// clones each slot child to stamp an identity attribute on it, which a template cannot express. Same shape as
// `foundation/primitives`' `Slot` / `Presence`.
//
// DELIBERATELY SMALL. It is `useFlip`'s loop, not a layout engine — no enter/exit choreography, no shared-element
// transitions, no spring physics. Children that mount or unmount simply appear/disappear at their final spot
// (`Presence` is the primitive for enter/exit); only the SURVIVING children are animated, which is precisely the
// case CSS cannot do at all.
//
// NON-OBVIOUS DECISIONS:
//
//  - IDENTITY COMES FROM `key`, NOT DOM ORDER. Order is the thing that changes, so a positional index cannot
//    identify a child across updates. Each child vnode is cloned with a `data-flip-key` carrying its Vue key,
//    and rects are stored in a `Map` under it. The cost: a child must let unknown attributes fall through to
//    its DOM node — intrinsic elements (`<li>`, `<div>`) do this for free, a component must keep the default
//    `inheritAttrs: true` and render a single root. An unkeyed child gets a positional key and so is not
//    tracked across a reorder; that is inherent (Vue cannot track it either), not a gap to fix here.
//
//  - THE TRIGGER IS `onUpdated`, NOT A WATCHER. The trigger is "the children rendered differently", which is
//    not expressible as a watch source — comparing children by value each update costs more than the two
//    `getBoundingClientRect` reads the hook does, and `playFlip` short-circuits when nothing moved. `onMounted`
//    and `onUpdated` both run after the patch and before paint, which is what FLIP requires.
//
//  - MEASURE ALL, THEN PLAY ALL. Two passes, not one interleaved loop: starting an animation on child 1 dirties
//    style state, so measuring child 2 afterwards would force a fresh layout recalc per child (layout thrash on
//    a long list).

import {
  cloneVNode,
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  onUpdated,
  ref,
  type PropType,
  type SlotsType,
  type StyleValue,
  type VNode,
} from 'vue';

import { useReducedMotion } from '../../device';

import type { AnimationHandle } from '../Animate';
import { measureRect, playFlip, type FlipOptions, type RectLike } from '../Flip';

/** The attribute carrying each child's Vue key onto its DOM node, so rects survive a reorder. */
const FlipKeyAttribute = 'data-flip-key';

/** Props for `AnimatedLayout`. */
export interface AnimatedLayoutProps extends FlipOptions {
  /** Whether layout animation is active. Defaults to `true`. */
  readonly isEnabled?: boolean;
  /** @deprecated Use `isEnabled`; this alias is removed next release. */
  readonly enabled?: boolean;

  /** Class for the container element. */
  readonly class?: unknown;

  /** Inline styles for the container element. */
  readonly style?: StyleValue;
}

/**
 * FLIP-animates its children to their new positions when the list reorders, filters, or resizes.
 *
 * Renders one plain `<div>` wrapper and clones each slot child with a `data-flip-key`; all layout (flex, grid,
 * list) stays with the consumer via `class` / `style`, which fall through as ordinary attributes.
 *
 * Under `prefers-reduced-motion` — or `:is-enabled="false"`, or an explicit `reducedMotion` — children jump
 * straight to their new positions with no transform applied and no residue left behind.
 */
export const AnimatedLayout = defineComponent({
  name: 'AnimatedLayout',

  props: {
    /** Whether layout animation is active. Defaults to `true`. */
    isEnabled: { type: Boolean, default: undefined },
    /** @deprecated Use `isEnabled`; this alias is removed next release. */
    enabled: { type: Boolean, default: undefined },
    /** Animation duration in milliseconds. Falls through to `playFlip`. */
    duration: { type: Number, default: undefined },
    /** Timing function. Falls through to `playFlip`. */
    easing: { type: String, default: undefined },
    /** Forces the reduced-motion branch either way, overriding the media query. */
    reducedMotion: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  },

  slots: Object as SlotsType<{ default?: () => VNode[] }>,

  setup(props, { slots }) {
    const container = ref<HTMLDivElement | null>(null);
    const rects = new Map<string, RectLike>();
    const prefersReducedMotion = useReducedMotion();

    let handles: AnimationHandle[] = [];

    function cancel(): void {
      for (const handle of handles) handle.cancel();
      handles = [];
    }

    function measureAndPlay(): void {
      const element = container.value;
      if (!element) return;

      cancel();

      // Pass 1 — measure every tracked child while layout is still clean.
      const measured: Array<{ element: Element; key: string; rect: RectLike }> = [];
      for (const child of Array.from(element.children)) {
        const key = child.getAttribute(FlipKeyAttribute);
        if (key === null) continue;
        const rect = measureRect(child);
        if (rect) measured.push({ element: child, key, rect });
      }

      const previous = new Map(rects);
      rects.clear();
      for (const { key, rect } of measured) rects.set(key, rect);

      if (!(props.isEnabled ?? props.enabled ?? true)) return;

      // Pass 2 — play. A child with no previous rect is new; it stays put at its final position.
      for (const { element: child, key } of measured) {
        const first = previous.get(key);
        if (!first) continue;
        handles.push(
          playFlip(child, first, {
            duration: props.duration,
            easing: props.easing,
            reducedMotion: props.reducedMotion ?? prefersReducedMotion.value,
          }),
        );
      }
    }

    // Both run after the patch and before paint — the two seams a FLIP can legally measure in.
    onMounted(measureAndPlay);
    onUpdated(measureAndPlay);
    onScopeDispose(cancel);

    return () => {
      const children = slots.default?.() ?? [];
      return h(
        'div',
        { ref: container },
        children.map((child, index) => cloneVNode(child, { [FlipKeyAttribute]: String(child.key ?? index) })),
      );
    };
  },
});
