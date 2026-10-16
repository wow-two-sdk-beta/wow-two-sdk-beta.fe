<script lang="ts">
/** Defines the pointer-event behavior of a `BackdropOverlay` scrim. */
export const BackdropOverlayPointerEvents = {
  /** Refers to a scrim that intercepts pointer events. */
  Auto: 'auto',
  /** Refers to a scrim that lets clicks pass through. */
  None: 'none',
} as const;

export type BackdropOverlayPointerEvents =
  (typeof BackdropOverlayPointerEvents)[keyof typeof BackdropOverlayPointerEvents];

/**
 * The prop surface of `BackdropOverlay`.
 *
 * React's `isOpen` is spelled `isOpen` here, matching the house boolean prefix
 * (`isBlurred`, `isInline`); React's `className` / `style` are Vue's `class` /
 * `style` attrs and so are absent. Everything else keeps its React name.
 */
export interface BackdropOverlayProps {
  /** The mount state. Default `true`. */
  readonly isOpen?: boolean;

  /** The backdrop-blur toggle. */
  readonly isBlurred?: boolean;

  /** The pointer-event behavior; `'none'` lets clicks pass through. Default `'auto'`. */
  readonly pointerEvents?: BackdropOverlayPointerEvents;

  /** The in-place render toggle — skips the Portal wrap. */
  readonly isInline?: boolean;
}
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs } from 'vue';
import { cn } from '../../../foundation/styles';
import { Portal, Presence } from '../../../foundation/primitives';

/**
 * Renders a fixed-position scrim behind an overlay, optionally blurred and click-through.
 * Used by Modal / Drawer / BottomSheet / LoadingOverlay; also public for custom surfaces.
 */
defineOptions({ name: 'BackdropOverlay', inheritAttrs: false });

/** Scrim content — React's `children`; a scrim is normally empty. */
defineSlots<{ default?(): unknown }>();

/**
 * `isOpen` carries a real `true` default (React's `isOpen = true`), unlike the
 * controlled overlays where the absent-vs-`false` distinction is load-bearing:
 * a `BackdropOverlay` has no uncontrolled mode to fall back to.
 */
const props = withDefaults(defineProps<BackdropOverlayProps>(), {
  isOpen: true,
  isBlurred: false,
  pointerEvents: 'auto',
  isInline: false,
});

const attrs = useAttrs();

// `data-state` is injected by <Presence>; the fade tokens are gated on it so
// enter plays on mount and exit plays before Presence defers the unmount.
const classes = computed(() =>
  cn(
    'ui-backdrop-overlay fixed inset-0 z-overlay bg-black/50',
    'motion-safe:data-[state=open]:animate-(--animate-fade-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-fade-out)',
    props.isBlurred && 'ui-backdrop-overlay-blurred backdrop-blur-sm',
    attrs.class as string | undefined,
  ),
);

/** `pointerEvents` is normalized first so a caller's `style` still wins — React's `{ pointerEvents, ...style }`. */
const inlineStyle = computed(() => normalizeStyle([{ pointerEvents: props.pointerEvents }, attrs.style]));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});
</script>

<template>
  <!-- Two branches rather than a conditional wrapper: Vue has no `isInline ? node : <Portal>{node}</Portal>`. -->
  <Portal v-if="!props.isInline">
    <Presence :is-present="props.isOpen">
      <div v-bind="rest" :style="inlineStyle" :class="classes"><slot /></div>
    </Presence>
  </Portal>

  <Presence v-else :is-present="props.isOpen">
    <div v-bind="rest" :style="inlineStyle" :class="classes"><slot /></div>
  </Presence>
</template>
