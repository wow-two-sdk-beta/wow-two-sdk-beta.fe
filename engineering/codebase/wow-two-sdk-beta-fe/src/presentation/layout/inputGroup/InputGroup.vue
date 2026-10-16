<script lang="ts">
import type { Orientation } from '../../../foundation/styles';

export interface InputGroupProps {
  /** The layout axis. Default `horizontal`. */
  readonly orientation?: Orientation;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation as OrientationValue } from '../../../foundation/styles';

/** Renders a row or column of inputs as one connected control, collapsing the radii where they meet. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'InputGroup', inheritAttrs: false });

const props = withDefaults(defineProps<InputGroupProps>(), {
  orientation: OrientationValue.Horizontal,
});

/** The joined controls — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();

const isHorizontal = computed(() => props.orientation === OrientationValue.Horizontal);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex w-full rounded-md',
    isHorizontal.value ? 'flex-row' : 'flex-col',
    /* Same contract as `InputAddonLayout`: the joined row is one control, so the ring goes round
       the whole group and the focused segment only rises above its neighbours' borders. */
    '[&:has(>*:focus-visible)]:ring-2 [&:has(>*:focus-visible)]:ring-ring',
    '[&>*:focus-visible]:z-10 [&>*:focus-visible]:relative [&>*:focus-visible]:ring-0',
    isHorizontal.value
      ? '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px'
      : '[&>*]:rounded-none [&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md [&>*:not(:first-child)]:-mt-px',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </div>
</template>
