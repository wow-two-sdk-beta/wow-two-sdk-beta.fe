<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface LoadingStateProps {
  /** The heading copy. Default `"Loading…"`. Rich content → the `title` slot. */
  readonly title?: string;

  /** The body text below the title. Rich content → the `description` slot. */
  readonly description?: string;

  /** The size of the spinner. Default `lg`. */
  readonly size?: Size;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, Size as SizeToken } from '../../../foundation/styles';
import Spinner from '../spinner/Spinner.vue';

/**
 * Renders a centered spinner, title, and description filling a whole section or page.
 * Use `InlineSpinner` for in-row loading.
 *
 * `role="status"` is the live-region contract; bound before `v-bind="rest"`
 * so a caller-supplied `role` still wins.
 */
defineOptions({ name: 'LoadingState', inheritAttrs: false });

const componentProps = withDefaults(defineProps<LoadingStateProps>(), {
  size: SizeToken.Lg,
});
const props = useLocaleDefaults(componentProps, 'LoadingState', { title: 'Loading…' });

defineSlots<{
  /** The heading line under the spinner. Falls back to the `title` prop. */
  title?(): unknown;
  /** The body text under the title. Falls back to the `description` prop. */
  description?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

const hasTitle = computed(() => Boolean(props.title) || Boolean(slots.title));
const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

const classes = computed(() =>
  cn('flex flex-col items-center justify-center gap-3 py-12 text-center', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" role="status" v-bind="rest" :class="classes">
    <Spinner :size="props.size" tone="brand" />
    <div v-if="hasTitle" class="text-sm font-medium text-foreground">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div v-if="hasDescription" class="text-sm text-muted-foreground">
      <slot name="description">{{ props.description }}</slot>
    </div>
  </div>
</template>
