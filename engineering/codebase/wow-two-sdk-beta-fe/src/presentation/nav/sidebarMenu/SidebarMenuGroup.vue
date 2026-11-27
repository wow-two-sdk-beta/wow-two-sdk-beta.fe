<script lang="ts">
/** Defines props for a collapsible group of sidebar destinations. */
export interface SidebarMenuGroupProps {
  /** The group heading on its toggle; also names the nested list. */
  readonly label: string;

  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronRight } from 'lucide-vue-next';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import { CoarseHitArea, cn } from '../../../foundation/styles';
import CollapsibleGroup from '../../display/collapsibleGroup/CollapsibleGroup.vue';
import CollapsibleGroupContent from '../../display/collapsibleGroup/CollapsibleGroupContent.vue';
import { useSidebarMenuContext } from './SidebarMenuContext';

/** Renders a disclosure of nested sidebar destinations under one toggle row. */
defineOptions({ name: 'SidebarMenuGroup', inheritAttrs: false });

defineSlots<{
  /** The nested `SidebarMenuItem` destinations. */
  default(): unknown;

  /** The toggle row's icon. */
  icon?(): unknown;
}>();

const props = withDefaults(defineProps<SidebarMenuGroupProps>(), {
  open: undefined,
  defaultOpen: false,
});

const emit = defineEmits<{
  /** Fires when the reader opens or closes the group — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const attrs = useAttrs();
const context = useSidebarMenuContext();
const listId = useId('sidebar-group');

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});
const isOpen = controlled.value;

/* The rail has no room for nested rows (they often lack icons), so a group shows only its toggle there; its
   open state still applies once the menu expands. */
const isShown = computed(() => isOpen.value && !context.isCollapsed);

function toggle(): void {
  controlled.setValue(!isOpen.value);
}

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const rootClasses = computed(() => cn('flex min-w-0 flex-col', attrs.class as ClassValue));

/* The toggle row takes a destination row's coarse-pointer recipe: 36px tall (44px in a drawer), a 44px-wide hit area,
   and no clipping under either pointer; the label truncates in its own span. */
const toggleClasses = cn(
  'relative flex h-9 w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
  'pointer-coarse:[[data-sidebar-drawer]_&]:h-11',
  CoarseHitArea.AfterX,
);
</script>

<template>
  <li v-bind="rest" :class="rootClasses" :data-state="isOpen ? 'open' : 'closed'">
    <CollapsibleGroup :open="isShown">
      <button type="button" :aria-expanded="isShown" :aria-controls="listId" :class="toggleClasses" @click="toggle">
        <span
          v-if="$slots.icon"
          class="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          aria-hidden="true"
        >
          <slot name="icon" />
        </span>
        <span
          class="min-w-0 flex-1 truncate text-start motion-safe:transition-opacity motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
          :class="{ 'opacity-0': context.isCollapsed }"
          >{{ props.label }}</span
        >
        <ChevronRight
          class="size-4 shrink-0 text-muted-foreground motion-safe:transition-[rotate,opacity] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
          :class="{ 'rotate-90': isShown, 'opacity-0': context.isCollapsed }"
          aria-hidden="true"
        />
      </button>
      <CollapsibleGroupContent is-force-mounted :role="undefined" :aria-labelledby="undefined">
        <ul
          :id="listId"
          role="list"
          :aria-label="props.label"
          class="ms-4 flex flex-col gap-0.5 border-s border-border pt-0.5 ps-2"
        >
          <slot />
        </ul>
      </CollapsibleGroupContent>
    </CollapsibleGroup>
  </li>
</template>
