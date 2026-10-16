<script lang="ts">
/** The prop surface of `PopoverArrow` — the `OverlayArrow` primitive's, unchanged. */
export interface PopoverArrowProps {
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

/** Renders a tip arrow tinted to the popover surface; pair with Floating UI's `arrow()` to place it. */
defineOptions({ name: 'PopoverArrow', inheritAttrs: false });

const props = defineProps<PopoverArrowProps>();

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
