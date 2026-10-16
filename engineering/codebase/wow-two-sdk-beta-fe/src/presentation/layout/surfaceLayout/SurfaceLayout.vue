<script lang="ts">
import type { ElementType } from '../../../foundation/dom';
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of the `SurfaceLayout` atom.
 *
 * React declared these by `extends SurfaceLayoutVariants`; spelled out here because
 * `defineProps<T>()` needs a type the SFC compiler can resolve to a runtime
 * declaration, and `VariantProps<typeof surfaceVariants>` is opaque to it.
 */
export interface SurfaceLayoutProps {
  /** The HTML element to render; defaults to `div`. */
  readonly as?: ElementType;
  /** The merge of styles onto the immediate child instead of rendering a wrapper. */
  readonly asChild?: boolean;
  /** The visual recipe — solid · soft · surface · outline · glass · elevated · flat · subtle. */
  readonly variant?: SurfaceVariant;
  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;
  /** The corner rounding. */
  readonly radius?: SurfaceRadius;
  /** The inner spacing step. */
  readonly padding?: SurfacePadding;
  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { Primitive } from '../../../foundation/primitives';
import { cn, surfaceVariants } from '../../../foundation/styles';

/**
 * Renders a styled visual surface composed from the `surfaceVariants` matrix.
 *
 * React branched between `Slot` (when `asChild`) and the `as` element. `Primitive`
 * carries both, so one element covers the pair: `asChild` collapses into the single
 * slot child, otherwise `as` renders.
 */
defineOptions({ name: 'SurfaceLayout', inheritAttrs: false });

const props = withDefaults(defineProps<SurfaceLayoutProps>(), { as: 'div', asChild: false });

defineSlots<{
  /** The content rendered on the surface. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

const classes = computed(() =>
  cn(
    surfaceVariants({
      variant: props.variant,
      tone: props.tone,
      radius: props.radius,
      padding: props.padding,
      elevation: props.elevation,
    }),
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <Primitive ref="inner" :as="props.as" :as-child="props.asChild" v-bind="rest" :class="classes">
    <slot />
  </Primitive>
</template>
