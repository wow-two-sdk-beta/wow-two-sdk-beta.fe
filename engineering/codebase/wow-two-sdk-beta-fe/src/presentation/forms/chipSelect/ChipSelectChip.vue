<script lang="ts">
import type { ChipSelectOption } from './ChipSelect.vue';

/** Defines props for one chip inside a `ChipSelect` field: a chosen option, or the `+N` of the hidden ones. */
export interface ChipSelectChipProps {
  /** The chosen option the chip shows. Unset, the chip is the `+N` one and reads `moreCount`. */
  readonly option?: ChipSelectOption;

  /** Whether the chosen option holds no rows — its `count` is exactly `0` — so the chip reads muted. */
  readonly isEmpty?: boolean;

  /** The number of chosen options the field has no room for; the `+N` chip shows it. */
  readonly moreCount?: number;

  /** The `+N` chip's accessible name, such as `3 more selected`. */
  readonly moreLabel?: string;
}
</script>

<script setup lang="ts">
import { useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';

/**
 * Renders one chip of a `ChipSelect` field. A chosen option shows its `icon` alone, with its label as the accessible
 * name and `title`, or its label as text when it has no icon; the `+N` chip stands for the chosen options that did not
 * fit and carries `moreLabel` as its accessible name.
 */
defineOptions({ name: 'ChipSelectChip' });

withDefaults(defineProps<ChipSelectChipProps>(), {
  option: undefined,
  isEmpty: false,
  moreCount: undefined,
  moreLabel: undefined,
});

const formatters = useLocaleFormatters();
</script>

<template>
  <span
    v-if="option"
    :role="option.icon ? 'img' : undefined"
    :aria-label="option.icon ? option.label : undefined"
    :title="option.label"
    :data-empty="isEmpty ? '' : undefined"
    data-chip-select-chip
    class="inline-flex h-6 max-w-32 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft px-1.5 text-xs font-medium whitespace-nowrap text-primary-soft-foreground data-[empty]:text-muted-foreground data-[empty]:opacity-60"
  >
    <Icon v-if="option.icon" :icon="option.icon" :size="14" />
    <span v-else class="truncate">{{ option.label }}</span>
  </span>
  <span
    v-else
    role="img"
    :aria-label="moreLabel"
    data-chip-select-more
    class="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground"
  >
    +{{ formatters.number(moreCount ?? 0) }}
  </span>
</template>
