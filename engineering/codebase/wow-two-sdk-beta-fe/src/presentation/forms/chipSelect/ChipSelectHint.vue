<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { ChipSelectOption } from './ChipSelect.vue';

/** Defines props for the hint tooltip around one option's chip or row. */
export interface ChipSelectHintProps {
  /** The option whose hint the card shows. Omit it to render the child by itself. */
  readonly option?: ChipSelectOption;

  /** The count line of the card; `{count}` marks the number. */
  readonly hintCountLabel: string;

  /** The wait before the card opens, in ms. Unset, the tooltip's own default applies. */
  readonly hintOpenDelay?: number;

  /** The time the card takes to fade in and out, in ms. Unset, the card appears and vanishes at once. */
  readonly hintFadeDuration?: number;

  /** Whether to dismiss the card and suppress new hover hints. */
  readonly isDisabled?: boolean;

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
 * Wraps an option's chip or row in a `Tooltip` with its image or icon, label, description and count. An option without
 * a hint renders the slot directly.
 */
defineOptions({ name: 'ChipSelectHint' });

const props = withDefaults(defineProps<ChipSelectHintProps>(), {
  hintOpenDelay: undefined,
  hintFadeDuration: undefined,
  placement: undefined,
});

defineSlots<{
  /** The tooltip's single trigger child. */
  default(): unknown;
  /** Replaces the default card content. */
  content?(): unknown;
}>();

const formatters = useLocaleFormatters();

/** The count line of the hint card — `12 events` — or nothing for an option without a count. */
const countLine = computed(() => {
  const count = props.option?.count;
  return count === undefined ? undefined : interpolate(props.hintCountLabel, { count: formatters.value.number(count) });
});
</script>

<template>
  <Tooltip
    v-if="option?.hint"
    :placement="placement"
    :open-delay="hintOpenDelay"
    :fade-duration="hintFadeDuration"
    :is-disabled="isDisabled"
  >
    <slot />
    <template #content>
      <slot name="content">
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
      </slot>
    </template>
  </Tooltip>
  <slot v-else />
</template>
