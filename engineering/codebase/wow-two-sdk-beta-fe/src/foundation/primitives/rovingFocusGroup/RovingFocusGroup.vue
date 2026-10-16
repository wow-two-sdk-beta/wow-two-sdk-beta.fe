<script lang="ts">
import type { HTMLAttributes } from 'vue';

// `Orientation` is imported as a value by `<script setup>` below; both blocks
// share one module scope, so re-importing the type here would duplicate it.
export interface RovingFocusGroupProps extends /* @vue-ignore */ HTMLAttributes {
  readonly orientation?: Orientation;
  readonly canLoop?: boolean;
}
</script>

<script setup lang="ts">
import { DomOrderExtensions } from '../../dom';
import { provide, shallowRef, useTemplateRef, watch } from 'vue';
import { Direction, useDirection } from '../directionProvider';
import {
  Orientation,
  RovingFocusKey,
  findEnabled,
  findNearestEnabled,
  isEntryDisabled,
  isNodeDisabled,
  type ItemEntry,
  type RovingFocusContextValue,
} from './RovingFocusContext';

/**
 * Renders a `role="group"` wrapper that gives its focusable children arrow-key
 * navigation. Children call `useRovingFocusItem()` to register and receive
 * `tabindex` / event handlers. Disabled items (native `disabled`,
 * `aria-disabled="true"`, or `data-disabled`) are never valid stops: arrow /
 * Home / End navigation skips them (wrap-around keeps skipping past disabled
 * edges) and the tab stop is always kept on an enabled item. Used by Tabs,
 * Toolbar, Tree, Accordion, Stepper, NavigationMenu, Menubar.
 */
defineOptions({ name: 'RovingFocusGroup' });

const props = withDefaults(defineProps<RovingFocusGroupProps>(), {
  orientation: Orientation.Horizontal,
  canLoop: true,
});

defineSlots<{
  /** The focusable children that register as arrow-key stops. */
  default(): unknown;
}>();

// Typed as `HTMLElement`, not `HTMLDivElement` — `ShallowRef` is invariant, so
// the narrower element type would not satisfy the context's `groupEl`.
const groupEl = useTemplateRef<HTMLElement>('groupEl');
/** Plain array, not reactive — the ordering is read imperatively, exactly as React's `useRef` list was. */
const items: Array<ItemEntry> = [];
const focusedId = shallowRef<string | null>(null);
const interacted = shallowRef(false);
const direction = useDirection();

function setFocusedId(id: string): void {
  focusedId.value = id;
}

function register(id: string, node: HTMLElement | null): void {
  const existing = items.find((item) => item.id === id);
  if (existing) existing.node = node;
  else {
    const entry: ItemEntry = { id, node };
    // Insert by DOM order (not mount order) so dynamically inserted
    // items navigate in visual order.
    const index = node
      ? items.findIndex(
          (item) =>
            item.node !== null && (node.compareDocumentPosition(item.node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        )
      : -1;
    if (index === -1) items.push(entry);
    else items.splice(index, 0, entry);
  }
  // A disabled item never claims the tab stop — tabindex 0 on an
  // unfocusable element would make the whole group untabbable.
  if (!isNodeDisabled(node)) focusedId.value = focusedId.value ?? id;
}

function unregister(id: string): void {
  const idx = items.findIndex((item) => item.id === id);
  if (idx >= 0) items.splice(idx, 1);
  // If the tab stop unmounts, advance to the next remaining enabled item
  // (wrapping to the first) so the group keeps exactly one tabbable item.
  if (focusedId.value === id) {
    const next = findEnabled(items, idx, 1, true);
    focusedId.value = next ? next.id : null;
  }
}

// Reset the interaction flag when focus leaves the group so tab-stop
// bookkeeping (focusedId updates) never steals focus back.
watch(
  groupEl,
  (node, _previous, onCleanup) => {
    if (!node) return;
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !node.contains(next)) interacted.value = false;
    };
    node.addEventListener('focusout', onFocusOut);
    onCleanup(() => node.removeEventListener('focusout', onFocusOut));
  },
  { immediate: true },
);

function onItemKeyDown(event: KeyboardEvent, id: string): void {
  if (event.defaultPrevented || event.isComposing) return;
  // Keyed children may move without remounting. Resolve visual order when navigating.
  const ordered = DomOrderExtensions.inDocumentOrder(items, (item) => item.node);
  const idx = ordered.findIndex((item) => item.id === id);
  if (idx === -1) return;
  const isVert = props.orientation === Orientation.Vertical || props.orientation === Orientation.Both;
  const isHoriz = props.orientation === Orientation.Horizontal || props.orientation === Orientation.Both;
  // Horizontal arrows mirror in RTL.
  const nextHorizKey = direction.value === Direction.Rtl ? 'ArrowLeft' : 'ArrowRight';
  const prevHorizKey = direction.value === Direction.Rtl ? 'ArrowRight' : 'ArrowLeft';
  // Disabled items are skipped (APG): the search walks past them —
  // wrapping at the edges when canLoop — until an enabled item is
  // found; Home / End land on the first / last *enabled* item.
  let next: ItemEntry | undefined;
  if ((event.key === nextHorizKey && isHoriz) || (event.key === 'ArrowDown' && isVert)) {
    next = findEnabled(ordered, idx + 1, 1, props.canLoop);
  } else if ((event.key === prevHorizKey && isHoriz) || (event.key === 'ArrowUp' && isVert)) {
    next = findEnabled(ordered, idx - 1, -1, props.canLoop);
  } else if (event.key === 'Home') {
    next = findEnabled(ordered, 0, 1, false);
  } else if (event.key === 'End') {
    next = findEnabled(ordered, ordered.length - 1, -1, false);
  } else {
    return;
  }
  event.preventDefault();
  interacted.value = true;
  if (next) focusedId.value = next.id;
}

// Items call this on mount and whenever their disabled attributes mutate —
// keeps the tab stop off disabled items even when disabled state toggles
// long after registration.
function ensureEnabledStop(id: string): void {
  const caller = items.find((item) => item.id === id);
  if (!caller) return;
  const current = focusedId.value;
  // No stop is held (every item registered disabled) — the first
  // enabled caller claims it.
  if (current === null) {
    focusedId.value = isEntryDisabled(caller) ? null : id;
    return;
  }
  // The held stop turned disabled — hand it to the nearest enabled item.
  const heldIdx = items.findIndex((item) => item.id === current);
  const held = heldIdx === -1 ? undefined : items[heldIdx];
  if (held && isEntryDisabled(held)) {
    const next = findNearestEnabled(items, heldIdx);
    focusedId.value = next ? next.id : null;
  }
}

const context: RovingFocusContextValue = {
  register,
  unregister,
  focusedId,
  setFocusedId,
  onItemKeyDown,
  ensureEnabledStop,
  interacted,
  groupEl,
};

provide(RovingFocusKey, context);

defineExpose({ el: groupEl });
</script>

<template>
  <div ref="groupEl" role="group"><slot /></div>
</template>
