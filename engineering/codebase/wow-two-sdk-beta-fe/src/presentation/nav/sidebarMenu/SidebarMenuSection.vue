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

const Motion = 'motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)';

/* In the rail the heading row grows to the padding it replaces, so a section keeps its height, and its divider sits
   18px from the item above and below. The first section has no divider: its row and the gap under it close, so the
   first item sits on the nav's own padding. */
const classes = computed(() =>
  cn(
    'group/sidebar-section flex min-w-0 flex-col gap-0.5 motion-safe:transition-[padding-top]',
    Motion,
    context.isCollapsed ? 'pt-0' : 'pt-3 first:pt-0',
    attrs.class as ClassValue,
  ),
);

const headingClasses = computed(() =>
  cn(
    'relative overflow-hidden motion-safe:transition-[height,margin-bottom]',
    Motion,
    context.isCollapsed ? 'h-8 group-first/sidebar-section:-mb-0.5 group-first/sidebar-section:h-0' : 'h-5',
  ),
);
</script>

<template>
  <li v-bind="rest" :class="classes">
    <div :class="headingClasses">
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
