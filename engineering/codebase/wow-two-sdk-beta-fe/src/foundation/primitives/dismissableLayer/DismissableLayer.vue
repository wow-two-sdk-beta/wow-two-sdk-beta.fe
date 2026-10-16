<script lang="ts">
import type { HTMLAttributes, InjectionKey } from 'vue';

export interface DismissableLayerProps extends /* @vue-ignore */ HTMLAttributes {
  /** Fires when Escape is pressed and this is the topmost layer. */
  readonly onEscape?: (event: KeyboardEvent) => void;
  /** Fires when a pointerdown lands outside the topmost layer. */
  readonly onOutsidePointerDown?: (event: PointerEvent) => void;
  /** Suppress Escape for this layer without activating an underlying layer. */
  readonly isEscapeDisabled?: boolean;
  /** Suppress outside dismissal without activating an underlying layer. */
  readonly isOutsideClickDisabled?: boolean;
}

interface LayerEntry {
  readonly parent: LayerEntry | null;
  readonly node: () => HTMLElement | null;
  readonly onEscape: (event: KeyboardEvent) => void;
  readonly onOutsidePointerDown: (event: PointerEvent) => void;
}

const LayerKey: InjectionKey<LayerEntry> = Symbol('DismissableLayer');
const LayerStacks = new WeakMap<Document, LayerEntry[]>();
const HandledEvents = new WeakSet<Event>();

function isDescendant(entry: LayerEntry, ancestor: LayerEntry): boolean {
  for (let current: LayerEntry | null = entry; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}
</script>

<script setup lang="ts">
import { inject, onMounted, onScopeDispose, provide, useTemplateRef } from 'vue';

/** Renders the topmost Escape/outside-dismiss layer, preserving logical nesting across Teleport. */
defineOptions({ name: 'DismissableLayer' });
const props = defineProps<DismissableLayerProps>();
defineSlots<{ default(): unknown }>();
const el = useTemplateRef<HTMLDivElement>('el');
const parent = inject(LayerKey, null);
const entry: LayerEntry = {
  parent,
  node: () => el.value,
  onEscape: (event) => {
    if (!props.isEscapeDisabled) props.onEscape?.(event);
  },
  onOutsidePointerDown: (event) => {
    if (!props.isOutsideClickDisabled) props.onOutsidePointerDown?.(event);
  },
};
provide(LayerKey, entry);
let cleanup: (() => void) | null = null;

onMounted(() => {
  const document = el.value?.ownerDocument;
  if (!document) return;
  const stack = LayerStacks.get(document) ?? [];
  LayerStacks.set(document, stack);
  const descendant = stack.findIndex((candidate) => isDescendant(candidate, entry));
  if (descendant < 0) stack.push(entry);
  else stack.splice(descendant, 0, entry);
  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      stack.at(-1) !== entry ||
      event.key !== 'Escape' ||
      event.isComposing ||
      event.defaultPrevented ||
      HandledEvents.has(event)
    )
      return;
    HandledEvents.add(event);
    entry.onEscape(event);
  };
  const onPointer = (event: PointerEvent): void => {
    const node = el.value;
    if (stack.at(-1) !== entry || !node || HandledEvents.has(event)) return;
    HandledEvents.add(event);
    const target = event.target as Node | null;
    if (event.composedPath().includes(node) || (target && node.contains(target))) return;
    entry.onOutsidePointerDown(event);
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointer, true);
  cleanup = () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onPointer, true);
    const index = stack.indexOf(entry);
    if (index >= 0) stack.splice(index, 1);
    if (stack.length === 0) LayerStacks.delete(document);
  };
});
onScopeDispose(() => {
  cleanup?.();
  cleanup = null;
});
defineExpose({ el });
</script>

<template>
  <div ref="el"><slot /></div>
</template>
