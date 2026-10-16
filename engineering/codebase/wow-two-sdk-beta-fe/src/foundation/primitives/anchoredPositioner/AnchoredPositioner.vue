<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { HTMLAttributes } from 'vue';

export interface AnchoredPositionerProps extends /* @vue-ignore */ HTMLAttributes {
  /** The element the floating layer should be anchored to. */
  readonly anchor: HTMLElement | null;

  /** The Floating UI placement. Default `bottom`. */
  readonly placement?: Placement;

  /** The distance between anchor and floating element in px. Default 8. */
  readonly offset?: number;

  /** The open flag — renders the floating element only when open. */
  readonly isOpen?: boolean;
}
</script>

<script setup lang="ts">
import {
  autoUpdate,
  flip,
  offset as offsetMiddleware,
  shift,
  size as sizeMiddleware,
  useFloating,
} from '@floating-ui/vue';
import { computed, useAttrs, useTemplateRef, type CSSProperties } from 'vue';

/**
 * Renders the slot inside a floating element positioned against an anchor via
 * Floating UI. Auto-flips and shifts to stay in viewport. Use as the positioning
 * surface for Tooltip, Popover, Menu, HoverCard.
 *
 * Exposes the anchor's measured size as CSS variables on the floating
 * element, enabling consumers to size content relative to the trigger:
 *
 *     style="--anchor-width: 240px; --anchor-height: 36px;"
 *
 * Common pattern: `min-w-[var(--anchor-width)]` on a Select dropdown so
 * the panel never narrows below the trigger.
 *
 * `@floating-ui/vue` takes the reference and floating elements as refs rather
 * than React's `refs.setFloating` callback; the middleware list and
 * `autoUpdate` are the same core API as `@floating-ui/react`.
 */
defineOptions({ name: 'AnchoredPositioner', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    anchor: HTMLElement | null;
    placement?: Placement;
    offset?: number;
    isOpen?: boolean;
  }>(),
  { placement: 'bottom', offset: 8, isOpen: true },
);

defineSlots<{
  /** The floating content positioned against the anchor. */
  default(): unknown;
}>();

const attrs = useAttrs();
const floating = useTemplateRef<HTMLDivElement>('floating');
/** A `computed` satisfies Floating UI's `Readonly<Ref<…>>` reference parameter. */
const reference = computed(() => props.anchor);

const { floatingStyles } = useFloating(reference, floating, {
  open: () => props.isOpen,
  placement: () => props.placement,
  middleware: computed(() => [
    offsetMiddleware(props.offset),
    flip(),
    shift({ padding: 8 }),
    sizeMiddleware({
      apply({ rects, elements }) {
        elements.floating.style.setProperty('--anchor-width', `${rects.reference.width}px`);
        elements.floating.style.setProperty('--anchor-height', `${rects.reference.height}px`);
      },
    }),
  ]),
  whileElementsMounted: autoUpdate,
});

const rest = computed(() => {
  const { style: _style, ...others } = attrs;
  return others;
});

/** The caller's inline style lands last, so it wins over the computed position. */
const styles = computed(() => [floatingStyles.value, attrs.style as CSSProperties | undefined]);

defineExpose({ el: floating });
</script>

<template>
  <div v-if="props.isOpen" ref="floating" v-bind="rest" :style="styles"><slot /></div>
</template>
