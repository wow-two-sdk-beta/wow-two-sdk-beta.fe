<script lang="ts">
import type { SurfaceTone } from '../../../foundation/styles';
import type { ContainerLayoutProps } from '../containerLayout';
import type { SectionPaddingY } from './Section.variants';

export interface SectionProps {
  /**
   * The tinted background tone for the band. Applies the shadow-less `subtle`
   * surface treatment (low-alpha tinted fill + `border-border`). Omit for a
   * transparent band (no fill, no border).
   */
  readonly tone?: SurfaceTone;

  /** The max-width of the inner centered `ContainerLayout`. Passthrough to `ContainerLayout.size`. Default `lg`. */
  readonly containerSize?: ContainerLayoutProps['size'];

  /** The vertical padding (the band's top/bottom rhythm). Default `md`. */
  readonly py?: SectionPaddingY;

  /** The full-bleed mode — renders a `<section>` with no inner `ContainerLayout` (edge-to-edge content). */
  readonly isFullBleed?: boolean;
  /** @deprecated Use `isFullBleed`; this alias is removed next release. */
  readonly bleed?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import ContainerLayout from '../containerLayout/ContainerLayout.vue';
import { sectionVariants } from './Section.variants';

/**
 * Renders a full-bleed `<section>` band with an inner centered `ContainerLayout`. The repetitive
 * marketing "section band" pattern: optional tinted (shadow-less) background,
 * passthrough container width, and vertical padding. Pass `isFullBleed` to drop the
 * inner ContainerLayout for edge-to-edge content.
 */
/* `<section>` is a live HTML element, but SFC templates are case-sensitive
   (`<Section>` ≠ `<section>`) and this is a library component — imported, never
   globally registered. Renaming it would break parity with the React package. */
defineOptions({ name: 'Section', inheritAttrs: false });

const props = withDefaults(defineProps<SectionProps>(), { isFullBleed: undefined, bleed: undefined });

defineSlots<{
  /** The band content — wrapped in a `ContainerLayout` unless `isFullBleed` is set. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    sectionVariants({ py: props.py }),
    props.tone && surfaceVariants({ variant: 'subtle', tone: props.tone, radius: 'none' }),
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
  <section ref="el" v-bind="rest" :class="classes">
    <slot v-if="props.isFullBleed ?? props.bleed ?? false" />
    <ContainerLayout v-else :size="props.containerSize"><slot /></ContainerLayout>
  </section>
</template>
