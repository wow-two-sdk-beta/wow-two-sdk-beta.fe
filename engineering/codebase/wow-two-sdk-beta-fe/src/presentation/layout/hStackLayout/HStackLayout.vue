<script lang="ts">
import type { StackLayoutProps } from '../stackLayout/StackLayout.vue';

export type HStackLayoutProps = Omit<StackLayoutProps, 'direction'>;
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import StackLayout from '../stackLayout/StackLayout.vue';

/** Renders a `StackLayout` locked to `direction="row"` — children laid out left to right. */
defineOptions({ name: 'HStackLayout', inheritAttrs: false });

defineSlots<{
  /** The children laid out left to right. */
  default?(): unknown;
}>();

/**
 * No `defineProps` — every `StackLayoutProps` key falls through `$attrs` onto the
 * inner `StackLayout`, which already declares them. `v-bind="$attrs"` sits after
 * `direction` for the same reason React spread `{...props}` after it: the
 * spread wins, and `HStackLayoutProps` types `direction` away.
 */
const inner = useTemplateRef<InstanceType<typeof StackLayout>>('inner');

/** The inner `StackLayout`'s root element — the React original's forwarded ref. */
const el = computed(() => inner.value?.el ?? null);

defineExpose({ el });
</script>

<template>
  <StackLayout ref="inner" direction="row" v-bind="$attrs"><slot /></StackLayout>
</template>
