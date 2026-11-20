<script lang="ts">
import type { IconAdapter } from '../../../foundation/icons';
import type { FacetKind, FacetPlacement } from './FacetBar.variants';

/** Defines one choice of a facet. */
export interface FacetOption {
  /** The value stored in the selection. */
  readonly value: string;

  /** The text on the chip, in the picker and on the removable chip. */
  readonly label: string;

  /** How many rows this value would match. The consumer counts; the bar only renders it. */
  readonly count?: number;

  /** The icon before the label of an inline chip. */
  readonly icon?: IconAdapter;
}

/** Defines one facet: a named dimension rows are filtered by, with the choices the reader sees. */
export interface FacetDefinition {
  /** The facet's key in the selection. */
  readonly key: string;

  /** The facet's name — the group's accessible name, the picker's heading and the prefix of its chips. */
  readonly label: string;

  /** Whether the facet takes one value or several. */
  readonly kind: FacetKind;

  /** Whether the facet sits in the bar or inside the "Filters" popover. */
  readonly placement: FacetPlacement;

  /** The choices, in display order. */
  readonly options: ReadonlyArray<FacetOption>;
}

/**
 * The chosen values by facet key: a string for a `single` facet, an array for a `multi` one. A facet with nothing
 * chosen has no key.
 */
export type FacetSelection = Readonly<Record<string, string | ReadonlyArray<string> | null | undefined>>;

/** Defines props for the facet bar. */
export interface FacetBarProps {
  /** The facets, in display order: inline ones in the bar, the rest in the "Filters" popover. */
  readonly facets: ReadonlyArray<FacetDefinition>;

  /** The selection, controlled — the `v-model` binding target. */
  readonly modelValue?: FacetSelection;

  /** The search text, controlled — the `v-model:search` binding target. */
  readonly search?: string;

  /** The number of rows matching the search and selection; the pill reads it. Omit to hide the pill. */
  readonly matchCount?: number;

  /** The number of rows with nothing applied; with `matchCount` the pill reads `12 of 72`. */
  readonly totalCount?: number;

  /** Whether the bar shows the search input. Default `true`. */
  readonly isSearchable?: boolean;

  /** The search input's accessible name. Default `"Search"`, localized. */
  readonly searchLabel?: string;

  /** The search input placeholder, and the one of a long picker. Default `"Search…"`, localized. */
  readonly searchPlaceholder?: string;

  /** The popover button's text. Default `"Filters"`, localized. */
  readonly filtersLabel?: string;

  /** The text of the control that clears every choice and the search. Default `"Clear all"`, localized. */
  readonly clearAllLabel?: string;

  /** The text of the picker choice that clears its facet. Default `"Any"`, localized. */
  readonly anyLabel?: string;

  /** The multi picker's text with choices made; `{count}` marks the number. Default `"{count} selected"`. */
  readonly selectedLabel?: string;

  /** A chip's close button name; `{facet}` and `{value}` mark its parts. Default `"Remove {facet}: {value}"`. */
  readonly removeLabel?: string;

  /** The pill's text with a total; `{matched}` and `{total}` mark the counts. Default `"{matched} of {total}"`. */
  readonly matchLabel?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue';
import type { ClassValue } from 'clsx';
import { SlidersHorizontal } from 'lucide-vue-next';
import { interpolate, useLocaleDefaults, useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import Button from '../../actions/button/Button.vue';
import Badge from '../../display/badge/Badge.vue';
import Tag from '../../display/tag/Tag.vue';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import SearchInput from '../searchInput/SearchInput.vue';
import ToggleGroup from '../toggleGroup/ToggleGroup.vue';
import FacetBarPicker from './FacetBarPicker.vue';
import { FacetKind as FacetKindValue, FacetPlacement as FacetPlacementValue } from './FacetBar.variants';

/**
 * Renders the control bar of a filtered feed — a search, inline facet chips with counts, a "Filters" popover for the
 * rest, removable chips for what the popover chose, a clear-all control and a live match-count pill.
 */
defineOptions({ name: 'FacetBar', inheritAttrs: false });

defineSlots<{
  /** The trailing end of the controls row — a sort select, an "Add" button. */
  trailing?(): unknown;
}>();

const componentProps = withDefaults(defineProps<FacetBarProps>(), {
  modelValue: undefined,
  search: undefined,
  matchCount: undefined,
  totalCount: undefined,
  isSearchable: true,
});
const props = useLocaleDefaults(componentProps, 'FacetBar', {
  searchLabel: 'Search',
  searchPlaceholder: 'Search…',
  filtersLabel: 'Filters',
  clearAllLabel: 'Clear all',
  anyLabel: 'Any',
  selectedLabel: '{count} selected',
  removeLabel: 'Remove {facet}: {value}',
  matchLabel: '{matched} of {total}',
});

const emit = defineEmits<{
  /** Fires when the reader changes a choice — the `v-model` half, carrying the whole selection. */
  'update:modelValue': [selection: FacetSelection];

  /** Fires when the reader edits the search — the `v-model:search` half. */
  'update:search': [search: string];

  /** Fires after the reader clears every choice and the search. */
  clear: [];
}>();

const attrs = useAttrs();
const slots = useSlots();
const formatters = useLocaleFormatters();

const selectionCtl = useControlled<FacetSelection>({
  controlled: () => props.modelValue,
  default: () => ({}),
  onChange: (next) => emit('update:modelValue', next),
});
const selection = selectionCtl.value;

const searchCtl = useControlled<string>({
  controlled: () => props.search,
  default: () => '',
  onChange: (next) => emit('update:search', next),
});
const searchText = searchCtl.value;

/** The values chosen in a facet, whatever its kind. */
function valuesOf(key: string): ReadonlyArray<string> {
  const value = selection.value[key];
  if (value === undefined || value === null || value === '') return [];
  return typeof value === 'string' ? [value] : value;
}

/** The value chosen in a `single` facet, or `null`. */
function singleOf(key: string): string | null {
  return valuesOf(key)[0] ?? null;
}

/** Stores one facet's choice, dropping its key when nothing is chosen. */
function setFacet(key: string, next: string | ReadonlyArray<string> | null): void {
  const { [key]: _removed, ...others } = selection.value;
  const isEmpty = next === null || next === '' || (typeof next !== 'string' && next.length === 0);
  selectionCtl.setValue(isEmpty ? others : { ...others, [key]: next });
}

const inlineFacets = computed(() => props.facets.filter((facet) => facet.placement === FacetPlacementValue.Inline));
const popoverFacets = computed(() => props.facets.filter((facet) => facet.placement === FacetPlacementValue.Popover));

/** Whether a facet takes several values. */
function isMulti(facet: FacetDefinition): boolean {
  return facet.kind === FacetKindValue.Multi;
}

/** One removable chip per value chosen in a popover facet. */
const chips = computed(() =>
  popoverFacets.value.flatMap((facet) =>
    valuesOf(facet.key).map((value) => ({
      id: `${facet.key}\u0000${value}`,
      facet,
      value,
      text: facet.options.find((option) => option.value === value)?.label ?? value,
    })),
  ),
);

const hasChoices = computed(() => props.facets.some((facet) => valuesOf(facet.key).length > 0));
const hasActiveFilters = computed(() => hasChoices.value || searchText.value.length > 0);

function removeChip(chip: (typeof chips.value)[number]): void {
  if (chip.facet.kind === FacetKindValue.Single) setFacet(chip.facet.key, null);
  else
    setFacet(
      chip.facet.key,
      valuesOf(chip.facet.key).filter((value) => value !== chip.value),
    );
}

function removeName(chip: (typeof chips.value)[number]): string {
  return interpolate(props.removeLabel, { facet: chip.facet.label, value: chip.text });
}

function clearAll(): void {
  selectionCtl.setValue({});
  searchCtl.setValue('');
  emit('clear');
}

/** The pill's text: `12 of 72` with a total, `12` without, nothing without a count. */
const matchText = computed(() => {
  if (props.matchCount === undefined) return '';
  const matched = formatters.value.number(props.matchCount);
  if (props.totalCount === undefined) return matched;
  return interpolate(props.matchLabel, { matched, total: formatters.value.number(props.totalCount) });
});

const rootClass = computed(() => cn('flex min-w-0 flex-col gap-3', attrs.class as ClassValue));
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <div v-bind="rest" :class="rootClass" data-facet-bar>
    <div class="flex flex-wrap items-center gap-2.5">
      <!-- Always mounted: a live region announces content that changes inside it, not one that appears with it. -->
      <span role="status" aria-live="polite" aria-atomic="true" data-facet-match class="inline-flex empty:-me-2.5">
        <Badge v-if="matchText" class="tabular-nums">{{ matchText }}</Badge>
      </span>
      <div v-if="isSearchable" class="min-w-[min(100%,15rem)] flex-1">
        <SearchInput
          :model-value="searchText"
          :placeholder="props.searchPlaceholder"
          :aria-label="props.searchLabel"
          is-clearable
          class="[&>input]:rounded-full [&>button]:rounded-full"
          @update:model-value="searchCtl.setValue($event)"
        />
      </div>
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <ToggleGroup
          v-for="facet in inlineFacets"
          :key="facet.key"
          :type="facet.kind"
          variant="pill"
          item-variant="solid"
          item-tone="neutral"
          :options="facet.options"
          :model-value="isMulti(facet) ? valuesOf(facet.key) : singleOf(facet.key)"
          :aria-label="facet.label"
          class="max-w-full flex-wrap gap-1.5"
          @update:model-value="setFacet(facet.key, $event)"
        />
        <Popover v-if="popoverFacets.length > 0" placement="bottom-end">
          <PopoverTrigger as-child>
            <Button variant="outline" class="min-h-9 rounded-full">
              <Icon :icon="SlidersHorizontal" :size="15" />
              {{ props.filtersLabel }}
              <span v-if="chips.length > 0" data-facet-filters-count class="tabular-nums">
                {{ formatters.number(chips.length) }}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="grid w-72 max-w-[calc(100vw-2.5rem)] gap-3">
            <div v-for="facet in popoverFacets" :key="facet.key" class="grid min-w-0 gap-1 text-sm font-medium">
              <span>{{ facet.label }}</span>
              <FacetBarPicker
                :facet="facet"
                :model-value="isMulti(facet) ? valuesOf(facet.key) : singleOf(facet.key)"
                :any-label="props.anyLabel"
                :selected-label="props.selectedLabel"
                :search-placeholder="props.searchPlaceholder"
                @update:model-value="setFacet(facet.key, $event)"
              />
            </div>
          </PopoverContent>
        </Popover>
        <Button v-if="hasActiveFilters" variant="ghost" size="sm" data-facet-clear-all @click="clearAll">
          {{ props.clearAllLabel }}
        </Button>
      </div>
      <div v-if="slots.trailing" class="ms-auto flex flex-wrap items-center gap-2">
        <slot name="trailing" />
      </div>
    </div>
    <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2" data-facet-chips>
      <Tag v-for="chip in chips" :key="chip.id" :close-label="removeName(chip)" @close="removeChip(chip)">
        {{ chip.facet.label }}: {{ chip.text }}
      </Tag>
    </div>
  </div>
</template>
