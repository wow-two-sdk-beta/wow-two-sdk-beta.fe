<script lang="ts">
/** Internal — the focusable `role="treeitem"` row shared by `TreeViewerGroup` and `TreeViewerItem`. */
export interface TreeViewerNodeRowProps {
  /** The 1-based nesting depth. */
  readonly level: number;
  /** The selected state. */
  readonly isSelected: boolean;
  /** The expanded state — only meaningful when `hasChildren`. */
  readonly isExpanded?: boolean;
  /** Whether the row owns a child group. */
  readonly hasChildren: boolean;
  /** The disabled state. */
  readonly isDisabled: boolean;
  /** Toggles a branch or selects a leaf. Required, so it stays a prop rather than an emit. */
  readonly onActivate: () => void;
}

/* DOM-walking targets for the APG horizontal arrows. Anatomy per branch:
   <li role=presentation> → [row div role=treeitem, content → <ul role=group>].
   The tree root is role="tree", so a root-level row has no `[role="group"]`
   ancestor and ArrowLeft is a no-op there. */

/** First child row of an expanded branch — ArrowRight descends into it. */
function focusFirstChildRow(row: HTMLElement): void {
  row.closest('li')?.querySelector<HTMLElement>('[role="group"] [role="treeitem"]')?.focus();
}

/** Row of the branch owning this row — ArrowLeft climbs to it. */
function findParentRow(row: HTMLElement): HTMLElement | null {
  return row.closest('[role="group"]')?.closest('li')?.querySelector<HTMLElement>(':scope > [role="treeitem"]') ?? null;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useRovingFocusItem } from '../../../foundation/primitives';

/** Renders one tree row — chevron, label, and the `treeitem` ARIA state of a branch or a leaf. */
defineOptions({ name: 'TreeViewerNodeRow' });

/** The row label. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TreeViewerNodeRowProps>(), {
  // `undefined` is meaningful: a leaf must render no `aria-expanded` at all.
  isExpanded: undefined,
});

// Reactive object: bound with `v-bind`, never destructured.
const item = useRovingFocusItem();

/**
 * Runs after the roving group's own key handler — `v-bind="item"` sits ahead of
 * this binding, so `defaultPrevented` reflects what that handler already did.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || props.isDisabled) return;
  const row = event.currentTarget as HTMLElement;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    props.onActivate();
    return;
  }
  /* APG tree pattern — the vertical roving group above ignores the
     horizontal arrows, so they are free to drive expand/collapse here. */
  if (event.key === 'ArrowRight' && props.hasChildren) {
    event.preventDefault();
    if (props.isExpanded) focusFirstChildRow(row);
    else props.onActivate(); // Expand; focus stays on the branch.
    return;
  }
  if (event.key === 'ArrowLeft') {
    if (props.hasChildren && props.isExpanded) {
      event.preventDefault();
      props.onActivate(); // Collapse; focus stays on the branch.
      return;
    }
    // Leaf or collapsed branch: climb to the parent branch, if any.
    const parentRow = findParentRow(row);
    if (parentRow) {
      event.preventDefault();
      parentRow.focus();
    }
  }
}

function onClick(): void {
  if (!props.isDisabled) props.onActivate();
}

/** Vue does not append `px` to a numeric `:style` value — spelled out. */
const rowStyle = computed(() => ({ paddingLeft: `${(props.level - 1) * 16}px` }));

const classes = computed(() =>
  cn(
    'flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 transition-colors',
    'hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    props.isSelected && 'bg-primary-soft text-primary-soft-foreground',
    props.isDisabled && 'pointer-events-none opacity-50',
  ),
);

const chevronClasses = computed(() =>
  cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', props.isExpanded && 'rotate-90'),
);
</script>

<template>
  <div
    role="treeitem"
    :aria-level="level"
    :aria-selected="isSelected || undefined"
    :aria-expanded="hasChildren ? isExpanded : undefined"
    :aria-disabled="isDisabled || undefined"
    :data-selected="dataAttr(isSelected)"
    :data-disabled="dataAttr(isDisabled)"
    :style="rowStyle"
    :class="classes"
    v-bind="item"
    @keydown="onKeydown"
    @click="onClick"
  >
    <ChevronRight v-if="hasChildren" :class="chevronClasses" />
    <span v-else class="w-4 shrink-0" />
    <span class="flex-1 truncate"><slot /></span>
  </div>
</template>
