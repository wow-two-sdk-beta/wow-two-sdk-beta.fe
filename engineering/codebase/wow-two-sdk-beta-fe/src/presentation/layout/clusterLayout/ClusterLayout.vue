<script lang="ts">
/* `Align` is imported here (not in `<script setup>`) so the one binding serves
   as both the type below and the runtime value used in `withDefaults`. */
import { Align } from '../../../foundation/styles';

export interface ClusterLayoutProps {
  /** The gap between children. Default `4`. */
  readonly gap?: '2' | '3' | '4' | '6' | '8';

  /** The cross-axis justification. Default `center`. */
  readonly justify?: Align;
}

const GapClass: Record<NonNullable<ClusterLayoutProps['gap']>, string> = {
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
};
const JustifyClass: Record<NonNullable<ClusterLayoutProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a centered wrapping row — for auth-page action clusters, hero CTAs, footer
 * link groups. `InlineLayout` left-aligns; `ClusterLayout` centers by default.
 */
defineOptions({ name: 'ClusterLayout', inheritAttrs: false });

const props = withDefaults(defineProps<ClusterLayoutProps>(), { gap: '4', justify: Align.Center });

defineSlots<{
  /** The items laid out in the centered wrapping row. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'flex flex-wrap items-center',
    GapClass[props.gap],
    JustifyClass[props.justify],
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
