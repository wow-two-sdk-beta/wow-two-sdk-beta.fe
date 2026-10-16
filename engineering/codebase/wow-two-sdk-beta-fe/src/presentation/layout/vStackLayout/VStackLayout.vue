<script lang="ts">
import type { StackLayoutProps } from '../stackLayout/StackLayout.vue';

export type VStackLayoutProps = Omit<StackLayoutProps, 'direction'>;
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import StackLayout from '../stackLayout/StackLayout.vue';

/** Renders a `StackLayout` locked to `direction="column"` (its default). Provided for symmetry with `HStackLayout`. */
defineOptions({ name: 'VStackLayout', inheritAttrs: false });

defineSlots<{
  /** The children laid out top to bottom. */
  default?(): unknown;
}>();

/** See `HStackLayout` — every `StackLayoutProps` key falls through `$attrs` onto the inner `StackLayout`. */
const inner = useTemplateRef<InstanceType<typeof StackLayout>>('inner');

/** The inner `StackLayout`'s root element — the React original's forwarded ref. */
const el = computed(() => inner.value?.el ?? null);

defineExpose({ el });
</script>

<template>
  <StackLayout ref="inner" direction="column" v-bind="$attrs"><slot /></StackLayout>
</template>
