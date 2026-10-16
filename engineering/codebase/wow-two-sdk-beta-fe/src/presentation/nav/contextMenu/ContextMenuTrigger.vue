<script lang="ts">
/**
 * The prop surface of `ContextMenuTrigger`.
 *
 * React declared `extends HTMLAttributes<HTMLDivElement>`; attributes reach the
 * root through `useAttrs` here, which leaves `asChild` and `isDisabled`.
 */
export interface ContextMenuTriggerProps {
  /** The as-child toggle — renders the trigger as its single slot child. */
  readonly asChild?: boolean;

  /** The disabled state — blocks both the right-click and the long-press open. */
  readonly isDisabled?: boolean;
}

/** The long-press duration, in ms, that opens the menu on touch. */
const LongPressMs = 600;

/** Build a zero-size virtual element at coordinates to anchor Floating UI. */
function makeVirtualAnchor(x: number, y: number, document: Document): HTMLElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = '0px';
  el.style.height = '0px';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  return el;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, onScopeDispose, useAttrs, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { Primitive } from '../../../foundation/primitives';
import { NavExtensions } from '../NavExtensions';
import { useContextMenuContext } from './ContextMenuContext';

/** Renders the region a right-click, or a touch long-press, opens the menu over. */
defineOptions({ name: 'ContextMenuTrigger', inheritAttrs: false });

/** The region's content — React's `children`. */
defineSlots<{ default(): unknown }>();

/** `isDisabled` defaults to `undefined`, not `false` — an absent optional boolean must stay absent. */
const props = withDefaults(defineProps<ContextMenuTriggerProps>(), {
  asChild: false,
  isDisabled: undefined,
});

const attrs = useAttrs();
const context = useContextMenuContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let pointerFocusCaptured = false;
let pressOrigin: { x: number; y: number; pointerId: number } | null = null;

watch(
  inner,
  (instance) => {
    context.triggerEl.value = NavExtensions.toHtmlElement(instance?.$el);
  },
  { immediate: true, flush: 'post' },
);

function clearLongPress(): void {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
  pressOrigin = null;
}

// Clear a pending long-press timer if the trigger unmounts mid-press.
onScopeDispose(clearLongPress);

function captureReturnFocus(): void {
  if (context.open.value) return;
  const document = el.value?.ownerDocument;
  const active = document?.activeElement;
  context.restoreFocus.current =
    active && active !== document?.body && 'focus' in active ? (active as HTMLElement) : el.value;
}

function openAt(x: number, y: number): void {
  const document = el.value?.ownerDocument;
  if (!document || props.isDisabled) return;
  context.setAnchor(makeVirtualAnchor(x, y, document));
  context.setOpen(true);
}

function handleContextMenu(event: MouseEvent): void {
  clearLongPress();
  if (event.defaultPrevented || props.isDisabled) return;
  event.preventDefault();
  if (!pointerFocusCaptured) captureReturnFocus();
  pointerFocusCaptured = false;
  openAt(event.clientX, event.clientY);
}

function handlePointerDown(event: PointerEvent): void {
  clearLongPress();
  if (event.defaultPrevented || props.isDisabled) return;
  pointerFocusCaptured = event.button === 2 || event.pointerType === 'touch';
  if (pointerFocusCaptured) captureReturnFocus();
  if (event.pointerType !== 'touch' || !event.isPrimary) return;
  const x = event.clientX;
  const y = event.clientY;
  pressOrigin = { x, y, pointerId: event.pointerId };
  longPressTimer = setTimeout(() => {
    clearLongPress();
    openAt(x, y);
  }, LongPressMs);
}

function handlePointerMove(event: PointerEvent): void {
  if (!pressOrigin || event.pointerId !== pressOrigin.pointerId) return;
  if (Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > 8) clearLongPress();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || props.isDisabled) return;
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
  event.preventDefault();
  clearLongPress();
  captureReturnFocus();
  const rect = el.value?.getBoundingClientRect();
  if (rect) openAt(rect.left, rect.bottom);
}

watch(
  () => props.isDisabled,
  (disabled) => {
    if (disabled) clearLongPress();
  },
);

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <!-- `v-bind="attrs"` before the own handlers, so a consumer's `contextmenu` /
       `pointerdown` handler runs first — React's `onContextMenu?.(e)` order,
       which is what makes the `defaultPrevented` opt-out work. -->
  <Primitive
    ref="inner"
    as="div"
    :as-child="asChild"
    :tabindex="props.isDisabled ? -1 : 0"
    aria-haspopup="menu"
    :aria-expanded="context.open.value"
    :aria-disabled="props.isDisabled || undefined"
    v-bind="attrs"
    @contextmenu="handleContextMenu"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @keydown="handleKeydown"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
  >
    <slot />
  </Primitive>
</template>
