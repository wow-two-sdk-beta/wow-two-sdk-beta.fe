<script lang="ts">
import type { SelectPickerSize } from '../selectPicker';

/** Defines props for the country picker. */
export interface CountryPickerProps {
  /** The ISO 3166-1 alpha-2 code, uppercase, controlled. The `v-model` binding target; `null` selects nothing. */
  readonly modelValue?: string | null;

  /** The initial code when uncontrolled. */
  readonly defaultValue?: string | null;

  /** The codes listed first, in the order given, with a rule before the rest — `['UZ', 'KZ', 'KG']`. */
  readonly preferred?: ReadonlyArray<string>;

  /** The codes to offer. Default every ISO 3166-1 alpha-2 region. Unknown codes are ignored. */
  readonly countries?: ReadonlyArray<string>;

  /** The language the names are written in. Default the nearest locale provider's. */
  readonly locale?: string;

  /** The trigger text with no country picked. Default `"Select a country"`, localized. */
  readonly placeholder?: string;

  /** The search input placeholder. Default `"Search countries…"`, localized. */
  readonly searchPlaceholder?: string;

  /** The text shown when the search matches nothing. Default `"No countries found"`, localized. */
  readonly noResultsLabel?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The disabled state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value. */
  readonly isReadOnly?: boolean;

  /** The invalid state. */
  readonly isInvalid?: boolean;

  /** Whether the trigger offers a clear button while a country is picked. */
  readonly isClearable?: boolean;

  /** The hidden input name submitted with the form. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { RegionCodes, regionFlag, regionName, useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import {
  SelectPicker,
  SelectPickerContent,
  SelectPickerTrigger,
  SelectPickerValue,
  type SelectPickerOption,
} from '../selectPicker';
import { compareNames, countryOption, normalizeCodes, type CountryOption } from './CountryPickerExtensions';
import CountryPickerOptions from './CountryPickerOptions.vue';

/**
 * Renders a searchable picker of countries that stores the ISO 3166-1 alpha-2 code, each country labelled with its
 * flag and its name in the reader's language.
 */
defineOptions({ name: 'CountryPicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<CountryPickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  preferred: undefined,
  countries: undefined,
  locale: undefined,
  size: undefined,
  isDisabled: false,
  isReadOnly: false,
  isInvalid: false,
  isClearable: false,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'CountryPicker', {
  placeholder: 'Select a country',
  searchPlaceholder: 'Search countries…',
  noResultsLabel: 'No countries found',
});

const emit = defineEmits<{
  /** Fires when the reader picks or clears a country — the `v-model` half, carrying the uppercase code or `null`. */
  'update:modelValue': [code: string | null];
}>();

const attrs = useAttrs();
const context = useLocale();

const activeLocale = computed(() => props.locale ?? context.locale.value);

/** The offered codes: the restriction when given, else every region. */
const offered = computed<ReadonlyArray<string>>(() => normalizeCodes(props.countries) ?? RegionCodes);

/** The preferred codes the list still offers, in the order given. */
const preferredCodes = computed<ReadonlyArray<string>>(() => {
  const allowed = new Set(offered.value);
  return (normalizeCodes(props.preferred) ?? []).filter((code) => allowed.has(code));
});

/** Every offered country, written in the active locale. */
const allOptions = computed<ReadonlyArray<CountryOption>>(() =>
  offered.value.map((code) => countryOption(code, activeLocale.value)),
);

const preferredOptions = computed<ReadonlyArray<CountryOption>>(() => {
  const byCode = new Map(allOptions.value.map((option) => [option.code, option]));
  return preferredCodes.value.flatMap((code) => byCode.get(code) ?? []);
});

/** The rest, ordered by name in the active locale. */
const restOptions = computed<ReadonlyArray<CountryOption>>(() => {
  const preferred = new Set(preferredCodes.value);
  return allOptions.value
    .filter((option) => !preferred.has(option.code))
    .sort((left, right) => compareNames(left.name, right.name, activeLocale.value));
});

/** The options seeded into the picker, so a preset value shows its label before the list ever opens. */
const seeded = computed<ReadonlyArray<SelectPickerOption<string>>>(() =>
  [...preferredOptions.value, ...restOptions.value].map((option) => ({
    itemKey: option.code,
    value: option.code,
    label: option.label,
  })),
);

/** Labels a code the list does not offer, so a value outside `countries` still reads as a country. */
function labelOf(code: string): string | null {
  const flag = regionFlag(code);
  return flag ? `${flag} ${regionName(code, activeLocale.value)}` : null;
}

/** Re-emits a pick from the inner picker. */
function handleUpdate(code: string | null): void {
  emit('update:modelValue', code);
}
</script>

<template>
  <SelectPicker
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :options="seeded"
    :get-option-label="labelOf"
    :name="props.name"
    :is-disabled="props.isDisabled"
    :is-read-only="props.isReadOnly"
    :is-invalid="props.isInvalid"
    :is-clearable="props.isClearable"
    @update:model-value="handleUpdate"
  >
    <SelectPickerTrigger :size="props.size" v-bind="attrs">
      <SelectPickerValue :placeholder="props.placeholder" />
    </SelectPickerTrigger>
    <SelectPickerContent
      is-searchable
      :search-placeholder="props.searchPlaceholder"
      :no-results-label="props.noResultsLabel"
    >
      <CountryPickerOptions :preferred="preferredOptions" :rest="restOptions" />
    </SelectPickerContent>
  </SelectPicker>
</template>
