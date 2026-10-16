<script lang="ts">
import type { ToggleGroupProps } from '../toggleGroup';

export type SegmentedPickerProps<T extends string = string> = Omit<ToggleGroupProps<T>, 'variant'>;
</script>

<script setup lang="ts" generic="T extends string = string">
import ToggleGroup from '../toggleGroup/ToggleGroup.vue';
import { ToggleGroupVariant } from '../toggleGroup';

/**
 * Renders an iOS-style connected pill row of mutually exclusive options.
 *
 * @deprecated Use `ToggleGroup variant="segmented"` — this is now a thin alias that
 * forwards to it. Kept for back-compat; will be removed in a future beta.
 */
defineOptions({ name: 'SegmentedPicker' });

/* Explicit `undefined` defaults keep Vue's boolean casting from turning these absent props into
   `false` — they are forwarded verbatim, so `false` would override `ToggleGroup`'s own
   defaults instead of deferring to them. */
const props = withDefaults(defineProps<SegmentedPickerProps<T>>(), {
  isAttached: undefined,
  equalWidth: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks a different segment — forwarded verbatim from `ToggleGroup`. */
  'update:modelValue': [value: T | null | ReadonlyArray<string>];
}>();

defineSlots<{
  /** The `ToggleInput` segments, forwarded verbatim to `ToggleGroup`. */
  default(): unknown;
}>();
</script>

<template>
  <ToggleGroup
    v-bind="props"
    :variant="ToggleGroupVariant.Segmented"
    @update:modelValue="(value: T | null | ReadonlyArray<string>) => emit('update:modelValue', value)"
  >
    <slot />
  </ToggleGroup>
</template>
