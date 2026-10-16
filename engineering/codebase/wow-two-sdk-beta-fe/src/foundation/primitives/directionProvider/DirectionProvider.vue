<script lang="ts">
import type { Direction } from './DirectionContext';

export interface DirectionProviderProps {
  readonly dir: Direction;
}
</script>

<script setup lang="ts">
import { provideDirection } from './DirectionContext';

/**
 * Renders no element of its own — the slot passes straight through — while providing reading direction to
 * descendants. Components that mirror in RTL (Tabs arrow keys, Slider, Carousel, etc.) read this via
 * `useDirection()`.
 */
defineOptions({ name: 'DirectionProvider' });

const props = defineProps<DirectionProviderProps>();

defineSlots<{
  /** The subtree that reads the provided reading direction. */
  default(): unknown;
}>();

provideDirection(() => props.dir);
</script>

<template>
  <slot />
</template>
