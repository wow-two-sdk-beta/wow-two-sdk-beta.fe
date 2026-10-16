<script lang="ts">
import type { SizeValue } from '../../../foundation/styles';
import type { ContainerLayoutSize } from '../containerLayout/ContainerLayout.variants';

/** Defines the padding step around `AppShellContent`. */
export const AppShellContentGutter = {
  /** Refers to no padding — the content runs to the region's edges. */
  None: 'none',
  /** Refers to a 1rem gutter. */
  Sm: 'sm',
  /** Refers to the default 1.5rem gutter. */
  Md: 'md',
  /** Refers to a gutter that widens with the viewport, from 1rem to 2rem. */
  Lg: 'lg',
} as const;

export type AppShellContentGutter = (typeof AppShellContentGutter)[keyof typeof AppShellContentGutter];

const GutterClass: Record<AppShellContentGutter, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
};

const MaxWidthClass: Record<ContainerLayoutSize, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

/** Represents the prop surface of `AppShellContent`. */
export interface AppShellContentProps {
  /** The padding around the content. Default `md`. */
  readonly gutter?: AppShellContentGutter;

  /**
   * Caps the content's width and centers it: a `ContainerLayoutSize` step or any CSS length (number = px).
   * Default none — the content spans the region.
   */
  readonly maxWidth?: ContainerLayoutSize | SizeValue;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, CssExtensions } from '../../../foundation/styles';

/** Renders the scrolling region inside `AppShellMain` — header, sidebar and footer stay put. */
defineOptions({ name: 'AppShellContent', inheritAttrs: false });

/** The scrolling content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const props = withDefaults(defineProps<AppShellContentProps>(), { gutter: 'md', maxWidth: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* The main region (or the document) owns scrolling, so content never nests a second scroll container. */
const classes = computed(() => cn('flex-1', GutterClass[props.gutter], attrs.class as string | undefined));

const stepClass = computed(() =>
  typeof props.maxWidth === 'string' && props.maxWidth in MaxWidthClass
    ? MaxWidthClass[props.maxWidth as ContainerLayoutSize]
    : undefined,
);

const containerClass = computed(() => cn('mx-auto w-full', stepClass.value));

const containerStyle = computed(() =>
  props.maxWidth === undefined || stepClass.value ? undefined : { maxWidth: CssExtensions.toCss(props.maxWidth) },
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
    <div v-if="props.maxWidth !== undefined" :class="containerClass" :style="containerStyle" data-content-container>
      <slot />
    </div>
    <slot v-else />
  </div>
</template>
