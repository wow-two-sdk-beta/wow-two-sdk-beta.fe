<script lang="ts">
/** Defines props for a labelled section of sidebar destinations. */
export interface SidebarMenuSectionProps {
  /** The section heading; also names the nested list. */
  readonly label: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { useId } from '../../../foundation/identifiers';
import { cn } from '../../../foundation/styles';
import { useSidebarMenuContext } from './SidebarMenuContext';

/** Renders a labelled, always-open section of sidebar destinations; a divider in the rail. */
defineOptions({ name: 'SidebarMenuSection', inheritAttrs: false });

/** The section's `SidebarMenuItem` and `SidebarMenuGroup` parts. */
defineSlots<{ default(): unknown }>();

const props = defineProps<SidebarMenuSectionProps>();

const attrs = useAttrs();
const context = useSidebarMenuContext();
const labelId = useId('sidebar-section');

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn('group/sidebar-section flex min-w-0 flex-col gap-0.5 pt-3 first:pt-0', attrs.class as ClassValue),
);
</script>

<template>
  <li v-bind="rest" :class="classes">
    <div class="relative h-5">
      <span
        :id="labelId"
        class="block truncate px-2.5 pb-1 text-xs font-medium text-muted-foreground motion-safe:transition-opacity motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
        :class="{ 'opacity-0': context.isCollapsed }"
      >
        {{ props.label }}
      </span>
      <span
        aria-hidden="true"
        class="absolute inset-x-0 top-1/2 border-t border-border group-first/sidebar-section:hidden motion-safe:transition-opacity motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
        :class="{ 'opacity-0': !context.isCollapsed }"
      />
    </div>
    <ul role="list" :aria-labelledby="labelId" class="flex flex-col gap-0.5">
      <slot />
    </ul>
  </li>
</template>
