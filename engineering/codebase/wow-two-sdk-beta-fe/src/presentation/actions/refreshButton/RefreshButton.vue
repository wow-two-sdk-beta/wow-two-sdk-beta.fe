<script lang="ts">
import type { ButtonProps } from '../button';

/** @internal The `ButtonProps` this preset decides itself. */
type OwnedButtonProp = keyof Pick<ButtonProps, 'isLoading' | 'shape' | 'leadingSlot'>;

/** Defines the forwarded `ButtonProps`, minus the ones the refresh preset sets. */
type RefreshButtonAttributes = Omit<ButtonProps, OwnedButtonProp>;

/** Defines props for the one refresh control a region shows. */
export interface RefreshButtonProps extends /* @vue-ignore */ RefreshButtonAttributes {
  /** True from the click until the refresh settles — `useRefresh`'s `refreshing`; the icon spins and clicks wait. */
  readonly isRefreshing?: boolean;

  /** The visible label, or the accessible name of an icon-only button. Default `"Refresh"`, localized. */
  readonly label?: string;

  /** Renders the icon alone, square at its size, named by `label`. */
  readonly isIconOnly?: boolean;

  /** The visual surface style. Default `outline`; `ghost` inside a panel header. */
  readonly variant?: ButtonProps['variant'];

  /** The size step. Default `sm`; `md` beside page-level controls. */
  readonly size?: ButtonProps['size'];
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import Button from '../button/Button.vue';

/**
 * Renders the refresh control a region reruns its reads with — a `Button` preset that swaps the refresh icon for the
 * spinner while `isRefreshing`, keeps its label and width, and swallows repeat clicks until the refresh settles. Pair
 * it with `useRefresh` from `@wow-two-beta/fe/query`, which also drives the region's placeholders.
 */
defineOptions({ name: 'RefreshButton', inheritAttrs: false });

const componentProps = withDefaults(defineProps<RefreshButtonProps>(), {
  isRefreshing: false,
  label: undefined,
  isIconOnly: false,
  variant: 'outline',
  size: 'sm',
});
const props = useLocaleDefaults(componentProps, 'RefreshButton', { label: 'Refresh' });

const attrs = useAttrs();

/** The icon-only form names itself through `aria-label`, and `title` shows the name on hover. */
const naming = computed(() =>
  props.isIconOnly ? { 'aria-label': props.label, title: props.label } : ({} as Record<string, string>),
);
</script>

<template>
  <Button
    tone="neutral"
    :variant="props.variant"
    :size="props.size"
    :shape="props.isIconOnly ? 'square' : 'default'"
    :is-loading="props.isRefreshing"
    v-bind="{ ...naming, ...attrs }"
  >
    <template #leading><Icon :icon="RefreshCw" :size="14" /></template>
    <template v-if="!props.isIconOnly">{{ props.label }}</template>
  </Button>
</template>
