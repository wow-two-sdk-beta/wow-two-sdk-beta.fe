<script lang="ts">
/* `Side` is imported here (not in `<script setup>`) so the one binding serves
   as both the type below and the runtime value used in `withDefaults`. */
import { Side } from '../../../foundation/styles';

export interface TwoColumnLayoutProps {
  /** The aside width — Tailwind class string (e.g. `w-64`). Default `w-64`. */
  readonly asideWidth?: string;

  /** The side the aside sits on — `left` or `right`. Default `left`. */
  readonly asideSide?: Side;

  /** The gap between aside and main. Default `6`. */
  readonly gap?: '0' | '4' | '6' | '8' | '10';
}

const GapClass: Record<NonNullable<TwoColumnLayoutProps['gap']>, string> = {
  '0': 'gap-0',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a two-pane layout — fixed-width aside + flexible main. Sidebar+content,
 * filter+results, table-of-contents+article patterns.
 */
defineOptions({ name: 'TwoColumnLayout', inheritAttrs: false });

/**
 * React's `aside` / `children` ReactNode props become slots: structural content
 * regions have no prop equivalent in Vue, and a slot is what a template can
 * fill. `aside` was required in React and stays required here.
 */
defineSlots<{
  /** The sidebar / aside content. */
  aside(): unknown;
  /** The main content. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<TwoColumnLayoutProps>(), {
  asideWidth: 'w-64',
  asideSide: Side.Left,
  gap: '6',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'flex w-full',
    props.asideSide === Side.Right && 'flex-row-reverse',
    GapClass[props.gap],
    attrs.class as string | undefined,
  ),
);

const asideClasses = computed(() => cn('shrink-0', props.asideWidth));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <aside :class="asideClasses"><slot name="aside" /></aside>
    <main class="min-w-0 flex-1"><slot /></main>
  </div>
</template>
