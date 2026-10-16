<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

/**
 * Renders the `<ul>` an open speed dial fans its action items into.
 *
 * `Presence`-clonable list: a single element that takes the `data-state` and `ref`
 * `Presence` injects. Marked `group` so each action item animates off its
 * `data-[state]`; carries its own fade so `Presence` has an animation on *this*
 * node to watch before unmount. Internal — not exported from the barrel.
 */
defineOptions({ name: 'SpeedDialGroupList', inheritAttrs: false });

defineSlots<{
  /** The `SpeedDialGroupAction` items the list fans out, each its own `<li>`. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'group absolute flex',
    /* list fade gated on data-state; motion-safe so reduced-motion users
       get no movement. */
    'motion-safe:data-[state=open]:animate-(--animate-fade-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-fade-out)',
    'motion-reduce:animate-none',
    /* Per-item enter stagger: ramp `animation-delay` on the first few items
       while opening only (closed → delay 0 so no item outlasts the list's
       own fade-out, which gates unmount). */
    'motion-safe:group-data-[state=open]:[&>li:nth-child(2)]:[animation-delay:40ms]',
    'motion-safe:group-data-[state=open]:[&>li:nth-child(3)]:[animation-delay:80ms]',
    'motion-safe:group-data-[state=open]:[&>li:nth-child(4)]:[animation-delay:120ms]',
    'motion-safe:group-data-[state=open]:[&>li:nth-child(n+5)]:[animation-delay:160ms]',
    attrs.class as ClassValue,
  ),
);
</script>

<template>
  <ul role="menu" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </ul>
</template>
