<script lang="ts">
import type { ElementType } from '../../../foundation/dom';
import type {
  StackLayoutVariants,
  StackLayoutDirection,
  StackLayoutAlign,
  StackLayoutJustify,
  StackLayoutWrap,
} from './StackLayout.variants';

/**
 * The gap between children. Spelled out rather than derived from
 * `StackLayoutVariants['gap']` because `defineProps<T>()` needs a type the SFC
 * compiler can resolve to a runtime declaration, and `VariantProps<typeof …>`
 * is opaque to it. The `AssertExact` lock below pins it to the variant keys, so
 * the duplication cannot drift.
 */
export type StackLayoutGap = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';

export interface StackLayoutProps {
  readonly as?: ElementType;
  /** The flex main-axis direction. Default `column`. */
  readonly direction?: StackLayoutDirection;
  /** The cross-axis alignment of children. */
  readonly align?: StackLayoutAlign;
  /** The main-axis distribution of children. */
  readonly justify?: StackLayoutJustify;
  /** The child wrapping onto multiple lines. */
  readonly wrap?: StackLayoutWrap;
  /** The gap between children (Tailwind spacing step). Default `4`. */
  readonly gap?: StackLayoutGap;
}

/* Compile-time lock: the hand-written `gap` union ≡ the tv variant keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertStackGap: AssertExact<StackLayoutGap, NonNullable<StackLayoutVariants['gap']>> = true;
void _assertStackGap;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { stackVariants } from './StackLayout.variants';

/**
 * Renders a vertical (default) or horizontal flex container with gap and alignment
 * variants. For row preset use `HStackLayout`, for column use `VStackLayout`.
 *
 * Only `as` carries a default — `direction` / `align` / `justify` / `gap` /
 * `wrap` stay `undefined` so `stackVariants`' own `defaultVariants` decide,
 * exactly as in the React original.
 */
defineOptions({ name: 'StackLayout', inheritAttrs: false });

const props = withDefaults(defineProps<StackLayoutProps>(), { as: 'div' });

defineSlots<{
  /** The children laid out along the stack axis. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    stackVariants({
      direction: props.direction,
      align: props.align,
      justify: props.justify,
      gap: props.gap,
      wrap: props.wrap,
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
  <component :is="props.as" ref="el" v-bind="rest" :class="classes"><slot /></component>
</template>
