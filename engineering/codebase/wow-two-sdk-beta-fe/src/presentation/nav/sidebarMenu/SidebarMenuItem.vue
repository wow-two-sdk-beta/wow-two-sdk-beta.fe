<script lang="ts">
/** Defines props for one sidebar destination. */
export interface SidebarMenuItemProps {
  /** Whether this is the current place — marked `aria-current="page"` and tinted. */
  readonly isActive?: boolean;

  /** The escape hatch to render the slotted router link instead of an `<a>`. */
  readonly asChild?: boolean;

  /** Label and state to show on hover or focus when the menu is collapsed. */
  readonly tooltip?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import type { ClassValue } from 'clsx';
import { dataAttr, resolveElement } from '../../../foundation/dom';
import { Primitive, Slottable } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';
import Tooltip from '../../overlays/tooltip/Tooltip.vue';
import { useSidebarMenuContext } from './SidebarMenuContext';

/** Renders one sidebar destination — icon, label and a trailing count; icon-only in the rail. */
defineOptions({ name: 'SidebarMenuItem', inheritAttrs: false });

defineSlots<{
  /** The label, or the router link itself under `asChild`. */
  default(): unknown;

  /** The leading icon. */
  icon?(): unknown;

  /** The trailing count or status dot; hidden in the rail. */
  trailing?(): unknown;
}>();

const props = withDefaults(defineProps<SidebarMenuItemProps>(), {
  isActive: undefined,
  asChild: false,
});

const attrs = useAttrs();
const context = useSidebarMenuContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn(
    'group flex h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-sm font-medium text-foreground',
    'transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    'data-[active]:bg-primary-soft data-[active]:text-primary-soft-foreground',
    '*:data-[sidebar-menu-label]:min-w-0 *:data-[sidebar-menu-label]:flex-1 *:data-[sidebar-menu-label]:truncate *:data-[sidebar-menu-label]:text-start',
    '*:data-[sidebar-menu-label]:motion-safe:transition-opacity *:data-[sidebar-menu-label]:motion-safe:duration-(--duration-base) *:data-[sidebar-menu-label]:motion-safe:ease-(--ease-out)',
    context.isCollapsed && '*:data-[sidebar-menu-label]:opacity-0',
    attrs.class as ClassValue,
  ),
);

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <li class="flex">
    <Tooltip :content="props.tooltip" :is-disabled="!context.isCollapsed || !props.tooltip" placement="right">
      <Primitive
        ref="inner"
        as="a"
        :as-child="props.asChild"
        :aria-current="props.isActive ? 'page' : undefined"
        :data-active="dataAttr(props.isActive)"
        v-bind="rest"
        :class="classes"
      >
        <span
          v-if="$slots.icon"
          class="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground group-data-[active]:text-current"
          aria-hidden="true"
        >
          <slot name="icon" />
        </span>
        <Slottable v-if="props.asChild"><slot /></Slottable>
        <span v-else data-sidebar-menu-label><slot /></span>
        <span
          v-if="$slots.trailing"
          :inert="context.isCollapsed"
          class="ms-auto shrink-0 motion-safe:transition-opacity motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
          :class="{ 'opacity-0': context.isCollapsed }"
        >
          <slot name="trailing" />
        </span>
      </Primitive>
    </Tooltip>
  </li>
</template>
