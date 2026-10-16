<script lang="ts">
/**
 * Defines the cross-axis alignment of `InlineLayout` children. Diverges from the shared
 * `Align` (adds `Baseline`), so it stays a local enum.
 */
export const InlineLayoutAlign = {
  /** Refers to alignment at the cross-axis start. */
  Start: 'start',
  /** Refers to centered cross-axis alignment. */
  Center: 'center',
  /** Refers to alignment at the cross-axis end. */
  End: 'end',
  /** Refers to baseline alignment of children. */
  Baseline: 'baseline',
} as const;

export type InlineLayoutAlign = (typeof InlineLayoutAlign)[keyof typeof InlineLayoutAlign];

export interface InlineLayoutProps {
  /** The gap between children (Tailwind spacing). Default `2`. */
  readonly gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8';

  /** The vertical alignment. Default `center`. */
  readonly align?: InlineLayoutAlign;

  /**
   * The child wrapping onto multiple lines. Default `true` (`flex-wrap`).
   * Set `false` (`flex-nowrap`) for tight single-line rows that should truncate.
   */
  readonly canWrap?: boolean;
  /** @deprecated Use `canWrap`; this alias is removed next release. */
  readonly wrap?: boolean;
}

const GapClass: Record<NonNullable<InlineLayoutProps['gap']>, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
};
const AlignClass: Record<NonNullable<InlineLayoutProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a wrapping horizontal row with a consistent gap. Use for chips/tag rows,
 * inline button groups, breadcrumb-like sequences.
 */
defineOptions({ name: 'InlineLayout', inheritAttrs: false });

const props = withDefaults(defineProps<InlineLayoutProps>(), {
  gap: '2',
  align: InlineLayoutAlign.Center,
  canWrap: undefined,
  wrap: undefined,
});

defineSlots<{
  /** The items laid out in the wrapping row. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'flex',
    (props.canWrap ?? props.wrap ?? true) ? 'flex-wrap' : 'flex-nowrap',
    GapClass[props.gap],
    AlignClass[props.align],
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
  <div ref="el" v-bind="rest" :class="classes"><slot /></div>
</template>
