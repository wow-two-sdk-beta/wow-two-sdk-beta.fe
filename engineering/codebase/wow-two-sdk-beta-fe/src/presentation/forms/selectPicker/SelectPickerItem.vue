<script lang="ts">
/**
 * Represents the prop surface of the `SelectPickerItem`.
 *
 * React's `<K, V = K>` generics are dropped: the exported interface has to live
 * in this plain `<script>` block (a `<script setup>`-only SFC trips
 * `no-unused-vars` on the house attrs idiom), and a block-level interface cannot
 * see a `generic="…"` parameter. The root `SelectPicker` stays generic, so the
 * consumer-facing `modelValue` / `@update:modelValue` types are unaffected.
 */
export interface SelectPickerItemProps {
  /** The item key; drives equality, ARIA, and search. */
  readonly itemKey: unknown;

  /** Optional associated option data; selection updates emit only `itemKey`. */
  readonly value?: unknown;

  /** The label shown in the trigger when this item is selected, and the default search text. */
  readonly label: string | number;

  /** The searchable-text override; defaults to `label`. */
  readonly text?: string;

  /** The disabled state for this item. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import ListboxPickerItem from '../listboxPicker/ListboxPickerItem.vue';
import { extractText, useSelectContext } from './SelectPickerContext';

/** Renders one selectable option row, hidden while it misses the panel's search query. */
defineOptions({ name: 'SelectPickerItem', inheritAttrs: false });

const props = withDefaults(defineProps<SelectPickerItemProps>(), {
  isDisabled: false,
});

defineSlots<{
  /** The option's content, richer than the `label` prop it falls back to. */
  default?(): unknown;
}>();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useSelectContext();

const resolvedValue = computed(() => (props.value === undefined ? props.itemKey : props.value));

/* Explicit `text` wins; otherwise the label's plain text. */
const itemText = computed(() => (props.text !== undefined ? props.text : extractText(props.label)));

watch(
  () => ({
    itemKey: props.itemKey,
    value: resolvedValue.value,
    label: props.label,
    text: itemText.value,
    isDisabled: props.isDisabled,
  }),
  (entry, previous) => {
    if (previous && !Object.is(previous.itemKey, entry.itemKey)) ctx.unregisterItem(previous.itemKey);
    ctx.registerItem(entry);
  },
  { immediate: true },
);
onBeforeUnmount(() => ctx.unregisterItem(props.itemKey));

const matchesQuery = computed(() => !ctx.query || itemText.value.toLowerCase().includes(ctx.query.toLowerCase()));
</script>

<template>
  <!-- ListboxPickerItem compares via the wired keyEquals — same equality math as SelectPicker. -->
  <ListboxPickerItem v-if="matchesQuery" v-bind="$attrs" :value="itemKey" :is-disabled="isDisabled">
    <slot>{{ label }}</slot>
  </ListboxPickerItem>
</template>
