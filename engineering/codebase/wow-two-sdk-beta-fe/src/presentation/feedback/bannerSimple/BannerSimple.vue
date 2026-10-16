<script lang="ts">
import type { Severity } from '../../../foundation/styles';

export interface BannerSimpleProps {
  /** The semantic severity palette. */
  readonly severity?: Severity;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { bannerSimpleVariants } from './BannerSimple.variants';

/**
 * Renders a full-width, severity-tinted banner that broadcasts app-level status.
 * Typically pinned to the top of the app. Atom; for structured slotted layout use `Banner` (L4).
 *
 * `role="status"` is the live-region contract; bound before `v-bind="rest"`
 * so a caller-supplied `role` still wins.
 */
defineOptions({ name: 'BannerSimple', inheritAttrs: false });

const props = defineProps<BannerSimpleProps>();

defineSlots<{
  /** The banner content. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(bannerSimpleVariants({ severity: props.severity }), attrs.class as string | undefined),
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
