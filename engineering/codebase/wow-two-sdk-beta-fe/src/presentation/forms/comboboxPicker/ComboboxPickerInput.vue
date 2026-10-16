<script lang="ts">
import type { InputSize, InputState } from '../InputStyles';

export interface ComboboxPickerInputProps {
  /** The control size. */
  readonly size?: InputSize;

  /** The validity surface. */
  readonly state?: InputState;
}
/* React also inherited `Omit<InputBaseVariants, 'size' | 'state'>` — the `border` / `ring`
   axes — but never forwarded them to `inputBaseVariants`, so they were dead props that landed
   on the DOM as unknown attributes. Only the two axes the original consumed are declared here. */
</script>

<script setup lang="ts">
import { DomOrderExtensions } from '../../../foundation/dom';
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';
import { useComboboxContext } from './ComboboxPickerContext';

/** Renders the text box driving the combobox — it opens the panel, filters rows, and owns arrow-key nav. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call. */
defineOptions({ name: 'ComboboxPickerInput', inheritAttrs: false });

const props = defineProps<ComboboxPickerInputProps>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useComboboxContext();

const inputState = computed(() => props.state ?? (ctx.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

function setRef(node: unknown): void {
  ctx.inputEl.value = (node ?? null) as HTMLInputElement | null;
}

/* `document` is reached only from a keydown handler, which cannot fire during SSR. */
function setActiveAndScroll(id: string): void {
  ctx.setActiveId(id);
  ctx.inputEl.value?.ownerDocument.getElementById(id)?.scrollIntoView({ block: 'nearest' });
}

function enabledItems() {
  return DomOrderExtensions.inDocumentOrder(
    ctx.items.filter((item) => !item.isDisabled),
    (item) => ctx.inputEl.value?.ownerDocument.getElementById(item.id),
  );
}

function moveActive(direction: 1 | -1): void {
  const list = enabledItems();
  if (list.length === 0) return;
  const idx = list.findIndex((i) => i.id === ctx.activeId);
  let nextIdx = idx + direction;
  if (idx === -1) nextIdx = direction === 1 ? 0 : list.length - 1;
  if (nextIdx < 0) nextIdx = list.length - 1;
  if (nextIdx >= list.length) nextIdx = 0;
  const next = list[nextIdx];
  if (next) setActiveAndScroll(next.id);
}

/* Runs after any caller-supplied `@keydown` (declared after `v-bind`), exactly as React's
   `onKeyDown?.(e)` ran before this body. */
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented || ctx.isDisabled) return;
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!ctx.open) ctx.setOpen(true);
      else moveActive(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (!ctx.open) ctx.setOpen(true);
      else moveActive(-1);
      break;
    case 'Home':
      if (ctx.open) {
        event.preventDefault();
        const first = enabledItems()[0];
        if (first) setActiveAndScroll(first.id);
      }
      break;
    case 'End':
      if (ctx.open) {
        event.preventDefault();
        const list = enabledItems();
        const last = list[list.length - 1];
        if (last) setActiveAndScroll(last.id);
      }
      break;
    case 'Tab':
      /* Lets focus move on — DismissableLayer only closes on pointer/Escape. */
      if (ctx.open) ctx.setOpen(false);
      break;
    case 'Enter': {
      if (!ctx.open || !ctx.activeId) return;
      const entry = ctx.items.find((i) => i.id === ctx.activeId);
      if (!entry || entry.isDisabled) return;
      event.preventDefault();
      ctx.selectItem(entry);
      break;
    }
    case 'Escape':
      if (ctx.open) {
        event.preventDefault();
        ctx.setOpen(false);
      } else if (ctx.inputValue) {
        event.preventDefault();
        ctx.setInputValue('');
        ctx.setValue('');
      }
      break;
  }
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  ctx.setInputValue((event.target as HTMLInputElement).value);
  if (!ctx.open) ctx.setOpen(true);
  // Clear active when input changes — re-seeded by ComboboxPickerContent's clamp.
  ctx.setActiveId(null);
}

function onFocus(): void {
  if (!ctx.open) ctx.setOpen(true);
}

function onBlur(event: FocusEvent): void {
  /* `relatedTarget === null` = pointer interaction — DismissableLayer owns that path. */
  const next = event.relatedTarget as Node | null;
  if (!next || !ctx.open) return;
  if (ctx.inputEl.value?.contains(next)) return;
  if (ctx.contentEl.value?.contains(next)) return;
  ctx.setOpen(false);
}

/* Only while open — options unmount on close but `activeId` state survives, and a dangling id
   is an axe aria-valid-attr-value hit. */
const activeDescendant = computed(() => (ctx.open ? (ctx.activeId ?? undefined) : undefined));

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const inputClass = computed(() =>
  cn(inputBaseVariants({ size: props.size, state: inputState.value }), attrs.class as ClassValue),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: ctx.inputEl });
</script>

<template>
  <input
    :ref="setRef"
    type="text"
    role="combobox"
    :aria-expanded="ctx.open"
    :aria-controls="ctx.listboxId"
    :aria-activedescendant="activeDescendant"
    aria-autocomplete="list"
    :aria-disabled="ctx.isDisabled || undefined"
    :disabled="ctx.isDisabled"
    :value="ctx.inputValue"
    :class="inputClass"
    v-bind="passthroughAttrs"
    @input="onInput"
    @compositionend="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeydown"
  />
</template>
