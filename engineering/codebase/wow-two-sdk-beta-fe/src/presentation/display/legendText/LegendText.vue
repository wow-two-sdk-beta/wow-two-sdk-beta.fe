<script lang="ts">
/**
 * Defines props for a `LegendText`.
 *
 * React's `HTMLAttributes<HTMLLegendElement>` has no Vue counterpart — every
 * native attribute is a fallthrough attr and lands on the `<legend>` unchanged.
 * The name is kept so consumers importing `LegendTextProps` still resolve.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LegendTextProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

/** Renders a `<legend>` styled to match `LabelText`, naming the group of controls a `FieldsetLayout` wraps. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'LegendText', inheritAttrs: false });

defineSlots<{
  /** The group's name — React's `children`. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('mb-2 text-sm font-medium text-foreground', attrs.class as ClassValue));

const root = useTemplateRef<HTMLLegendElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <legend ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </legend>
</template>
