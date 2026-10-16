<script lang="ts">
import type { Size } from '../../../foundation/styles';
import type { SpinnerTone } from './Spinner.variants';

export interface SpinnerProps {
  /** The diameter step. */
  readonly size?: Size;
  /** The color tone. */
  readonly tone?: SpinnerTone;
  /** The accessible label. Default `"Loading"`. */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { spinnerVariants } from './Spinner.variants';

/**
 * Renders an indeterminate spinning circle plus a visually hidden label for screen readers.
 *
 * Distinct from `foundation/icons`' `Spinner`: that one is an em-sized SVG
 * glyph, this one is the bordered circle with its own `size` / `tone` scale.
 *
 * `role="status"` is bound before `v-bind="rest"` so a caller-supplied `role`
 * still wins — the React original's `role = 'status'` destructured default.
 */
defineOptions({ name: 'Spinner', inheritAttrs: false });

const componentProps = withDefaults(defineProps<SpinnerProps>(), {});
const props = useLocaleDefaults(componentProps, 'Spinner', { label: 'Loading' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

/** The caller's `class` lands on the spinning circle, not the outer wrapper — as in React. */
const classes = computed(() =>
  cn(spinnerVariants({ size: props.size, tone: props.tone }), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied to the inner circle above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" role="status" v-bind="rest">
    <span :class="classes" />
    <span class="sr-only">{{ props.label }}</span>
  </span>
</template>
