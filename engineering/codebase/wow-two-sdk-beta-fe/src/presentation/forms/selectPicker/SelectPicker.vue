<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { EqualityComparer } from '../../../foundation/collections';
import type { SelectPickerOption } from './SelectPickerContext';

/** Represents the prop surface of the `SelectPicker` root. */
export interface SelectPickerProps<K, V = K> {
  /** The selected key, controlled — the `v-model` target. `null` = explicit clear, `undefined` = uncontrolled. */
  readonly modelValue?: K | null;

  /** The initial selected key for uncontrolled use. */
  readonly defaultValue?: K | null;

  /** The equality comparer for keys; defaults to `Equality.strictEquals`. */
  readonly keyEquals?: EqualityComparer<K>;

  /** The disabled state, blocking interaction when true. */
  readonly isDisabled?: boolean;

  /** Prevents selection changes while preserving the submitted value. */
  readonly isReadOnly?: boolean;

  /** The loading state, showing a spinner in the trigger and blocking interaction. */
  readonly isLoading?: boolean;

  /** The label for the loading state on the polite live region + in-list row; defaults to `'Loading options…'`. */
  readonly loadingLabel?: string;

  /** The clearable state, rendering a clear (×) button in the trigger when a value is set. */
  readonly isClearable?: boolean;

  /** The label for the clear (×) button for assistive tech; defaults to `'Clear selection'`. */
  readonly clearLabel?: string;

  /** The name of the hidden form input that ships the serialized key. */
  readonly name?: string;

  /** The key serializer for the hidden form input; defaults to `String(key)`. */
  readonly serializeKey?: (key: K) => string;

  /** The label resolver for a key no option carries, and for the server render; options win when present.
   *  Slotted `SelectPickerItem`s label a closed trigger on their own. */
  readonly getOptionLabel?: (key: K) => string | number | null;

  /** The option set seeded into the item registry + label cache on mount, server render included.
   *  `<SelectPickerItem>` children still render the list; a mounted child wins on a shared key (via
   *  `keyEquals`). When it labels the selection, the closed panel skips its off-document item mount. */
  readonly options?: ReadonlyArray<SelectPickerOption<K, V>>;

  /** The invalid state, styling the trigger as invalid (red border, error ring). */
  readonly isInvalid?: boolean;

  /** The initial open state of the dropdown when uncontrolled. */
  readonly defaultOpen?: boolean;

  /** The dropdown open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The floating placement of the dropdown. */
  readonly placement?: Placement;
}
</script>

<script setup lang="ts" generic="K, V = K">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, provide, ref, shallowRef, watch } from 'vue';
import { Equality } from '../../../foundation/collections';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { Popover } from '../../overlays';
import {
  extractText,
  selectContextKey,
  type ItemRegistryEntry,
  type SelectPickerContextValue,
} from './SelectPickerContext';
import { useFormControl } from '../../../foundation/primitives';

/** Renders a single-choice dropdown — the popover hosting trigger and panel, plus the hidden key input. */
defineOptions({ name: 'SelectPicker', inheritAttrs: false });

/** The SelectPicker tree — `SelectPickerTrigger` and `SelectPickerContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

const inputProps = withDefaults(defineProps<SelectPickerProps<K, V>>(), {
  isLoading: false,

  isClearable: false,

  defaultOpen: false,
  placement: 'bottom',
  /* Explicit `undefined` defaults are load-bearing: `useControlled` keys on `=== undefined`,
     and Vue casts an absent `boolean` prop to `false`. Without these, `open` would
     read as "controlled, and closed" — pinning the dropdown shut and making `defaultOpen`
     dead — and `isDisabled`/`isInvalid` would shadow the surrounding `<Field>` context. */
  open: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
});
const props = inputProps;
const labels = useLocaleDefaults(
  {
    get loadingLabel() {
      return inputProps.loadingLabel;
    },
    get clearLabel() {
      return inputProps.clearLabel;
    },
  },
  'SelectPicker',
  { loadingLabel: 'Loading options…', clearLabel: 'Clear selection' },
);

const emit = defineEmits<{
  /** Fires when the reader picks an option or clears it — the `v-model` half, carrying the key. */
  'update:modelValue': [key: K | null];
  /** Fires when the reader opens or dismisses the dropdown — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

/* `field` is a live-getter object — read fields off it, never destructure. */
const field = useFormControl();

const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value || props.isLoading);
const finalInvalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

const openCtl = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const keyCtl = useControlled<K | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (value) => emit('update:modelValue', value),
});

/* Reactive, unlike ListboxPicker's plain array: `SelectPickerValue` resolves its label from this set and
   `SelectPickerContent` counts visible rows off it, both at render time. Keyed by option instance: a closed
   panel's off-document collection and the panel's own rows overlap while the panel opens or animates out. */
const registrations = shallowRef<ReadonlyArray<{ owner: symbol; entry: ItemRegistryEntry }>>([]);

/* Labels survive panel unmount. Keys retain identity; serialization is only a wire concern. */
const labelCache = new Map<unknown, string | number>();
function cachedKey(key: unknown): unknown {
  if (!props.keyEquals || labelCache.has(key)) return key;
  for (const existing of labelCache.keys()) if (keyEqualsFn.value(existing, key)) return existing;
  return key;
}
function cacheLabel(key: unknown, label: string | number): void {
  labelCache.set(cachedKey(key), label);
}

const query = ref('');
const activeDescendant = ref<string | null>(null);
const listboxId = useId('select-listbox');
const listboxEl = shallowRef<HTMLElement | null>(null);

/* Captures `{ itemKey, label }` at selection time, keeping the label while the panel's rows hand over to
   the closed panel's collection. */
const selectedEntry = shallowRef<{ itemKey: unknown; label: string | number } | null>(null);

const keyEqualsFn = computed<EqualityComparer<unknown>>(
  () => (props.keyEquals as EqualityComparer<unknown> | undefined) ?? Equality.strictEquals,
);

const serializeKeyFn = computed<(key: unknown) => string>(
  () => (props.serializeKey as ((key: unknown) => string) | undefined) ?? ((key) => String(key)),
);

function getOptionLabelFn(key: unknown): string | number | null {
  const fn = props.getOptionLabel as ((key: unknown) => string | number | null) | undefined;
  return fn ? fn(key) : null;
}

function registerItem(owner: symbol, entry: ItemRegistryEntry): void {
  /* Persist the label so a closed trigger can still resolve it after this item unmounts. */
  cacheLabel(entry.itemKey, entry.label);
  const list = registrations.value;
  const idx = list.findIndex((r) => r.owner === owner);
  if (idx === -1) {
    registrations.value = [...list, { owner, entry }];
    return;
  }
  const existing = list[idx]?.entry;
  if (
    existing &&
    Object.is(existing.itemKey, entry.itemKey) &&
    existing.label === entry.label &&
    existing.text === entry.text &&
    existing.isDisabled === entry.isDisabled &&
    Object.is(existing.value, entry.value)
  ) {
    return;
  }
  const next = list.slice();
  next[idx] = { owner, entry };
  registrations.value = next;
}

/* Drops the option instance on unmount so a removed option no longer satisfies search, typeahead or value
   resolution. The label stays in `labelCache`, so the trigger keeps its label after close. */
function unregisterItem(owner: symbol): void {
  const list = registrations.value;
  if (!list.some((r) => r.owner === owner)) return;
  registrations.value = list.filter((r) => r.owner !== owner);
}

/* One entry per key, first registration first, so the collection and the open panel never list a row twice. */
const items = computed<ReadonlyArray<ItemRegistryEntry>>(() => {
  const equals = keyEqualsFn.value;
  const unique: ItemRegistryEntry[] = [];
  for (const { entry } of registrations.value) {
    if (!unique.some((i) => equals(i.itemKey, entry.itemKey))) unique.push(entry);
  }
  return unique;
});

function getCachedLabel(key: unknown): string | number | undefined {
  return labelCache.get(cachedKey(key));
}

/* Maps the eager `options` prop to registry entries, mirroring what a `SelectPickerItem` registers. */
const seedItems = computed<ReadonlyArray<ItemRegistryEntry>>(() => {
  if (!props.options) return [];
  return props.options.map((option) => ({
    itemKey: option.itemKey,
    value: (option.value ?? option.itemKey) as unknown,
    label: option.label,
    text: extractText(option.label),
    isDisabled: option.isDisabled ?? false,
  }));
});

/* Merges seeded options with the live (compound-child) registrations, deduped by `keyEquals`.
   A mounted `<SelectPickerItem>` wins on key collision — its value/label/text supersede the seed —
   while compound-only items append. Seed order is preserved so closed-trigger typeahead follows
   `options`. When no options are given this is exactly the live `items` set (no behavior change). */
const mergedItems = computed<ReadonlyArray<ItemRegistryEntry>>(() => {
  const seeds = seedItems.value;
  const live = items.value;
  if (seeds.length === 0) return live;
  if (live.length === 0) return seeds;
  const equals = keyEqualsFn.value;
  const merged = seeds.map((s) => live.find((i) => equals(i.itemKey, s.itemKey)) ?? s);
  const extras = live.filter((i) => !seeds.some((s) => equals(s.itemKey, i.itemKey)));
  return extras.length > 0 ? [...merged, ...extras] : merged;
});

/* Seeds the persistent label cache from `options` so a controlled value resolves its label
   before any item mounts. Only fills gaps — a mounted `SelectPickerItem` (via `registerItem`) writes
   the cache unconditionally and therefore always wins. */
watch(
  seedItems,
  (seeds) => {
    if (seeds.length === 0) return;
    for (const seed of seeds) {
      cacheLabel(seed.itemKey, seed.label);
    }
  },
  { immediate: true },
);

const hasSelection = computed(() => keyCtl.value.value !== null && keyCtl.value.value !== undefined);

/* A closed panel mounts its options off-document so the trigger labels the selection before the first open.
   Skipped when `options` already labels the selection, so a long seeded list mounts no second copy. */
const needsOptionCollection = computed(() => {
  const seeds = seedItems.value;
  if (seeds.length === 0) return true;
  if (!hasSelection.value) return false;
  return !seeds.some((seed) => keyEqualsFn.value(seed.itemKey, keyCtl.value.value));
});

/* Drops the captured label when the key changed externally (controlled updates). */
const selectedLabel = computed<string | number | null>(() => {
  const captured = selectedEntry.value;
  if (!captured || !hasSelection.value) return null;
  return keyEqualsFn.value(captured.itemKey, keyCtl.value.value) ? captured.label : null;
});

function onSelect(entry: ItemRegistryEntry): void {
  if (inactive.value || entry.isDisabled) return;
  keyCtl.setValue(entry.itemKey as K | null);
  selectedEntry.value = { itemKey: entry.itemKey, label: entry.label };
  openCtl.setValue(false);
  query.value = '';
}

function onClear(): void {
  if (inactive.value) return;
  keyCtl.setValue(null);
  selectedEntry.value = null;
}

function onPopoverOpenChange(next: boolean): void {
  if (next && inactive.value) return;
  openCtl.setValue(next);
  if (!next) {
    query.value = '';
    activeDescendant.value = null;
  }
}

const context: SelectPickerContextValue = {
  get open() {
    return openCtl.value.value;
  },
  setOpen: onPopoverOpenChange,
  get selectedKey() {
    return keyCtl.value.value;
  },
  get hasSelection() {
    return hasSelection.value;
  },
  get selectedLabel() {
    return selectedLabel.value;
  },
  onSelect,
  onClear,
  get keyEquals() {
    return keyEqualsFn.value;
  },
  get items() {
    return mergedItems.value;
  },
  registerItem,
  unregisterItem,
  get needsOptionCollection() {
    return needsOptionCollection.value;
  },
  getCachedLabel,
  get query() {
    return query.value;
  },
  setQuery: (next) => {
    query.value = next;
  },
  get isDisabled() {
    return finalDisabled.value || finalReadOnly.value;
  },
  get isLoading() {
    return props.isLoading;
  },
  get loadingLabel() {
    return labels.loadingLabel;
  },
  get isClearable() {
    return props.isClearable;
  },
  get clearLabel() {
    return labels.clearLabel;
  },
  get serializeKey() {
    return serializeKeyFn.value;
  },
  getOptionLabel: getOptionLabelFn,
  get name() {
    return props.name;
  },
  get isInvalid() {
    return finalInvalid.value;
  },
  get listboxId() {
    return listboxId;
  },
  get activeDescendant() {
    return activeDescendant.value;
  },
  setActiveDescendant: (id) => {
    activeDescendant.value = id;
  },
  listboxEl,
  get fieldId() {
    return field?.id;
  },
  get labelId() {
    return field?.labelledBy;
  },
  get describedBy() {
    return field?.describedBy;
  },
};

provide(selectContextKey, context);

const isOpenNow = computed(() => openCtl.value.value);
const serializedKey = computed(() => serializeKeyFn.value(keyCtl.value.value));

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  openCtl.reset();
  keyCtl.reset();

  query.value = '';
  activeDescendant.value = null;
});
</script>

<template>
  <Popover
    :key="formResetRevision"
    :open="isOpenNow"
    :placement="placement"
    :offset="4"
    @update:open="onPopoverOpenChange"
  >
    <slot />
    <!-- Always-rendered — inside PopoverContent it would vanish from form submission when closed. -->
    <input
      v-if="name && hasSelection"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="serializedKey"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </Popover>
</template>
