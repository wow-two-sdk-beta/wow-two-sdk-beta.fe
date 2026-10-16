<script lang="ts">
export interface FocusScopeProps {
  /** Wrap Tab and Shift+Tab at the scope edges. Default false. */
  readonly canLoop?: boolean;
  /** @deprecated Use `canLoop`; this alias is removed next release. */
  readonly loop?: boolean;
  /** Recover focus when it leaves this scope and its logical portal descendants. */
  readonly isTrapped?: boolean;
  /** @deprecated Use `isTrapped`; this alias is removed next release. */
  readonly trapped?: boolean;
  /** Make background content inert while this modal scope is mounted. Default false. */
  readonly isModal?: boolean;
  /** @deprecated Use `isModal`; this alias is removed next release. */
  readonly modal?: boolean;
  /** Cancel the initial focus move with preventDefault(). */
  readonly onMountAutoFocus?: (event: CustomEvent) => void;
  /** Cancel restoration to the opening control with preventDefault(). */
  readonly onUnmountAutoFocus?: (event: CustomEvent) => void;
  /** Merge into the single slot child instead of rendering a wrapper div. */
  readonly asChild?: boolean;
  /** Resolve a pre-gesture return target at teardown; scope ownership still governs restoration. */
  readonly returnFocus?: () => HTMLElement | null;
}

const FocusableSelector = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';

function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.matches(':disabled,input[type="hidden"]')) return false;
  if (element.closest('[inert],[hidden],[aria-hidden="true"]')) return false;
  return (
    element.checkVisibility?.({ visibilityProperty: true, contentVisibilityAuto: true }) ??
    element.getClientRects().length > 0
  );
}
</script>

<script setup lang="ts">
import { inject, onBeforeMount, onMounted, onScopeDispose, provide, useTemplateRef, watch } from 'vue';
import { Primitive } from '../slot';
import type { ComponentElement } from '../slot/ComponentElement';
import {
  FocusScopeKey,
  isFocusScopeRegistered,
  registerFocusScope,
  refreshFocusScope,
  scopeContains,
  scopeContainers,
  topFocusScope,
  type FocusScopeEntry,
} from './FocusScopeRegistry';

/** Renders a focus scope with logical portal ancestry, modal background isolation and focus restoration. */
defineOptions({ name: 'FocusScope' });
const props = withDefaults(defineProps<FocusScopeProps>(), {
  canLoop: undefined,
  loop: undefined,
  isTrapped: undefined,
  trapped: undefined,
  isModal: undefined,
  modal: undefined,
  asChild: false,
});

/* Each flag reads its prefixed name first, then the deprecated alias. */
const loops = (): boolean => props.canLoop ?? props.loop ?? false;
const traps = (): boolean => props.isTrapped ?? props.trapped ?? false;
const isModalScope = (): boolean => props.isModal ?? props.modal ?? false;

defineSlots<{ default(): unknown }>();
const scope = useTemplateRef<ComponentElement>('scope');
const parent = inject(FocusScopeKey, null);
let previouslyFocused: HTMLElement | null = null;
let lastFocused: HTMLElement | null = null;
let unregister: (() => void) | null = null;

function containerEl(): HTMLElement | null {
  const candidate = scope.value?.$el;
  return candidate?.nodeType === 1 ? candidate : null;
}

function focusableItems(): HTMLElement[] {
  const nodes = scopeContainers(entry).flatMap((container) =>
    Array.from(container.querySelectorAll<HTMLElement>(FocusableSelector)),
  );
  return [...new Set(nodes)].filter(isFocusable);
}

function focusFirst(): void {
  const container = containerEl();
  if (!container) return;
  const previous = lastFocused;
  const target =
    previous?.isConnected && scopeContains(entry, previous) && isFocusable(previous)
      ? previous
      : (focusableItems()[0] ?? container);
  target.focus({ preventScroll: true });
}

const entry: FocusScopeEntry = {
  parent,
  node: containerEl,
  trapped: traps,
  modal: isModalScope,
  recover: focusFirst,
  onKeydown,
  captureReturnFocus: (document) => {
    if (previouslyFocused?.ownerDocument === document) return;
    const active = document.activeElement;
    previouslyFocused = active && 'focus' in active ? (active as HTMLElement) : null;
  },
};
provide(FocusScopeKey, entry);

onBeforeMount(() => {
  const active = typeof document === 'undefined' ? null : document.activeElement;
  previouslyFocused = active && 'focus' in active ? (active as HTMLElement) : null;
});

onMounted(() => {
  const container = containerEl();
  if (!container) return;
  // Descendants mount first; seed unmounted ancestors before a portal moves focus.
  for (let current: FocusScopeEntry | null = entry; current; current = current.parent) {
    current.captureReturnFocus(container.ownerDocument);
  }
  unregister = registerFocusScope(entry);
  if (scopeContains(entry, container.ownerDocument.activeElement)) return;
  const event = new CustomEvent('focusScope.autoFocusOnMount', { cancelable: true });
  props.onMountAutoFocus?.(event);
  container.dispatchEvent(event);
  if (!event.defaultPrevented) focusFirst();
});

onScopeDispose(() => {
  const container = containerEl();
  const document = container?.ownerDocument;
  const active = document?.activeElement ?? null;
  const ownedFocus = isFocusScopeRegistered(entry) && (active === document?.body || scopeContains(entry, active));
  unregister?.();
  unregister = null;
  const event = new CustomEvent('focusScope.autoFocusOnUnmount', { cancelable: true });
  props.onUnmountAutoFocus?.(event);
  if (!event.defaultPrevented && ownedFocus && document) {
    const top = topFocusScope(document);
    const target = props.returnFocus?.() ?? previouslyFocused;
    if (target?.isConnected && !target.closest('[inert]') && (!top || scopeContains(top, target))) {
      target.focus({ preventScroll: true });
    } else top?.recover();
  }
  previouslyFocused = null;
  lastFocused = null;
});

watch(
  () => [traps(), isModalScope()],
  () => refreshFocusScope(entry),
  { flush: 'post' },
);

function onFocusin(event: FocusEvent): void {
  if (event.target && 'focus' in event.target) lastFocused = event.target as HTMLElement;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.defaultPrevented || (!loops() && !traps())) return;
  const container = containerEl();
  if (!container) return;
  const top = topFocusScope(container.ownerDocument);
  if (top && top !== entry) return;
  const items = focusableItems();
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    if (traps()) event.preventDefault();
    return;
  }
  const active = container.ownerDocument.activeElement;
  const atEdge = event.shiftKey ? active === first || active === container : active === last || active === container;
  if (!atEdge) return;
  event.preventDefault();
  if (loops()) (event.shiftKey ? last : first).focus({ preventScroll: true });
}
</script>

<template>
  <Primitive ref="scope" :as-child="props.asChild" tabindex="-1" @focusin="onFocusin" @keydown="onKeydown">
    <slot />
  </Primitive>
</template>
