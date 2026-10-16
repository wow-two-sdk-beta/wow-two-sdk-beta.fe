<script lang="ts">
/**
 * The prop surface of `Menubar`.
 *
 * React declared `extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'>`;
 * attributes reach the root through `useAttrs` here, which leaves the active-menu
 * value pair. React's `onValueChange` is the `update:modelValue` emit.
 */
export interface MenubarProps {
  /** The id of the currently-open menu, or `null` if none. Controlled. */
  readonly modelValue?: string | null;

  /** The initially-open menu id when uncontrolled. Default `null`. */
  readonly defaultValue?: string | null;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { NavExtensions } from '../NavExtensions';
import { DomOrderExtensions } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { RovingFocusGroup, type ComponentElement } from '../../../foundation/primitives';
import { menubarContextKey, type MenubarTriggerEntry } from './MenubarContext';
import { menubarVariants } from './Menubar.variants';

/** Renders the application menu bar — one composite tab stop holding a single menu open at a time. */
defineOptions({ name: 'Menubar', inheritAttrs: false });

/** The `MenubarMenu` children — React's `children`. */
defineSlots<{ default(): unknown }>();

/** `modelValue` defaults to `undefined` — the tri-state that separates "controlled to null" from "uncontrolled". */
const props = withDefaults(defineProps<MenubarProps>(), {
  modelValue: undefined,
  defaultValue: null,
});

const emit = defineEmits<{
  /** Fires when the reader opens a different menu — carries its id, or `null` once all close. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();
const el = useTemplateRef<ComponentElement>('el');

const { value: activeId, setValue: setActiveId } = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => emit('update:modelValue', next),
});

/** Plain array, not reactive — the ordering is read imperatively, exactly as React's `useRef` list was. */
const triggers: Array<MenubarTriggerEntry> = [];

function registerTrigger(id: string, triggerEl: HTMLButtonElement | null): void {
  const index = triggers.findIndex((t) => t.id === id);
  if (index >= 0) triggers[index] = { id, el: triggerEl };
  else triggers.push({ id, el: triggerEl });
}

function unregisterTrigger(id: string): void {
  const index = triggers.findIndex((t) => t.id === id);
  if (index >= 0) triggers.splice(index, 1);
}

function moveAcross(fromId: string, direction: 1 | -1): void {
  const ordered = DomOrderExtensions.inDocumentOrder(triggers, (item) => item.el).filter(
    (item) => !NavExtensions.isDisabled(item.el),
  );
  const index = ordered.findIndex((t) => t.id === fromId);
  if (index === -1) return;
  const root = rootElement.value;
  const rtl = root && root.ownerDocument.defaultView?.getComputedStyle(root).direction === 'rtl';
  let nextIndex = index + (rtl ? -direction : direction);
  if (nextIndex < 0) nextIndex = ordered.length - 1;
  if (nextIndex >= ordered.length) nextIndex = 0;
  const next = ordered[nextIndex];
  if (!next) return;
  next.el?.focus();
  // If a menu is already open, switch the open menu to follow focus.
  if (activeId.value !== null) setActiveId(next.id);
}

provide(menubarContextKey, {
  activeId,
  setActiveId,
  registerTrigger,
  unregisterTrigger,
  moveAcross,
});

const classes = computed(() => cn(menubarVariants(), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Exposes the child's documented DOM handle, never its component instance. */
const rootElement = computed<HTMLElement | null>(() => {
  const node = el.value?.el;
  const elementType = node?.ownerDocument.defaultView?.HTMLElement;
  return elementType && node instanceof elementType ? node : null;
});

defineExpose({ el: rootElement });
</script>

<template>
  <!-- Roving tabindex (APG): the menubar is a single composite tab stop — one
       trigger holds tabindex 0, arrows / Home / End rove focus. `role` falls
       through and replaces the primitive's own `role="group"`. -->
  <RovingFocusGroup ref="el" orientation="horizontal" can-loop role="menubar" v-bind="rest" :class="classes">
    <slot />
  </RovingFocusGroup>
</template>
