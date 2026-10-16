<script lang="ts">
/* `Orientation` is imported here (not in `<script setup>`) so the one binding
   serves as both the type below and the runtime value used in `withDefaults`. */
import { Orientation } from '../../../foundation/styles';

export interface SpacerLayoutProps {
  /** The explicit size (CSS length). When inside a flex/grid parent,
   *  the default `flex: 1` already pushes siblings apart. */
  readonly size?: number | string;

  /** The axis the fixed `size` applies to. Default `horizontal`. */
  readonly axis?: Orientation;
}
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs, useTemplateRef, type CSSProperties } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a flexible empty box. In a flex parent it expands (`flex: 1`) and pushes
 * siblings to opposite ends. Pass `size` for a fixed gap.
 */
/* `<spacer-layout>` is an obsolete HTML element. This is a library component — imported,
   never globally registered — so the name cannot shadow the tag, and renaming it
   would break parity with the React package. */
defineOptions({ name: 'SpacerLayout', inheritAttrs: false });

const props = withDefaults(defineProps<SpacerLayoutProps>(), { axis: Orientation.Horizontal });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const fixed = computed<CSSProperties | undefined>(() => {
  if (props.size === undefined) return undefined;
  const length = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return props.axis === Orientation.Horizontal ? { width: length, flexShrink: 0 } : { height: length, flexShrink: 0 };
});

const classes = computed(() => cn(props.size === undefined && 'flex-1', attrs.class as string | undefined));

/** `normalizeStyle` merges left → right, so a caller's `style` lands last and wins. */
const styles = computed(() => normalizeStyle([fixed.value, attrs.style]));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" aria-hidden="true" v-bind="rest" :class="classes" :style="styles" />
</template>
