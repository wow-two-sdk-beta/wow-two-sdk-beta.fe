<script lang="ts">
/** Contains the visible words of a `FilterSummary`; each one left out falls back to the locale, then to English. */
export interface FilterSummaryLabels {
  /** The clear button's accessible name and tooltip. Default `Clear filters`. */
  readonly clear?: string;
  /** The filters button's accessible name and tooltip. Default `Filters`. */
  readonly filters?: string;
  /** The count in a wide container: `{matched}` and `{total}` mark the numbers. Default `{matched} out of {total}`. */
  readonly match?: string;
  /** The count in a narrow container, with the same marks. Default `{matched} / {total}`. */
  readonly compactMatch?: string;
}

export interface FilterSummaryProps {
  /** The items matching the filters in effect. */
  readonly matched: number;
  /** The items with no filter applied. */
  readonly total: number;
  /** The filtered state: anything narrows the collection. The clear button is disabled without it. */
  readonly isFiltered: boolean;
  /** The counting state: the count keeps its box and shows a quiet placeholder until the numbers arrive. */
  readonly isCounting?: boolean;
  /** The advanced filters in effect; above 0 the filters button carries a badge with the number. Default 0. */
  readonly activeFilterCount?: number;
  /** The filters state: an app with no advanced filters sets it false, which drops the filters button and the
   *  `filters-trigger` slot. Default true. */
  readonly hasFilters?: boolean;
  /** The words of the summary; see `FilterSummaryLabels`. */
  readonly labels?: FilterSummaryLabels;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { X } from 'lucide-vue-next';
import { Icon } from '../../../foundation/icons';
import { interpolate, useLocale, useLocaleFormatters } from '../../../foundation/i18n';
import { ColorTone, SizePreset, cn } from '../../../foundation/styles';
import { Button, ButtonShape, ButtonVariant } from '../../actions';
import { Tooltip } from '../../overlays';
import { FilterSummaryContextKey } from './FilterSummaryContext';
import FilterSummaryFiltersButton from './FilterSummaryFiltersButton.vue';

const ClearIcon = X;

/**
 * Renders the result pill of a filtered collection: the filters button, the "{matched} out of {total}" count and the
 * clear button, left to right, in one rounded field-height strip. The count reads "{matched} / {total}" in a container
 * narrower than 300px (a container query on the nearest `@container` ancestor, never the device).
 */
defineOptions({ name: 'FilterSummary', inheritAttrs: false });

const props = withDefaults(defineProps<FilterSummaryProps>(), {
  isCounting: false,
  activeFilterCount: 0,
  hasFilters: true,
  labels: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader presses the default filters button; a `filters-trigger` slot owns its own press. */
  'open-filters': [];
  /** Fires when the reader presses the enabled clear button. */
  clear: [];
}>();

defineSlots<{
  /** Replaces the filters button, so an app can wrap `FilterSummaryFiltersButton` in a trigger with `as-child`; not
   *  rendered while `hasFilters` is false. */
  'filters-trigger'?(): unknown;
}>();

const attrs = useAttrs();
const locale = useLocale();
const formatters = useLocaleFormatters();

const clearLabel = computed(() => props.labels?.clear ?? locale.t('FilterSummary.clear', undefined, 'Clear filters'));
const filtersLabel = computed(() => props.labels?.filters ?? locale.t('FilterSummary.filters', undefined, 'Filters'));
const groupLabel = computed(
  () => (attrs['aria-label'] as string | undefined) ?? locale.t('FilterSummary.group', undefined, 'Filter results'),
);

const numbers = computed(() => ({
  matched: formatters.value.number(props.matched),
  total: formatters.value.number(props.total),
}));
const matchText = computed(() =>
  interpolate(
    props.labels?.match ?? locale.t('FilterSummary.match', undefined, '{matched} out of {total}'),
    numbers.value,
  ),
);
const compactMatchText = computed(() =>
  interpolate(
    props.labels?.compactMatch ?? locale.t('FilterSummary.compactMatch', undefined, '{matched} / {total}'),
    numbers.value,
  ),
);

provide(FilterSummaryContextKey, {
  activeFilterCount: () => props.activeFilterCount,
  filtersLabel: () => filtersLabel.value,
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'aria-label']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/* One visible height per pointer: 40px under a mouse, 44px under a finger like the fields beside it (spec § Touch).
   The 32px buttons sit 6px from the outer edge on every side under a finger, and `--coarse-hit-gap` (twice the 6px
   padding plus the 1px border) caps each 44px hit area at that edge, so no hit area reaches a neighbour of the pill. */
const rootClass = computed(() =>
  cn(
    'relative inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-input bg-field px-1.5',
    'pointer-coarse:h-11 [--coarse-hit-gap:14px]',
    attrs.class as ClassValue,
  ),
);

function onClear(event: MouseEvent): void {
  if (event.defaultPrevented || !props.isFiltered) return;
  emit('clear');
}
</script>

<template>
  <div role="group" :aria-label="groupLabel" data-filter-summary="" v-bind="passthroughAttrs" :class="rootClass">
    <Tooltip v-if="props.hasFilters" :content="filtersLabel">
      <slot name="filters-trigger">
        <FilterSummaryFiltersButton @click="emit('open-filters')" />
      </slot>
    </Tooltip>
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      :aria-busy="props.isCounting || undefined"
      data-filter-summary-count=""
      class="relative min-w-20 text-center text-sm whitespace-nowrap tabular-nums text-muted-foreground @max-[300px]:min-w-12"
    >
      <span :class="props.isCounting && 'invisible'">
        <span class="@max-[300px]:hidden">{{ matchText }}</span>
        <span class="hidden @max-[300px]:inline">{{ compactMatchText }}</span>
      </span>
      <span
        v-if="props.isCounting"
        aria-hidden="true"
        data-filter-summary-placeholder=""
        class="absolute inset-x-1 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted motion-safe:animate-pulse"
      />
    </span>
    <Tooltip :content="clearLabel">
      <Button
        :variant="ButtonVariant.Ghost"
        :tone="ColorTone.Neutral"
        :size="SizePreset.Sm"
        :shape="ButtonShape.Circle"
        :aria-label="clearLabel"
        :is-disabled="!props.isFiltered"
        data-filter-summary-clear=""
        @click="onClear"
      >
        <Icon :icon="ClearIcon" :size="16" aria-hidden="true" />
      </Button>
    </Tooltip>
  </div>
</template>
