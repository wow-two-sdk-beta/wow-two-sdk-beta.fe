<script lang="ts">
import type { NavbarVariant } from '../navbar/Navbar.variants';

/** Defines the height of an `AppShellHeader`. */
export const AppShellHeaderHeight = {
  /** Refers to a compact 3rem bar. */
  Sm: 'sm',
  /** Refers to the default 3.5rem bar. */
  Md: 'md',
  /** Refers to a tall 4rem bar. */
  Lg: 'lg',
  /** Refers to a bar that grows with wrapping content from the default height. */
  Auto: 'auto',
} as const;

export type AppShellHeaderHeight = (typeof AppShellHeaderHeight)[keyof typeof AppShellHeaderHeight];

const HeightClass: Record<AppShellHeaderHeight, string> = {
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-16',
  auto: 'min-h-14 flex-wrap py-2',
};

/** Represents the prop surface of `AppShellHeader`. */
export interface AppShellHeaderProps {
  /** The bar height. Default `md`; `auto` lets wrapped content grow the bar. */
  readonly height?: AppShellHeaderHeight;

  /**
   * The surface: `solid` (the theme's card fill, default), `glass` (that fill translucent and blurred, opaque where
   * blur or transparency is unavailable or reduced) or `transparent`.
   */
  readonly variant?: NavbarVariant;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { NavbarSurfaceClass } from '../navbar/Navbar.variants';
import { bannerHostKey } from '../navbar/NavbarContext';

/**
 * Renders the shell's sticky top bar into the `header` grid area. It is the page's banner, so a `Navbar` inside renders
 * a plain row rather than a second banner.
 */
defineOptions({ name: 'AppShellHeader', inheritAttrs: false });

/** The header content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const props = withDefaults(defineProps<AppShellHeaderProps>(), { height: 'md', variant: 'solid' });

provide(bannerHostKey, true);

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    'sticky top-0 z-sticky flex items-center gap-3 border-b border-border px-4 [grid-area:header]',
    HeightClass[props.height],
    NavbarSurfaceClass[props.variant],
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
  <header ref="el" role="banner" v-bind="rest" :class="classes"><slot /></header>
</template>
