<script lang="ts">
/** The prop surface of `HoverCardArrow` — the `OverlayArrow` primitive's, unchanged. */
export interface HoverCardArrowProps {
  /** The arrow width in px. Default 12. */
  readonly width?: number;

  /** The arrow height in px. Default 6. */
  readonly height?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '../../../foundation/styles';
import { OverlayArrow } from '../../../foundation/primitives';

/** Renders a tip arrow tinted to the card surface; pair with Floating UI's `arrow()` to position it. */
defineOptions({ name: 'HoverCardArrow', inheritAttrs: false });

const props = defineProps<HoverCardArrowProps>();

const attrs = useAttrs();

const classes = computed(() => cn('text-popover', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <OverlayArrow :width="props.width" :height="props.height" v-bind="rest" :class="classes" />
</template>
