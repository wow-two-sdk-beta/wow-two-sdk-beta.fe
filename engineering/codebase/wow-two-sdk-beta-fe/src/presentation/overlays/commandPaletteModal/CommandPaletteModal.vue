<script lang="ts">
/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface CommandPaletteModalProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The search text, controlled. The `v-model:input-value` binding target. */
  readonly inputValue?: string;

  /** The initial search text when uncontrolled. Default `''`. */
  readonly defaultInputValue?: string;

  /** The key that opens the palette with ⌘/Ctrl. Omit to bind no global shortcut. */
  readonly triggerKey?: string;

  /** The match predicate. Default case-insensitive substring. */
  readonly filter?: (searchText: string, search: string) => boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { useHotkeys } from '../../../foundation/shortcuts';
import { Modal } from '../modal';
import { commandPaletteContextKey, defaultFilter, type CommandItemEntry } from './CommandPaletteModalContext';

/**
 * Renders the command palette inside a `Modal`, owning open state, search text, and the registry.
 * Its `CommandPaletteModalItem` children register themselves with this root.
 */
defineOptions({ name: 'CommandPaletteModal', inheritAttrs: false });

/** The palette tree — `CommandPaletteModalContent` and its parts. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<CommandPaletteModalProps>(), {
  open: undefined,
  defaultOpen: false,
  inputValue: undefined,
  defaultInputValue: undefined,
  triggerKey: undefined,
  filter: defaultFilter,
});

const emit = defineEmits<{
  /** Fires when the palette opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader edits the search text — the `v-model:input-value` half. */
  'update:inputValue': [input: string];
}>();

const openState = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const inputState = useControlled<string>({
  controlled: () => props.inputValue,
  default: () => props.defaultInputValue ?? '',
  onChange: (value) => {
    emit('update:inputValue', value);
  },
});

const items = shallowRef<ReadonlyArray<CommandItemEntry>>([]);
const activeId = shallowRef<string | null>(null);
const inputEl = shallowRef<HTMLInputElement | null>(null);
const inputId = useId();
const listboxId = useId();

function registerItem(entry: CommandItemEntry): void {
  const next = items.value.slice();
  const index = next.findIndex((i) => i.id === entry.id);
  if (index >= 0) next[index] = entry;
  else next.push(entry);
  items.value = next;
}

function unregisterItem(id: string): void {
  items.value = items.value.filter((i) => i.id !== id);
}

/* Global keybinding (cmd-/ctrl-K). `mod` = ⌘ on Apple / Ctrl elsewhere; the explicit `ctrl+`/`meta+` pair keeps
   the spec's "we accept both on every platform" contract. The chord must always parse (`+` is the token
   separator → `plus`; a falsy `triggerKey` needs a placeholder), so `enabled` — not an early return — unbinds. */
const chordKey = computed(() => {
  const key = props.triggerKey;
  return !key ? 'k' : key === '+' ? 'plus' : key;
});

useHotkeys(
  () => [`mod+${chordKey.value}`, `ctrl+${chordKey.value}`, `meta+${chordKey.value}`],
  () => openState.setValue(true),
  { enabled: () => Boolean(props.triggerKey) },
);

// Reset the active id on close.
watch(
  () => openState.value.value,
  (isOpen) => {
    if (!isOpen) activeId.value = null;
  },
  { flush: 'post' },
);

provide(commandPaletteContextKey, {
  open: openState.value,
  setOpen: openState.setValue,
  inputValue: inputState.value,
  setInputValue: inputState.setValue,
  activeId,
  setActiveId: (id: string | null) => {
    activeId.value = id;
  },
  items,
  registerItem,
  unregisterItem,
  /* Wrapped rather than stored, so a `filter` prop change is picked up live —
     React re-created the whole context value for the same effect. */
  filter: (searchText: string, search: string) => props.filter(searchText, search),
  inputId,
  listboxId,
  inputEl,
});

/* Lifted to a setup const so the template auto-unwraps it. Named `resolvedOpen`
   rather than `open` — that name is already a declared prop here. */
const resolvedOpen = openState.value;
</script>

<template>
  <Modal :open="resolvedOpen" @update:open="openState.setValue"><slot /></Modal>
</template>
