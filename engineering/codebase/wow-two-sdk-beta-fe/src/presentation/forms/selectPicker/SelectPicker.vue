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

  /** The label resolver for a `modelValue`/`defaultValue` before items register
   *  (the trigger otherwise shows the raw serialized key until the first open). */
  readonly getOptionLabel?: (key: K) => string | number | null;

  /** The option set seeded eagerly into the item registry + label cache on mount — before the
   *  popover ever opens. Lets `SelectPickerValue` resolve the selected label and closed-trigger
   *  typeahead work without a first open, so `getOptionLabel` is unnecessary. Compound
   *  `<SelectPickerItem>` children still render the list and remain fully supported; `options` is an
   *  alternative/supplement. When both supply the same key, the mounted child wins (deduped via
   *  `keyEquals`). Each entry mirrors what a `SelectPickerItem` registers. */
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
   `SelectPickerContent` counts visible rows off it, both at render time. */
const items = shallowRef<ItemRegistryEntry[]>([]);

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

/* Captures `{ itemKey, label }` at selection time — items unmount on popover close, so the
   registry alone can't label the trigger before the first open. */
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

function registerItem(entry: ItemRegistryEntry): void {
  /* Persist the label so a closed trigger can still resolve it after this item unmounts. */
  cacheLabel(entry.itemKey, entry.label);
  const list = items.value;
  const idx = list.findIndex((i) => Object.is(i.itemKey, entry.itemKey));
  if (idx >= 0) {
    const existing = list[idx];
    if (
      existing &&
      existing.label === entry.label &&
      existing.text === entry.text &&
      existing.isDisabled === entry.isDisabled &&
      Object.is(existing.value, entry.value)
    ) {
      return;
    }
    const next = list.slice();
    next[idx] = entry;
    items.value = next;
    return;
  }
  items.value = [...list, entry];
}

/* Drops the item from the live mounted set on unmount so a removed option (popover close OR
   option-set change) no longer satisfies search / typeahead / value resolution. The label
   stays in `labelCache`, so the trigger keeps its label after close. */
function unregisterItem(itemKey: unknown): void {
  const idx = items.value.findIndex((i) => Object.is(i.itemKey, itemKey));
  if (idx === -1) return;
  const next = items.value.slice();
  next.splice(idx, 1);
  items.value = next;
}

function getCachedLabel(key: unknown): string | number | undefined {
  return labelCache.get(cachedKey(key));
}

/* Maps the eager `options` prop to registry entries, mirroring what a `SelectPickerItem` registers.
   Seeding these lets `SelectPickerValue` + closed-trigger typeahead resolve before the popover's
   first open, so `getOptionLabel` is unnecessary when `options` is supplied. */
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
