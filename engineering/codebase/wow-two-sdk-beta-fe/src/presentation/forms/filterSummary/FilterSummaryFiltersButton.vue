<script lang="ts">
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FilterSummaryFiltersButtonProps {}
</script>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue';
import { SlidersHorizontal } from 'lucide-vue-next';
import { Icon } from '../../../foundation/icons';
import { useLocale } from '../../../foundation/i18n';
import { ColorTone, SizePreset } from '../../../foundation/styles';
import { Button, ButtonShape, ButtonVariant } from '../../actions';
import { FilterSummaryContextKey } from './FilterSummaryContext';

const FiltersIcon = SlidersHorizontal;

/** The largest count the badge spells out; above it the badge reads `99+`. */
const BadgeCeiling = 99;

/**
 * Renders the filters button of a `FilterSummary`: a ghost circle with a sliders icon and a badge counting the advanced
 * filters in effect. Its root is the button itself, so an app's `ModalTrigger` or `PopoverTrigger` `as-child` lands on
 * it. Fallthrough attrs and listeners go to the button; `class` merges through the button's own `cn`.
 */
defineOptions({ name: 'FilterSummaryFiltersButton', inheritAttrs: false });

defineProps<FilterSummaryFiltersButtonProps>();

const attrs = useAttrs();
const summary = inject(FilterSummaryContextKey, null);
const locale = useLocale();

const count = computed(() => Math.max(0, Math.trunc(summary?.activeFilterCount() ?? 0)));
const label = computed(() => summary?.filtersLabel() ?? locale.t('FilterSummary.filters', undefined, 'Filters'));
const badge = computed(() => (count.value > BadgeCeiling ? `${BadgeCeiling}+` : String(count.value)));
const accessibleName = computed(() => (count.value > 0 ? `${label.value} (${count.value})` : label.value));
</script>

<template>
  <Button
    :variant="ButtonVariant.Ghost"
    :tone="ColorTone.Neutral"
    :size="SizePreset.Sm"
    :shape="ButtonShape.Circle"
    :aria-label="accessibleName"
    data-filter-summary-filters=""
    v-bind="attrs"
  >
    <Icon :icon="FiltersIcon" :size="16" aria-hidden="true" />
    <span
      v-if="count > 0"
      aria-hidden="true"
      data-filter-summary-badge=""
      class="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium tabular-nums text-primary-foreground"
      >{{ badge }}</span
    >
  </Button>
</template>
