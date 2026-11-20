<script lang="ts">
import type { FacetChoiceDefinition } from './FacetBar.vue';

/** Defines props for the picker of one popover facet. */
export interface FacetBarPickerProps {
  /** The facet whose options the picker offers; a `toggle` facet has none and never reaches the picker. */
  readonly facet: FacetChoiceDefinition;

  /** The chosen value of a `single` facet, or the chosen values of a `multi` one. */
  readonly modelValue?: string | ReadonlyArray<string> | null;

  /** The text of the choice that clears a `single` facet, and of a `multi` trigger with nothing chosen. */
  readonly anyLabel: string;

  /** The text of a `multi` trigger with values chosen; `{count}` marks their number. */
  readonly selectedLabel: string;

  /** The search input placeholder of a long `single` list. */
  readonly searchPlaceholder: string;
}

/** The option count past which a `single` picker offers a search box. */
const SearchableFrom = 12;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { interpolate, useLocaleFormatters } from '../../../foundation/i18n';
import {
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  type SelectPickerOption,
} from '../selectPicker';
import {
  MultiSelectPicker,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  MultiSelectPickerTrigger,
} from '../multiSelectPicker';
import { FacetKind } from './FacetBar.variants';

/** Renders the picker of one facet inside the "Filters" popover — a select for `single`, a multi-select for `multi`. */
defineOptions({ name: 'FacetBarPicker' });

const props = withDefaults(defineProps<FacetBarPickerProps>(), { modelValue: undefined });

const emit = defineEmits<{
  /** Fires when the reader changes the choice — a value or `null` for `single`, the whole set for `multi`. */
  'update:modelValue': [value: string | ReadonlyArray<string> | null];
}>();

const formatters = useLocaleFormatters();

const isMulti = computed(() => props.facet.kind === FacetKind.Multi);

/** The chosen value of a `single` facet. The empty key is the "any" row, so a cleared facet reads as chosen. */
const single = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''));

/** The chosen values of a `multi` facet. */
const many = computed<ReadonlyArray<string>>(() => {
  const value = props.modelValue;
  if (value === undefined || value === null) return [];
  return typeof value === 'string' ? [value] : value;
});

/** The options seeded into the `single` picker, so a chosen value shows its label before the list ever opens. */
const seeded = computed<ReadonlyArray<SelectPickerOption<string>>>(() => [
  { itemKey: '', value: '', label: props.anyLabel },
  ...props.facet.options.map((option) => ({ itemKey: option.value, value: option.value, label: option.label })),
]);

/** The `multi` trigger's text: the number chosen, or the "any" text. */
const summary = computed(() =>
  many.value.length > 0
    ? interpolate(props.selectedLabel, { count: formatters.value.number(many.value.length) })
    : props.anyLabel,
);

function countText(count: number | undefined): string | undefined {
  return count === undefined ? undefined : formatters.value.number(count);
}

function labelOf(value: string): string | null {
  return props.facet.options.find((option) => option.value === value)?.label ?? null;
}

/** Re-emits a `single` pick; the "any" row and a clear both mean no value. */
function pick(key: string | null): void {
  emit('update:modelValue', key === null || key === '' ? null : key);
}
</script>

<template>
  <SelectPicker v-if="!isMulti" :model-value="single" :options="seeded" @update:model-value="pick">
    <SelectPickerTrigger size="sm" :aria-label="facet.label" class="min-w-0">
      <SelectPickerValue :placeholder="anyLabel" />
    </SelectPickerTrigger>
    <SelectPickerContent
      has-trigger-width
      :is-searchable="facet.options.length > SearchableFrom"
      :search-placeholder="searchPlaceholder"
    >
      <SelectPickerItem item-key="" :label="anyLabel" />
      <SelectPickerItem
        v-for="option in facet.options"
        :key="option.value"
        :item-key="option.value"
        :value="option.value"
        :label="option.label"
      >
        <span class="flex w-full min-w-0 items-center justify-between gap-3">
          <span class="truncate">{{ option.label }}</span>
          <span v-if="option.count !== undefined" data-facet-option-count class="tabular-nums text-muted-foreground">
            {{ countText(option.count) }}
          </span>
        </span>
      </SelectPickerItem>
    </SelectPickerContent>
  </SelectPicker>
  <MultiSelectPicker
    v-else
    :model-value="many"
    :get-option-label="labelOf"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <MultiSelectPickerTrigger size="sm" :aria-label="facet.label" class="min-w-0">
      <span class="truncate">{{ summary }}</span>
    </MultiSelectPickerTrigger>
    <MultiSelectPickerContent>
      <MultiSelectPickerItem
        v-for="option in facet.options"
        :key="option.value"
        :value="option.value"
        :label="option.label"
      >
        <span class="flex w-full min-w-0 items-center justify-between gap-3">
          <span class="truncate">{{ option.label }}</span>
          <span v-if="option.count !== undefined" data-facet-option-count class="tabular-nums text-muted-foreground">
            {{ countText(option.count) }}
          </span>
        </span>
      </MultiSelectPickerItem>
    </MultiSelectPickerContent>
  </MultiSelectPicker>
</template>
