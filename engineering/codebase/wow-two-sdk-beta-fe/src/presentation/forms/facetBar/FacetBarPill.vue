<script lang="ts">
import type { FacetOption } from './FacetBar.vue';

/** Defines props for one inline pill of a choice facet. */
export interface FacetBarPillProps {
  /** The option the pill shows. */
  readonly option: FacetOption;

  /** Whether the option is not chosen and holds no rows — its `count` is exactly `0` — so the pill reads muted. */
  readonly isEmpty: boolean;

  /** The count line of the hint card; `{count}` marks the number. */
  readonly hintCountLabel: string;

  /** The wait before the hint card opens, in ms. Unset, the tooltip's own default applies. */
  readonly hintOpenDelay?: number;

  /** The time the hint card takes to fade in and out, in ms. Unset, the card appears and vanishes at once. */
  readonly hintFadeDuration?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { interpolate, useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { Tooltip } from '../../overlays';
import ToggleGroupItem from '../toggleGroup/ToggleGroupItem.vue';

/**
 * Renders one inline pill of a choice facet — a `ToggleGroupItem`, muted while the option is empty, and wrapped in a
 * `Tooltip` that shows a small card (image or icon, label, description, count) only when the option has a hint. An
 * option without a hint renders the bare pill, with no tooltip and no extra DOM.
 */
defineOptions({ name: 'FacetBarPill' });

const props = withDefaults(defineProps<FacetBarPillProps>(), { hintOpenDelay: undefined, hintFadeDuration: undefined });

const formatters = useLocaleFormatters();

/** The count line of the hint card — `12 events` — or nothing for an option without a count. */
const countLine = computed(() =>
  props.option.count === undefined
    ? undefined
    : interpolate(props.hintCountLabel, { count: formatters.value.number(props.option.count) }),
);

/** The pill's own props. `data-empty` marks an empty, unchosen option; a chosen pill keeps its chosen style. */
const item = computed(() => ({
  value: props.option.value,
  label: props.option.label,
  count: props.option.count,
  icon: props.option.icon,
  variant: 'solid' as const,
  tone: 'neutral' as const,
  'data-empty': props.isEmpty ? '' : undefined,
  class: 'data-[empty]:text-muted-foreground data-[empty]:opacity-60',
}));
</script>

<template>
  <Tooltip v-if="option.hint" :open-delay="hintOpenDelay" :fade-duration="hintFadeDuration">
    <ToggleGroupItem v-bind="item" />
    <template #content>
      <div class="grid w-64 max-w-[calc(100vw-3rem)] gap-1.5" data-facet-hint>
        <img
          v-if="option.hint.imageSrc"
          :src="option.hint.imageSrc"
          :alt="option.hint.imageAlt ?? ''"
          class="h-28 w-full rounded object-cover"
          data-facet-hint-image
        />
        <Icon
          v-else-if="option.icon"
          :icon="option.icon"
          :size="28"
          class="text-muted-foreground"
          data-facet-hint-icon
        />
        <span class="text-sm font-semibold" data-facet-hint-label>{{ option.label }}</span>
        <span class="text-xs leading-snug" data-facet-hint-description>{{ option.hint.description }}</span>
        <span v-if="countLine" class="text-xs tabular-nums text-muted-foreground" data-facet-hint-count>
          {{ countLine }}
        </span>
      </div>
    </template>
  </Tooltip>
  <ToggleGroupItem v-else v-bind="item" />
</template>
