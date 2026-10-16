<script lang="ts">
import type { SpinnerProps } from '../spinner/Spinner.vue';

export interface InlineSpinnerProps {
  readonly size?: SpinnerProps['size'];
  readonly tone?: SpinnerProps['tone'];
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import Spinner from '../spinner/Spinner.vue';

const locale = useLocale();

/**
 * Renders a spinner beside a label on one line, for buttons, list rows, and mid-flow waits.
 *
 * React's `children` (default `"Loading…"`) becomes the default slot with the
 * same fallback content.
 */
defineOptions({ name: 'InlineSpinner', inheritAttrs: false });

const props = withDefaults(defineProps<InlineSpinnerProps>(), { size: 'sm', tone: 'default' });

defineSlots<{
  /** The label beside the spinner. Falls back to `Loading…`. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const classes = computed(() =>
  cn('inline-flex items-center gap-2 text-sm text-muted-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <Spinner :size="props.size" :tone="props.tone" />
    <slot>{{ locale.t('InlineSpinner.loading', undefined, 'Loading…') }}</slot>
  </span>
</template>
