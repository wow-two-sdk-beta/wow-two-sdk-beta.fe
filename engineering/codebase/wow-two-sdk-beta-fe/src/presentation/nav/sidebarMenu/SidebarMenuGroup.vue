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
import { cn } from '../../../foundation/styles';
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

const rootClasses = computed(() => cn('flex flex-col', attrs.class as ClassValue));

const toggleClasses = computed(() =>
  cn(
    'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-foreground',
    'transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    context.isCollapsed && 'justify-center px-0',
  ),
);

const listClasses = computed(() =>
  cn('flex flex-col gap-0.5 pt-0.5', !context.isCollapsed && 'ms-4 border-s border-border ps-2'),
);
</script>

<template>
  <li v-bind="rest" :class="rootClasses" :data-state="isOpen ? 'open' : 'closed'">
    <button type="button" :aria-expanded="isShown" :aria-controls="listId" :class="toggleClasses" @click="toggle">
      <span v-if="$slots.icon" class="inline-flex shrink-0 text-muted-foreground" aria-hidden="true">
        <slot name="icon" />
      </span>
      <span :class="context.isCollapsed ? 'sr-only' : 'flex-1 truncate text-start'">{{ props.label }}</span>
      <ChevronRight
        v-if="!context.isCollapsed"
        :class="cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')"
        aria-hidden="true"
      />
    </button>
    <ul v-show="isShown" :id="listId" role="list" :aria-label="props.label" :class="listClasses">
      <slot />
    </ul>
  </li>
</template>
