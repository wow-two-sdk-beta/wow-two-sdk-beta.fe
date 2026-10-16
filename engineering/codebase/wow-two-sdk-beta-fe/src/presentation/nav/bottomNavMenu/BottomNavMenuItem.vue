<script lang="ts">
/** Defines props for one destination of the bottom navigation bar. */
export interface BottomNavMenuItemProps {
  /** Whether this is the current place — marked `aria-current="page"` and tinted. */
  readonly isActive?: boolean;

  /** The escape hatch to render the slotted router link instead of an `<a>`. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import type { ClassValue } from 'clsx';
import { dataAttr, resolveElement } from '../../../foundation/dom';
import { Primitive, Slottable } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';

/** Renders one bottom-bar destination — an icon over a short label, with an optional count badge. */
defineOptions({ name: 'BottomNavMenuItem', inheritAttrs: false });

defineSlots<{
  /** The short label, or the router link itself under `asChild`. */
  default(): unknown;

  /** The icon drawn above the label. */
  icon?(): unknown;

  /** The count or dot drawn on the icon's corner. */
  badge?(): unknown;
}>();

const props = withDefaults(defineProps<BottomNavMenuItemProps>(), {
  isActive: undefined,
  asChild: false,
});

const attrs = useAttrs();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn(
    'group flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs font-medium',
    'text-muted-foreground transition-colors hover:text-foreground',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    'data-[active]:text-primary-soft-foreground',
    attrs.class as ClassValue,
  ),
);

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <li class="flex">
    <Primitive
      ref="inner"
      as="a"
      :as-child="props.asChild"
      :aria-current="props.isActive ? 'page' : undefined"
      :data-active="dataAttr(props.isActive)"
      v-bind="rest"
      :class="classes"
    >
      <!-- The badge stays audible: only the icon is hidden, so a count reads before the label. -->
      <span v-if="$slots.icon || $slots.badge" class="relative inline-flex">
        <span v-if="$slots.icon" class="inline-flex" aria-hidden="true"><slot name="icon" /></span>
        <span v-if="$slots.badge" :class="$slots.icon ? 'absolute -end-2 -top-1.5' : 'inline-flex'">
          <slot name="badge" />
        </span>
      </span>
      <Slottable v-if="props.asChild"><slot /></Slottable>
      <span v-else class="max-w-full truncate"><slot /></span>
    </Primitive>
  </li>
</template>
