<script lang="ts">
/**
 * Defines props for a `FieldsetLayout`.
 *
 * React's `FieldsetLayoutHTMLAttributes<HTMLFieldSetElement>` has no Vue counterpart —
 * every native attribute (`disabled`, `form`, `name`) is a fallthrough attr and
 * lands on the `<fieldset>` unchanged. The name is kept so consumers importing
 * `FieldsetLayoutProps` still resolve.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FieldsetLayoutProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

/** Renders a semantic `<fieldset>` grouping related controls, labelled by a `LegendText` child. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'FieldsetLayout', inheritAttrs: false });

defineSlots<{
  /** The grouped controls, plus the `LegendText` naming them. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('m-0 min-w-0 border-0 p-0', attrs.class as ClassValue));

const root = useTemplateRef<HTMLFieldSetElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <fieldset ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </fieldset>
</template>
