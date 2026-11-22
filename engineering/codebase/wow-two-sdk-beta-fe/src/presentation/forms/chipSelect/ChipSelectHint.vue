<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { ChipSelectOption } from './ChipSelect.vue';

/** Defines props for the hint tooltip around one option's row. */
export interface ChipSelectHintProps {
  /** The option whose hint the card shows; without a `hint` the slot renders bare. */
  readonly option: ChipSelectOption;

  /** The count line of the card; `{count}` marks the number. */
  readonly hintCountLabel: string;

  /** The wait before the card opens, in ms. Unset, the tooltip's own default applies. */
  readonly hintOpenDelay?: number;

  /** The time the card takes to fade in and out, in ms. Unset, the card appears and vanishes at once. */
  readonly hintFadeDuration?: number;

  /** The Floating UI placement of the card. Unset, the tooltip's own `top`. */
  readonly placement?: Placement;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { interpolate, useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { Tooltip } from '../../overlays';

/**
 * Renders the row of one option inside a `Tooltip` that shows a small card (image or icon, label, description, count)
 * only when the option has a hint, with no wrapper element. An option without a hint renders the bare row, with no
 * tooltip and no extra DOM.
 */
defineOptions({ name: 'ChipSelectHint' });

const props = withDefaults(defineProps<ChipSelectHintProps>(), {
  hintOpenDelay: undefined,
  hintFadeDuration: undefined,
  placement: undefined,
});

/** The row the card belongs to — the tooltip's single trigger child. */
defineSlots<{ default(): unknown }>();

const formatters = useLocaleFormatters();

/** The count line of the hint card — `12 events` — or nothing for an option without a count. */
const countLine = computed(() =>
  props.option.count === undefined
    ? undefined
    : interpolate(props.hintCountLabel, { count: formatters.value.number(props.option.count) }),
);
</script>

<template>
  <Tooltip v-if="option.hint" :placement="placement" :open-delay="hintOpenDelay" :fade-duration="hintFadeDuration">
    <slot />
    <template #content>
      <div class="grid w-64 max-w-[calc(100vw-3rem)] gap-1.5" data-chip-select-hint>
        <img
          v-if="option.hint.imageSrc"
          :src="option.hint.imageSrc"
          :alt="option.hint.imageAlt ?? ''"
          class="h-28 w-full rounded object-cover"
          data-chip-select-hint-image
        />
        <Icon
          v-else-if="option.icon"
          :icon="option.icon"
          :size="28"
          class="text-muted-foreground"
          data-chip-select-hint-icon
        />
        <span class="text-sm font-semibold" data-chip-select-hint-label>{{ option.label }}</span>
        <span class="text-xs leading-snug" data-chip-select-hint-description>{{ option.hint.description }}</span>
        <span v-if="countLine" class="text-xs tabular-nums text-muted-foreground" data-chip-select-hint-count>
          {{ countLine }}
        </span>
      </div>
    </template>
  </Tooltip>
  <slot v-else />
</template>
