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

/** Defines what every facet carries, whatever its kind. */
interface FacetBase {
  /** The facet's key in the selection. */
  readonly key: string;

  /** The facet's name — the group's accessible name, the picker's heading and the prefix of its chips. */
  readonly label: string;

  /** Whether the facet sits in the bar or inside the "Filters" popover. */
  readonly placement: FacetPlacement;
}

/** Defines a facet that offers choices: a named dimension rows are filtered by, with the values the reader sees. */
export interface FacetChoiceDefinition extends FacetBase {
  /** Whether the facet takes one value or several. */
  readonly kind: Exclude<FacetKind, 'toggle'>;

  /** The choices, in display order. */
  readonly options: ReadonlyArray<FacetOption>;
}

/** Defines a facet with one on-or-off value — "High priority", "Show skipped" — and no options. */
export interface FacetToggleDefinition extends FacetBase {
  /** Marks the facet as an on-off switch; its selection value is `true` while on, and the key is absent while off. */
  readonly kind: 'toggle';

  /** How many rows turning the toggle on would match. The consumer counts; the bar only renders it. */
  readonly count?: number;

  /** The icon before the label of an inline chip. */
  readonly icon?: IconAdapter;
}

/** Defines one facet: a choice facet (`single`, `multi`) or a `toggle`, told apart by `kind`. */
export type FacetDefinition = FacetChoiceDefinition | FacetToggleDefinition;

/**
 * The chosen values by facet key: a string for a `single` facet, an array for a `multi` one, `true` for a `toggle`.
 * A facet with nothing chosen has no key.
 */
export type FacetSelection = Readonly<Record<string, string | ReadonlyArray<string> | boolean | null | undefined>>;

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

  /** A `toggle` chip's close button name; `{facet}` marks its label. Default `"Remove {facet}"`, localized. */
  readonly removeToggleLabel?: string;

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
import SwitchInput from '../switchInput/SwitchInput.vue';
import ToggleGroup from '../toggleGroup/ToggleGroup.vue';
import ToggleGroupItem from '../toggleGroup/ToggleGroupItem.vue';
import FacetBarPicker from './FacetBarPicker.vue';
import { FacetKind as FacetKindValue, FacetPlacement as FacetPlacementValue } from './FacetBar.variants';

/**
 * Renders the control bar of a filtered feed — a search, inline facet chips with counts, a "Filters" popover for the
 * rest, removable chips for what the popover chose, a clear-all control and a live match-count pill. The controls sit
 * on one row while they fit; the inline chips scroll sideways before a second row opens.
 */
defineOptions({ name: 'FacetBar', inheritAttrs: false });

defineSlots<{
  /** The trailing end of the controls row, after "Filters" — a sort select, an "Add" button, an overflow menu. */
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
  removeToggleLabel: 'Remove {facet}',
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

/** The values chosen in a `single` or `multi` facet; a `toggle` holds none. */
function valuesOf(key: string): ReadonlyArray<string> {
  const value = selection.value[key];
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') return [];
  return typeof value === 'string' ? [value] : value;
}

/** Whether a `toggle` facet is on. */
function isOn(key: string): boolean {
  return selection.value[key] === true;
}

/** The value chosen in a `single` facet, or `null`. */
function singleOf(key: string): string | null {
  return valuesOf(key)[0] ?? null;
}

/** Stores one facet's choice, dropping its key when nothing is chosen or a toggle is off. */
function setFacet(key: string, next: string | ReadonlyArray<string> | boolean | null): void {
  const { [key]: _removed, ...others } = selection.value;
  const isEmpty =
    next === null ||
    next === false ||
    next === '' ||
    (typeof next !== 'string' && typeof next !== 'boolean' && next.length === 0);
  selectionCtl.setValue(isEmpty ? others : { ...others, [key]: next });
}

const inlineFacets = computed(() => props.facets.filter((facet) => facet.placement === FacetPlacementValue.Inline));
const popoverFacets = computed(() => props.facets.filter((facet) => facet.placement === FacetPlacementValue.Popover));

/** Whether a facet takes several values. */
function isMulti(facet: FacetDefinition): boolean {
  return facet.kind === FacetKindValue.Multi;
}

/** Whether a facet is an on-off switch with no options. */
function isToggle(facet: FacetDefinition): facet is FacetToggleDefinition {
  return facet.kind === FacetKindValue.Toggle;
}

/** One removable chip per value chosen in a popover facet, and one for a popover toggle that is on. */
interface FacetChip {
  readonly id: string;
  readonly facet: FacetDefinition;
  readonly value: string | null;
  readonly text: string;
}

const chips = computed<ReadonlyArray<FacetChip>>(() =>
  popoverFacets.value.flatMap((facet): FacetChip[] => {
    if (isToggle(facet))
      return isOn(facet.key) ? [{ id: `${facet.key}\u0000`, facet, value: null, text: facet.label }] : [];
    return valuesOf(facet.key).map((value) => ({
      id: `${facet.key}\u0000${value}`,
      facet,
      value,
      text: facet.options.find((option) => option.value === value)?.label ?? value,
    }));
  }),
);

/** Whether a facet has a choice made. */
function isChosen(facet: FacetDefinition): boolean {
  return isToggle(facet) ? isOn(facet.key) : valuesOf(facet.key).length > 0;
}

const hasChoices = computed(() => props.facets.some(isChosen));
const hasActiveFilters = computed(() => hasChoices.value || searchText.value.length > 0);

function removeChip(chip: FacetChip): void {
  if (chip.facet.kind === FacetKindValue.Multi)
    setFacet(
      chip.facet.key,
      valuesOf(chip.facet.key).filter((value) => value !== chip.value),
    );
  else setFacet(chip.facet.key, null);
}

/** A chip's text: `Format: Conference` for a choice, the bare label for a toggle. */
function chipText(chip: FacetChip): string {
  return chip.value === null ? chip.text : `${chip.facet.label}: ${chip.text}`;
}

function removeName(chip: FacetChip): string {
  return chip.value === null
    ? interpolate(props.removeToggleLabel, { facet: chip.facet.label })
    : interpolate(props.removeLabel, { facet: chip.facet.label, value: chip.text });
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
    <!-- One row while the controls fit: the search is capped, the inline chips take what is left and scroll
         sideways inside their own group, and "Filters" and the trailing slot sit at the end. -->
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-2" data-facet-row>
      <!-- Always mounted: a live region announces content that changes inside it, not one that appears with it. -->
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-facet-match
        class="inline-flex shrink-0 empty:-me-2.5"
      >
        <Badge v-if="matchText" class="tabular-nums">{{ matchText }}</Badge>
      </span>
      <div
        v-if="isSearchable"
        class="order-first w-full sm:order-none sm:w-auto sm:max-w-[22rem] sm:min-w-[12rem] sm:flex-[0_1_22rem]"
        data-facet-search
      >
        <SearchInput
          :model-value="searchText"
          :placeholder="props.searchPlaceholder"
          :aria-label="props.searchLabel"
          is-clearable
          class="[&>input]:rounded-full [&>button]:rounded-full"
          @update:model-value="searchCtl.setValue($event)"
        />
      </div>
      <!-- The padding, with a negative margin at the start and above and below, leaves room for the chips' focus
           rings inside the scroll box without moving the chips or widening the row. -->
      <div
        v-if="inlineFacets.length > 0"
        class="-my-1 -ms-1 flex min-w-[min(100%,12rem)] flex-[1_1_0%] items-center gap-x-3 overflow-x-auto px-1 py-1 [--scrollbar-size:0.375rem]"
        data-facet-inline
      >
        <template v-for="facet in inlineFacets" :key="facet.key">
          <ToggleGroupItem
            v-if="isToggle(facet)"
            :value="facet.key"
            :label="facet.label"
            :count="facet.count"
            :icon="facet.icon"
            variant="solid"
            tone="neutral"
            :model-value="isOn(facet.key)"
            class="shrink-0 rounded-full"
            data-facet-toggle
            @update:model-value="setFacet(facet.key, $event)"
          />
          <ToggleGroup
            v-else
            :type="facet.kind"
            variant="pill"
            item-variant="solid"
            item-tone="neutral"
            :options="facet.options"
            :model-value="isMulti(facet) ? valuesOf(facet.key) : singleOf(facet.key)"
            :aria-label="facet.label"
            class="shrink-0 gap-1.5"
            @update:model-value="setFacet(facet.key, $event)"
          />
        </template>
      </div>
      <div
        v-if="popoverFacets.length > 0 || hasActiveFilters || slots.trailing"
        class="ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2"
        data-facet-end
      >
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
            <template v-for="facet in popoverFacets" :key="facet.key">
              <label
                v-if="isToggle(facet)"
                class="flex min-w-0 cursor-pointer items-center justify-between gap-3 text-sm font-medium"
                data-facet-toggle-row
              >
                <span class="flex min-w-0 items-baseline gap-2">
                  <span class="truncate">{{ facet.label }}</span>
                  <span
                    v-if="facet.count !== undefined"
                    data-facet-option-count
                    class="tabular-nums font-normal text-muted-foreground"
                  >
                    {{ formatters.number(facet.count) }}
                  </span>
                </span>
                <SwitchInput
                  :model-value="isOn(facet.key)"
                  :aria-label="facet.label"
                  @update:model-value="setFacet(facet.key, $event)"
                />
              </label>
              <div v-else class="grid min-w-0 gap-1 text-sm font-medium">
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
            </template>
          </PopoverContent>
        </Popover>
        <Button v-if="hasActiveFilters" variant="ghost" size="sm" data-facet-clear-all @click="clearAll">
          {{ props.clearAllLabel }}
        </Button>
        <slot name="trailing" />
      </div>
    </div>
    <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2" data-facet-chips>
      <Tag v-for="chip in chips" :key="chip.id" :close-label="removeName(chip)" @close="removeChip(chip)">
        {{ chipText(chip) }}
      </Tag>
    </div>
  </div>
</template>
