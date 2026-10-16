<script lang="ts">
/**
 * The prop surface of `CommandPaletteModalInput`.
 *
 * React declared `Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>`
 * and destructured `placeholder` out of it for a default; attributes reach the
 * `<input>` through `useAttrs` here and the placeholder default is applied from
 * `attrs`, which leaves no declared prop.
 */
export type CommandPaletteModalInputProps = Record<string, never>;

/** The placeholder used when the consumer supplies none. */
const DefaultPlaceholder = 'Type a command…';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { DomOrderExtensions } from '../../../foundation/dom';
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useCommandPaletteContext, type CommandItemEntry } from './CommandPaletteModalContext';

const locale = useLocale();

/** Renders the palette's search field — a `role="combobox"` driving the option list. */
defineOptions({ name: 'CommandPaletteModalInput', inheritAttrs: false });

const attrs = useAttrs();
const context = useCommandPaletteContext();

const el = shallowRef<HTMLInputElement | null>(null);

/* Lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const inputValue = context.inputValue;
const activeId = context.activeId;

function setRef(node: unknown): void {
  const input = (node ?? null) as HTMLInputElement | null;
  el.value = input;
  context.inputEl.value = input;
}

// Keep DOM focus on the input whenever the palette is open.
watch(
  [() => context.open.value, el],
  ([isOpen, input]) => {
    if (isOpen && input) input.focus();
  },
  { flush: 'post' },
);

function visibleItems(): ReadonlyArray<CommandItemEntry> {
  const search = context.inputValue.value;
  return DomOrderExtensions.inDocumentOrder(
    context.items.value.filter((i) => !i.disabled && (search === '' || context.filter(i.searchText, search))),
    (item) => context.inputEl.value?.ownerDocument.getElementById(item.id),
  );
}

// Auto-set first match when the filter or the item registry changes.
watch(
  [() => context.inputValue.value, context.items],
  () => {
    const list = visibleItems();
    if (list.length > 0 && !list.some((i) => i.id === context.activeId.value)) {
      context.setActiveId(list[0]!.id);
    } else if (list.length === 0) {
      context.setActiveId(null);
    }
  },
  { immediate: true, flush: 'post' },
);

function moveActive(direction: 1 | -1): void {
  const list = visibleItems();
  if (list.length === 0) return;
  const index = list.findIndex((i) => i.id === context.activeId.value);
  let nextIndex = index + direction;
  if (index === -1) nextIndex = direction === 1 ? 0 : list.length - 1;
  if (nextIndex < 0) nextIndex = list.length - 1;
  if (nextIndex >= list.length) nextIndex = 0;
  const next = list[nextIndex]!;
  context.setActiveId(next.id);
  el.value?.ownerDocument.getElementById(next.id)?.scrollIntoView({ block: 'nearest' });
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || !context.open.value) return;
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveActive(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveActive(-1);
      break;
    case 'Home': {
      if (event.target !== context.inputEl.value) break;
      const first = visibleItems();
      if (first.length > 0) context.setActiveId(first[0]!.id);
      break;
    }
    case 'End': {
      if (event.target !== context.inputEl.value) break;
      const last = visibleItems();
      if (last.length > 0) context.setActiveId(last[last.length - 1]!.id);
      break;
    }
    case 'Enter': {
      const id = context.activeId.value;
      if (!id) return;
      const entry = visibleItems().find((i) => i.id === id);
      if (!entry || entry.disabled) return;
      event.preventDefault();
      entry.select();
      if (entry.closeOnSelect) context.setOpen(false);
      break;
    }
  }
}

function handleInput(event: Event): void {
  context.setInputValue((event.target as HTMLInputElement).value);
}

const placeholder = computed(
  () =>
    (attrs.placeholder as string | undefined) ??
    locale.t('CommandPaletteModalInput.placeholder', undefined, DefaultPlaceholder),
);

const classes = computed(() =>
  cn(
    'flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-subtle-foreground outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class` and `placeholder`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, placeholder: _placeholder, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div class="flex items-center gap-2 border-b border-border px-3">
    <Icon :icon="Search" :size="16" class="text-muted-foreground" />
    <!-- `v-bind="rest"` comes FIRST here, deliberately: React spread `{...rest}`
         ahead of its own bindings on this element, so `id` / `role` / `value` and
         the ARIA wiring cannot be overridden. `@keydown` still chains after a
         consumer's, which is what makes the `defaultPrevented` check meaningful. -->
    <input
      v-bind="rest"
      :id="context.inputId"
      :ref="setRef"
      type="text"
      role="combobox"
      aria-expanded="true"
      :aria-controls="context.listboxId"
      :aria-activedescendant="activeId ?? undefined"
      aria-autocomplete="list"
      :placeholder="placeholder"
      :value="inputValue"
      :class="classes"
      @input="handleInput"
      @keydown="handleKeydown"
    />
  </div>
</template>
