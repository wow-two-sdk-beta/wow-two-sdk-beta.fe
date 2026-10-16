<script lang="ts">
/** Defines the InfoRow layout. */
export const InfoRowLayout = {
  /** Refers to label-value on one line. */
  Inline: 'inline',
  /** Refers to value stacked below its label. */
  Stacked: 'stacked',
} as const;

export type InfoRowLayout = (typeof InfoRowLayout)[keyof typeof InfoRowLayout];

export interface InfoRowProps {
  /**
   * The label copy. React typed this as a required `ReactNode`; here the scalar
   * form is the prop and the same-named slot is the rich override, so it is
   * optional — a consumer filling `#label` need not also pass the prop.
   */
  readonly label?: string | number;

  /** The value copy. Optional for the same reason as `label`. */
  readonly value?: string | number;

  /** The layout: `inline` puts label-value on one line; `stacked` puts value below. Default `inline`. */
  readonly layout?: InfoRowLayout;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders one label-value row with an optional leading icon.
 *
 * Reach for this at one or two pairs, e.g. inside a card row; use `DescriptionGroup` for many.
 */
defineOptions({ name: 'InfoRow', inheritAttrs: false });

defineSlots<{
  /** The optional icon rendered before the label. */
  icon?(): unknown;

  /** The rich override for the `label` prop. */
  label?(): unknown;

  /** The rich override for the `value` prop. */
  value?(): unknown;
}>();

const props = withDefaults(defineProps<InfoRowProps>(), { layout: InfoRowLayout.Inline });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'flex text-sm',
    props.layout === InfoRowLayout.Inline ? 'items-center justify-between gap-3' : 'flex-col gap-0.5',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <span class="inline-flex items-center gap-1.5 text-muted-foreground">
      <slot name="icon" />
      <slot name="label">{{ props.label }}</slot>
    </span>
    <span class="text-foreground">
      <slot name="value">{{ props.value }}</slot>
    </span>
  </div>
</template>
