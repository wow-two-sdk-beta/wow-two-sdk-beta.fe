<script lang="ts">
export interface InputAddonLayoutProps {
  /** The text rendered to the left of the input (e.g. "https://"). Fill the `leading` slot for richer content. */
  readonly leading?: string | number;

  /** The text rendered to the right of the input (e.g. ".com"). Fill the `trailing` slot for richer content. */
  readonly trailing?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

/**
 * Renders leading and trailing addons welded to an input's border — protocol prefixes, units, suffixes.
 *
 * Each of React's two `ReactNode` props keeps its scalar form and gains a
 * same-named slot for richer content; the prop stays the discriminator.
 */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'InputAddonLayout', inheritAttrs: false });

const props = defineProps<InputAddonLayoutProps>();

/** The input element (TextInput, EmailInput, …) — React's `children`. */
defineSlots<{
  default(): unknown;
  leading?(): unknown;
  trailing?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const hasLeading = computed(() => Boolean(props.leading) || Boolean(slots.leading));
const hasTrailing = computed(() => Boolean(props.trailing) || Boolean(slots.trailing));

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex w-full items-stretch rounded-md [&>*]:rounded-none',
    '[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
    '[&>*:not(:first-child)]:-ml-px',
    /* The group is the control, so the focus ring belongs to the group. Past the React
       original, where the ring landed on the input segment alone and the addons read as
       separate boxes hanging off a highlighted middle. The segment's own ring is
       suppressed; it is raised instead so its border paints over its neighbours'. */
    '[&:has(>*:focus-visible)]:ring-2 [&:has(>*:focus-visible)]:ring-ring',
    '[&>*:focus-visible]:z-10 [&>*:focus-visible]:relative [&>*:focus-visible]:ring-0',
    attrs.class as ClassValue,
  ),
);

const AddonClass = 'inline-flex shrink-0 items-center border border-input bg-muted px-3 text-sm text-muted-foreground';

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <span v-if="hasLeading" :class="AddonClass">
      <slot name="leading">{{ leading }}</slot>
    </span>
    <slot />
    <span v-if="hasTrailing" :class="AddonClass">
      <slot name="trailing">{{ trailing }}</slot>
    </span>
  </div>
</template>
