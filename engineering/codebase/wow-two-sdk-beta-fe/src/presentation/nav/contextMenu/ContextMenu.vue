<script lang="ts">
/**
 * The prop surface of `ContextMenu`.
 *
 * React declared only `children`, which is the default slot here — leaving no
 * declared prop. The root owns its open state outright; there is no controlled
 * form to mirror.
 */
export type ContextMenuProps = Record<string, never>;
</script>

<script setup lang="ts">
import { onScopeDispose, provide, shallowRef } from 'vue';
import { contextMenuContextKey } from './ContextMenuContext';

/**
 * Renders only its slot, owning the open state and anchor point of the ContextMenu tree below.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'ContextMenu', inheritAttrs: false });

/** The ContextMenu tree — `ContextMenuTrigger` and `ContextMenuContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

const open = shallowRef(false);
const anchor = shallowRef<HTMLElement | null>(null);
const triggerEl = shallowRef<HTMLElement | null>(null);
const restoreFocus: { current: HTMLElement | null } = { current: null };

/** Detaches the outgoing body-appended virtual anchor before adopting the new one. */
function setAnchor(el: HTMLElement | null): void {
  const previous = anchor.value;
  if (previous && previous.parentNode === previous.ownerDocument.body) {
    previous.remove();
  }
  anchor.value = el;
}

function setOpen(next: boolean): void {
  if (next && !open.value) {
    const document = triggerEl.value?.ownerDocument;
    const active = document?.activeElement;
    restoreFocus.current ??= active && 'focus' in active ? (active as HTMLElement) : triggerEl.value;
  }
  open.value = next;
  if (!next) setAnchor(null);
}

onScopeDispose(() => setAnchor(null));

provide(contextMenuContextKey, { open, setOpen, anchor, setAnchor, triggerEl, restoreFocus });
</script>

<template>
  <slot />
</template>
