<script lang="ts">
import type { Severity } from '../../../foundation/styles';

export interface AlertSimpleProps {
  /** The semantic severity palette. */
  readonly severity?: Severity;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { alertSimpleVariants } from './AlertSimple.variants';

/**
 * Renders a severity-tinted alert container around free-form children.
 * No internal slots; consumer composes title/description/actions inline.
 *
 * For the structured Icon + Title + Description + Actions composition use
 * the `Alert` molecule (L4).
 *
 * `role="status"` is the live-region contract; bound before `v-bind="rest"`
 * so a caller-supplied `role` (e.g. `"alert"`) still wins.
 */
defineOptions({ name: 'AlertSimple', inheritAttrs: false });

const props = defineProps<AlertSimpleProps>();

defineSlots<{
  /** The alert content. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(alertSimpleVariants({ severity: props.severity }), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" role="status" v-bind="rest" :class="classes"><slot /></div>
</template>
