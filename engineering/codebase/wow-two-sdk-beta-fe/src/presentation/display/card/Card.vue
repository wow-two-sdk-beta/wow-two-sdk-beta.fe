<script lang="ts">
import type {
  SurfaceElevation,
  SurfaceAmbient,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of `Card`.
 *
 * React declared these by `extends SurfaceLayoutVariants`; spelled out here because
 * `defineProps<T>()` needs a type the SFC compiler can resolve to a runtime
 * declaration, and `VariantProps<typeof surfaceVariants>` is opaque to it.
 */
export interface CardProps {
  /** The optional ambient surface treatment. */
  readonly ambient?: SurfaceAmbient;
  /**
   * The visual recipe — solid · soft · surface · outline · glass · glass-outline · glass-side · glass-menu ·
   * elevated · flat · subtle.
   */
  readonly variant?: SurfaceVariant;
  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;
  /** The corner rounding. */
  readonly radius?: SurfaceRadius;
  /** The inner spacing step. */
  readonly padding?: SurfacePadding;
  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
  /** Keeps the card's chrome and draws everything inside as skeletons; defaults to the nearest `DataRegion`. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

/**
 * Renders a raised surface that groups content, padded to frame its header, body, and footer.
 *
 * The sub-components ship as siblings — `CardHeader` / `CardTitle` / `CardDescription` / `CardBody` / `CardFooter` —
 * rather than statics on this component, since an SFC's default export cannot carry them cleanly.
 */
defineOptions({ name: 'Card', inheritAttrs: false });

/** The card content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<CardProps>(), { isSkeleton: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* The chrome stays; one flag here switches the title, description and every component inside. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

const classes = computed(() =>
  cn(
    surfaceVariants({
      variant: props.variant ?? 'surface',
      tone: props.tone,
      radius: props.radius ?? 'lg',
      padding: props.padding ?? 'none',
      elevation: props.elevation ?? 1,
      ambient: props.ambient,
    }),
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
  <div
    ref="el"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-busy="props.isSkeleton || undefined"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </div>
</template>
